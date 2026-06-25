/**
 * MiniMax TTS provider (sync HTTP v2, needs MINIMAX_API_KEY).
 * Docs: POST https://api.minimaxi.com/v1/t2a_v2
 *
 * Response data.audio is a hex-encoded mp3. With sample_rate=24000,
 * channel=1, format=mp3 it already matches the pipeline's normalized
 * format, so we just decode hex and write directly — no transcoding.
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { loadEnvVar } from "../utils.mjs";

const ENDPOINT = "https://api.minimaxi.com/v1/t2a_v2";
const MODEL = "speech-02-turbo"; // low-latency; change here for hd/other

const MAX_RETRIES = 4;
const RETRY_BASE_MS = 1500;

// Rate-limit / TPM / timeout → retry. Auth / param errors → fail fast.
const RETRY_STATUS_CODES = new Set([1002, 1039]);
const RETRY_HTTP = new Set([408, 409, 429, 500, 502, 503, 504]);

async function callOnce({ text, voice, speed }) {
  const apiKey = loadEnvVar("MINIMAX_API_KEY", { desc: "MiniMax TTS（可选）" });

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      text,
      stream: false,
      voice_setting: {
        voice_id: voice,
        speed,
        vol: 1,
        pitch: 0,
      },
      audio_setting: {
        sample_rate: 24000,
        bitrate: 128000,
        format: "mp3",
        channel: 1,
      },
      language_boost: "auto",
    }),
  });

  const body = await res.json().catch(() => ({}));

  // HTTP-level error
  if (!res.ok) {
    const status = body?.base_resp?.status_code ?? res.status;
    const msg = body?.base_resp?.status_msg || `HTTP ${res.status}`;
    const err = new Error(`MiniMax TTS: ${msg}`);
    err.code = status;
    err.transient = RETRY_HTTP.has(res.status) || RETRY_STATUS_CODES.has(status);
    throw err;
  }

  // Business-level error (status_code != 0)
  const biz = body?.base_resp;
  if (biz && biz.status_code !== 0) {
    const err = new Error(`MiniMax TTS ${biz.status_code}: ${biz.status_msg}`);
    err.code = biz.status_code;
    err.transient = RETRY_STATUS_CODES.has(biz.status_code);
    throw err;
  }

  const hex = body?.data?.audio;
  if (!hex || typeof hex !== "string" || hex.length === 0) {
    const err = new Error("MiniMax TTS: empty audio in response");
    err.transient = true;
    throw err;
  }

  const buf = Buffer.from(hex, "hex");
  if (!buf || buf.length === 0) {
    const err = new Error("MiniMax TTS: failed to decode hex audio");
    err.transient = true;
    throw err;
  }

  const ms = body?.extra_info?.audio_length;
  return { buf, durationMs: typeof ms === "number" ? ms : null };
}

/**
 * Generate one chunk of audio as a normalized mp3 file.
 */
async function generateChunk(text, { voice, speed, outputPath }) {
  let result;
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      result = await callOnce({ text, voice, speed });
      break;
    } catch (e) {
      lastErr = e;
      if (attempt === MAX_RETRIES || !e.transient) throw e;
      const wait = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      console.warn(
        `MiniMax TTS retry ${attempt}/${MAX_RETRIES} (code ${e.code ?? "?"}): ${e.message}`
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  if (!result) throw lastErr || new Error("MiniMax TTS: no audio");

  const absOut = resolve(outputPath);
  const outDir = dirname(absOut);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(absOut, result.buf);

  if (result.durationMs != null) {
    console.log(`    (MiniMax 报告时长 ${(result.durationMs / 1000).toFixed(2)}s)`);
  }
}

export const minimaxProvider = {
  name: "minimax",
  label: "MiniMax（音色丰富、情绪/语调可控，需 MINIMAX_API_KEY）",
  defaultVoice: "male-qn-qingse",
  voices: [
    { id: "male-qn-qingse", label: "青涩青年 — 默认（推荐）" },
    { id: "female-shaonv", label: "少女女声" },
    { id: "audiobook_male_1", label: "有声书男声" },
    { id: "audiobook_female_1", label: "有声书女声" },
    { id: "female-chengshu", label: "成熟女声" },
    { id: "presenter_female", label: "主持女声" },
    { id: "presenter_male", label: "主持男声" },
    { id: "boyan_front", label: "少年音" },
  ],
  note:
    "也可填写任意 MiniMax 系统音色 id（完整列表见 https://platform.minimaxi.com/faq/system-voice-id）或已创建的复刻音色 id。",
  concurrency: 5,
  generateChunk,
};
