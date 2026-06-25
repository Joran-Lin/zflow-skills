/**
 * Edge TTS provider (free, no API key).
 * Thin wrapper around the existing WebSocket client in edge-tts.mjs.
 *
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2026 Min Li, Zhuoran Lin <zhuoran.lin@z.ai>
 *
 * NOTE: this wrapper is original code (Apache-2.0) and imports the
 * LGPL-3.0-or-later edge-tts.mjs as a Library — see repository root LICENSE
 * and NOTICE for the Combined Work attribution (LGPL §4).
 */

import { writeFileSync } from "fs";
import { synthesizeWithRetry } from "../edge-tts.mjs";

// brief.json voice short-name -> Edge TTS voice ID
const VOICE_MAP = {
  xiaoxiao: "zh-CN-XiaoxiaoNeural",
  xiaoyi: "zh-CN-XiaoyiNeural",
  yunxi: "zh-CN-YunxiNeural",
  yunxia: "zh-CN-YunxiaNeural",
  yunjian: "zh-CN-YunjianNeural",
  yunyang: "zh-CN-YunyangNeural",
};

function mapVoice(voice) {
  return VOICE_MAP[voice] || "zh-CN-YunxiNeural";
}

function speedToRate(speed) {
  if (speed === 1.0) return "+0%";
  const percent = Math.round((speed - 1.0) * 100);
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

/**
 * Generate one chunk of audio as an mp3 file.
 * @param {string} text
 * @param {object} opts
 * @param {string} opts.voice - brief.json voice short name
 * @param {number} opts.speed - speed multiplier (e.g. 1.0)
 * @param {string} opts.outputPath - absolute path to write the mp3
 */
async function generateChunk(text, { voice, speed, outputPath }) {
  const audio = await synthesizeWithRetry(text, {
    voice: mapVoice(voice),
    rate: speedToRate(speed),
  });
  writeFileSync(outputPath, audio);
}

export const edgeProvider = {
  name: "edge",
  label: "Edge TTS（免费，无需 key）",
  defaultVoice: "yunxi",
  voices: [
    { id: "xiaoxiao", label: "小晓 — 自然亲切（推荐）" },
    { id: "xiaoyi", label: "小伊 — 活泼女声" },
    { id: "yunxi", label: "云希 — 活力男声（科技/商务）" },
    { id: "yunjian", label: "云健 — 激情男声（重大发布）" },
    { id: "yunyang", label: "云扬 — 专业男声（职场/正式）" },
    { id: "yunxia", label: "云夏 — 可爱男声（轻松/童趣）" },
  ],
  // Edge is the free default; bump concurrency a bit.
  concurrency: 6,
  generateChunk,
};
