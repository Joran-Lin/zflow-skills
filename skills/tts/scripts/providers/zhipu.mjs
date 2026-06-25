/**
 * 智谱 GLM-TTS provider (sync HTTP, reuses ZHIPU_API_KEY).
 * Docs: POST https://open.bigmodel.cn/api/paas/v4/audio/speech
 *
 * API returns raw wav/pcm binary. We request wav, write a temp .wav,
 * then transcode to a normalized 24kHz mono 48kbps mp3 so it matches the
 * rest of the pipeline (ffmpeg concat + silence splices).
 */

import { writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { dirname, resolve, join } from "path";
import { randomBytes } from "crypto";
import { loadApiKey, runFfmpeg } from "../utils.mjs";

const ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/audio/speech";
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

function isTransient(status) {
  // 408/409/429/5xx → retry
  return status === 408 || status === 409 || status === 429 || (status >= 500 && status <= 599);
}

async function callOnce({ text, voice, speed, volume }) {
  const apiKey = loadApiKey();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "glm-tts",
      input: text,
      voice,
      response_format: "wav",
      speed,
      volume,
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    const err = new Error(`智谱 GLM-TTS HTTP ${res.status}: ${detail.slice(0, 300)}`);
    err.status = res.status;
    err.transient = isTransient(res.status);
    throw err;
  }

  // On success the body is audio/wav binary.
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf || buf.length === 0) {
    const err = new Error("智谱 GLM-TTS: empty audio response");
    err.transient = true;
    throw err;
  }
  return buf;
}

function transcodeWavToMp3(wavPath, mp3Path) {
  const args =
    `-y -i "${wavPath.replace(/\\/g, "/")}" ` +
    `-ar 24000 -ac 1 -b:a 48k "${mp3Path.replace(/\\/g, "/")}"`;
  runFfmpeg(args);
}

/**
 * Generate one chunk of audio as a normalized mp3 file.
 */
async function generateChunk(text, { voice, speed, outputPath }) {
  const volume = 1.0;
  let buf;
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      buf = await callOnce({ text, voice, speed, volume });
      break;
    } catch (e) {
      lastErr = e;
      if (attempt === MAX_RETRIES || !e.transient) throw e;
      const wait = RETRY_BASE_MS * attempt;
      console.warn(`智谱 GLM-TTS retry ${attempt}/${MAX_RETRIES} (HTTP ${e.status}): ${e.message}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  if (!buf) throw lastErr || new Error("智谱 GLM-TTS: no audio");

  // Ensure output dir exists.
  const absOut = resolve(outputPath);
  const outDir = dirname(absOut);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  // Write temp wav next to the target, transcode, then clean up.
  const tmpWav = join(outDir, `.zhipu-${randomBytes(6).toString("hex")}.wav`);
  writeFileSync(tmpWav, buf);
  try {
    transcodeWavToMp3(tmpWav, absOut);
  } finally {
    try {
      if (existsSync(tmpWav)) rmSync(tmpWav, { force: true });
    } catch {
      /* ignore cleanup errors */
    }
  }
}

export const zhipuProvider = {
  name: "zhipu",
  label: "智谱 GLM-TTS（复用 ZHIPU_API_KEY，中文音色细腻）",
  defaultVoice: "tongtong",
  voices: [
    { id: "tongtong", label: "彤彤 — 默认音色（推荐）" },
    { id: "chuichui", label: "锤锤" },
    { id: "xiaochen", label: "小陈" },
    { id: "jam", label: "Jam（动动动物圈）" },
    { id: "kazi", label: "Kazi（动动动物圈）" },
    { id: "douji", label: "豆吉（动动动物圈）" },
    { id: "luodo", label: "罗多（动动动物圈）" },
  ],
  concurrency: 5,
  generateChunk,
};
