#!/usr/bin/env node
/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2026 Min Li, Zhuoran Lin <zhuoran.lin@z.ai>
 *
 * Pipeline TTS — the single TTS entry point (per skills/tts/SKILL.md).
 *
 * Splits content-plan.json narration into 15-30 char blocks (blank line = hard
 * block boundary), synthesizes each block via the chosen provider, inserts
 * content-aware pauses, concatenates into audio.mp3, and writes block-timing.json.
 *
 * Reads ttsProvider / voice / speed from brief.json; override with CLI flags.
 * Reuses the tt engine layer (providers/*). Run --help to list engines & voices.
 */
import { resolve, dirname } from "path";
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { getProvider, describeProviders, DEFAULT_PROVIDER } from "./providers/index.mjs";
import { concurrentMap } from "./edge-tts.mjs";
import { runFfmpeg, ffmpegBin, readJson, writeJson, parseArgs } from "./utils.mjs";
import { execFileSync } from "child_process";

// ---------- config ----------
const MIN_CHARS = 15;
const MAX_CHARS = 30;
// pause lengths (seconds), per SKILL Phase 3
const PAUSE = { info: 1.0, enum: 0.3, general: 0.6, boundary: 1.5 };

const SENT_END = /[。！？!?]/;
const CLAUSE = /[,，;；、:：]/;

// ---------- splitting ----------
function isDataHeavy(s) {
  // numbers, %, currency markers, years → give the audience time to digest
  return /[0-9%％]|\b(亿|美元|千亿|百万|万亿)\b|20\d\d/.test(s);
}

/**
 * Split text between two blank-line boundaries into blocks (~MIN..MAX chars),
 * preferring clause then sentence boundaries. Never crosses a blank line.
 */
function splitArgument(text) {
  const blocks = [];
  let cur = "";
  const flush = () => {
    const t = cur.trim();
    if (t) blocks.push(t);
    cur = "";
  };

  // Tokenize into minimal semantic units at punctuation, keep delimiter.
  const tokens = [];
  let buf = "";
  for (const ch of text) {
    buf += ch;
    if (SENT_END.test(ch) || CLAUSE.test(ch)) {
      tokens.push(buf);
      buf = "";
    }
  }
  if (buf.trim()) tokens.push(buf);

  for (const tok of tokens) {
    const piece = tok.trim();
    if (!piece) continue;
    // If adding this token keeps us under MAX, accumulate.
    if ((cur + piece).length <= MAX_CHARS) {
      cur += piece;
      continue;
    }
    // Current buffer is already substantial → flush before starting new.
    if (cur.trim().length >= MIN_CHARS) {
      flush();
      cur = piece;
    } else if (cur.trim().length === 0) {
      // piece alone exceeds MAX (rare) → hard split by char.
      if (piece.length > MAX_CHARS) {
        for (let i = 0; i < piece.length; i += MAX_CHARS) {
          blocks.push(piece.slice(i, i + MAX_CHARS).trim());
        }
        cur = "";
      } else {
        cur = piece;
      }
    } else {
      // Merge current with this token even if slightly over MAX is undesirable;
      // try splitting the token at its own clause if too long, else flush+start.
      cur += piece;
      if (cur.length > MAX_CHARS && SENT_END.test(cur)) {
        flush();
      }
    }
  }
  flush();

  // Post-merge: any block under MIN that can be safely stitched to a neighbor
  // without crossing a sentence? Within an argument merging is fine, but we
  // avoid creating blocks > MAX.
  return blocks;
}

function splitNarration(narration) {
  // Hard boundaries = blank lines.
  const segments = narration
    .split(/\n\s*\n/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const blocks = [];
  for (const seg of segments) {
    const segBlocks = splitArgument(seg);
    for (const b of segBlocks) {
      blocks.push({
        text: b,
        // boundary flag means "a paragraph boundary comes AFTER this block"
        segmentEnd: false,
      });
    }
    if (blocks.length) blocks[blocks.length - 1].segmentEnd = true;
  }
  return blocks;
}

function pauseAfter(block, isLast) {
  if (isLast) return 0;
  if (block.segmentEnd) return PAUSE.boundary;
  if (isDataHeavy(block.text)) return PAUSE.info;
  return PAUSE.general;
}

// ---------- ffprobe ----------
function probeDuration(path) {
  const bin = ffmpegBin().replace(/^"|"$/g, "").replace(/ffmpeg(\.exe)?$/, (m) =>
    m.replace(/ffmpeg/i, "ffprobe")
  );
  // Fallback: derive ffprobe path from ffmpeg bin.
  const probe = bin.includes("ffprobe")
    ? bin
    : ffmpegBin().replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
  try {
    const out = execFileSync(probe, ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", path], {
      encoding: "utf-8",
    });
    return parseFloat(out.trim());
  } catch {
    // Last resort: call via ffmpegBin-style resolver
    const out = execFileSync("ffprobe", ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", path], {
      encoding: "utf-8",
      shell: true,
    });
    return parseFloat(out.trim());
  }
}

// ---------- main ----------
async function main() {
  const { opts } = parseArgs(process.argv);

  // --help: list usage + all engines & voices, then exit
  if (opts.help) {
    console.log(
      [
        "Pipeline TTS — full voice-generation pipeline (split → synthesize → concat → block-timing).",
        "",
        "Usage:",
        "  node skills/tts/scripts/build-pipeline-tts.mjs --project <output-dir>",
        "    Reads narration from content-plan.json; ttsProvider/voice/speed default to brief.json.",
        "",
        "Options:",
        "  --project <dir>    Project output dir containing content-plan.json (and optionally brief.json). Default: output",
        "  --provider <id>    TTS engine; overrides brief.json ttsProvider. Default: " + DEFAULT_PROVIDER,
        "  --voice <id>       Voice id (engine-specific); overrides brief.json voice.",
        "  --speed <n>        Speech speed multiplier; overrides brief.json speed. Default: 1.0",
        "",
        "Engines & voices:",
        describeProviders(),
      ].join("\n")
    );
    process.exit(0);
  }

  const projectDir = resolve(opts.project || "output");
  const contentPlanPath = resolve(projectDir, "content-plan.json");
  const briefPath = resolve(projectDir, "brief.json");

  const { narration } = readJson(contentPlanPath);
  let brief = {};
  if (existsSync(briefPath)) brief = readJson(briefPath);

  const providerId = opts.provider || brief.ttsProvider || "edge";
  const engine = getProvider(providerId);
  const voice = opts.voice || brief.voice || engine.defaultVoice;
  const speed = opts.speed ? parseFloat(opts.speed) : brief.speed || 1.0;

  console.log(`[pipeline-tts] provider=${providerId} voice=${voice} speed=${speed}`);

  // 1. split
  const blocks = splitNarration(narration);
  blocks.forEach((b, i) => (b.blockId = `blk-${String(i + 1).padStart(3, "0")}`));
  console.log(`[pipeline-tts] split into ${blocks.length} blocks`);
  blocks.forEach((b) => console.log(`  ${b.blockId} (${b.text.length}ch${b.segmentEnd ? " •SEG" : ""}): ${b.text.slice(0, 24)}${b.text.length > 24 ? "…" : ""}`));

  // 2. synthesize per block (concurrent, but rate-limit-friendly)
  // Skip blocks that already have audio (resumable). Low concurrency + a wide
  // outer retry loop keeps MiniMax's RPM limit (1002) from killing the run.
  const blocksDir = resolve(projectDir, "blocks");
  if (!existsSync(blocksDir)) mkdirSync(blocksDir, { recursive: true });

  const BLOCK_RETRIES = 6;
  const concurrentForce = opts.concurrency ? parseInt(opts.concurrency, 10) : 2;

  async function synthOne(b) {
    const out = resolve(blocksDir, `${b.blockId}.mp3`);
    if (existsSync(out) && probeDuration(out) > 0.1) {
      b.audioFile = `blocks/${b.blockId}.mp3`;
      b.audioDuration = probeDuration(out);
      console.log(`  ${b.blockId} cached`);
      return;
    }
    for (let attempt = 1; attempt <= BLOCK_RETRIES; attempt++) {
      try {
        await engine.generateChunk(b.text, { voice, speed, outputPath: out });
        b.audioFile = `blocks/${b.blockId}.mp3`;
        b.audioDuration = probeDuration(out);
        return;
      } catch (e) {
        if (attempt === BLOCK_RETRIES) throw e;
        const wait = 3000 * attempt;
        console.warn(`  ${b.blockId} attempt ${attempt} failed (${e.message}); wait ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }

  // Process in small waves to respect RPM.
  const WAVE = concurrentForce;
  for (let i = 0; i < blocks.length; i += WAVE) {
    const wave = blocks.slice(i, i + WAVE);
    await concurrentMap(wave, synthOne, WAVE);
    if (i + WAVE < blocks.length) {
      await new Promise((r) => setTimeout(r, 1500)); // breathe between waves
    }
  }
  console.log(`[pipeline-tts] all blocks synthesized`);

  // 3. pauses
  blocks.forEach((b, i) => (b.silenceBefore = i === 0 ? 0 : pauseAfter(blocks[i - 1], false)));

  // 4. concat with silence via filter_complex
  const silenceDir = resolve(projectDir, ".silence");
  if (!existsSync(silenceDir)) mkdirSync(silenceDir, { recursive: true });

  // Build concat list: silence? then block, in order. First block has no leading silence.
  const listPath = resolve(silenceDir, "concat-list.txt");
  const lines = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (i > 0 && b.silenceBefore > 0) {
      const sil = resolve(silenceDir, `sil-${b.silenceBefore}s.mp3`);
      if (!existsSync(sil)) {
        runFfmpeg(
          `-y -f lavfi -i anullsrc=r=24000:cl=mono -t ${b.silenceBefore} -c:a libmp3lame -b:a 128k "${sil.replace(/\\/g, "/")}"`
        );
      }
      lines.push(`file '${sil.replace(/\\/g, "/")}'`);
    }
    lines.push(`file '${resolve(blocksDir, `${b.blockId}.mp3`).replace(/\\/g, "/")}'`);
  }
  writeFileSync(listPath, lines.join("\n"));

  const audioOut = resolve(projectDir, "audio.mp3");
  runFfmpeg(
    `-y -f concat -safe 0 -i "${listPath.replace(/\\/g, "/")}" -c copy "${audioOut.replace(/\\/g, "/")}"`
  );
  console.log(`[pipeline-tts] audio.mp3 written (${audioOut})`);

  // 5. timing
  let cursor = 0;
  const timingBlocks = blocks.map((b) => {
    const start = +(cursor + b.silenceBefore).toFixed(3);
    const end = +(start + b.audioDuration).toFixed(3);
    cursor = end;
    return {
      blockId: b.blockId,
      text: b.text,
      startTime: start,
      endTime: end,
      audioFile: b.audioFile,
      audioDuration: +b.audioDuration.toFixed(3),
      ...(b.silenceBefore ? { silenceBefore: b.silenceBefore } : {}),
    };
  });

  const timing = { mode: "tts", blocks: timingBlocks, totalDuration: +cursor.toFixed(3) };
  writeJson(resolve(projectDir, "block-timing.json"), timing);

  // cleanup silence dir
  try {
    rmSync(silenceDir, { recursive: true, force: true });
  } catch {}

  console.log(`[pipeline-tts] done. total=${timing.totalDuration}s, ${timingBlocks.length} blocks`);
}

main().catch((e) => {
  console.error(`Error: ${e.stack || e.message}`);
  process.exit(1);
});
