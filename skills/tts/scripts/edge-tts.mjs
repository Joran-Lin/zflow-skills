/**
 * Minimal Edge TTS client for Node.js.
 * Connects to Microsoft Edge's online TTS service via WebSocket.
 * No Python dependency required.
 *
 * SPDX-License-Identifier: LGPL-3.0-or-later
 *
 * This file is a from-scratch JavaScript reimplementation of the edge-tts
 * Python client. It does NOT embed any source code from the upstream project.
 *
 * Derived from edge-tts: https://github.com/rany2/edge-tts
 *   Upstream license: GNU Lesser General Public License v3.0 (LGPL-3.0-or-later).
 *   Upstream copyright (preserved by attribution convention, as a courtesy /
 *   for transparency, not as a legal obligation — this file is a clean-room
 *   reimplementation that contains no upstream source code):
 *     Copyright (c) 2014-2023 Christopher Down
 *     Copyright (c) 2025- rany <rany@riseup.net>
 *
 * JavaScript port + modifications for zflow-skills:
 *   Copyright (c) 2026 Min Li, Zhuoran Lin <zhuoran.lin@z.ai>
 *
 * Modifications:
 *   - Ported the WebSocket TTS client from Python to Node.js.
 *   - Adapted SSML / rate / voice mapping to this pipeline's API.
 *   - Added retry and chunk-synthesis helper logic.
 *
 * This is an LGPL-3.0-or-later "Library" consumed by the rest of this
 * Apache-2.0 project via ES module import. See the repository root LICENSE
 * and NOTICE files for the Combined Work attribution required by LGPL §4.
 */

import { randomUUID, createHash, randomBytes } from "crypto";
import { writeFileSync } from "fs";
import https from "node:https";
import { URL } from "node:url";
import zlib from "node:zlib";

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WSS_HOST = "speech.platform.bing.com";
const WSS_PATH =
  "/consumer/speech/synthesize/readaloud/edge/v1" +
  `?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;

const CHROMIUM_MAJOR = "143";
const CHROMIUM_FULL = "143.0.3650.75";
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL}`;

const USER_AGENT =
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ` +
  `(KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR}.0.0.0 Safari/537.36 ` +
  `Edg/${CHROMIUM_MAJOR}.0.0.0`;

const WIN_EPOCH = 11644473600;
const S_TO_NS = 1e9;

// --- WebSocket frame helpers (RFC 6455) ---

const OPCODE_TEXT = 0x01;
const OPCODE_BINARY = 0x02;
const OPCODE_CLOSE = 0x08;

function encodeTextFrame(payload) {
  const data = Buffer.from(payload, "utf-8");
  return encodeFrame(OPCODE_TEXT, data);
}

function encodeFrame(opcode, data) {
  const mask = randomBytes(4);
  const masked = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    masked[i] = data[i] ^ mask[i & 3];
  }

  let header;
  if (data.length < 126) {
    header = Buffer.alloc(6);
    header[0] = 0x80 | opcode; // FIN + opcode
    header[1] = 0x80 | data.length; // MASK + length
    mask.copy(header, 2);
  } else if (data.length < 65536) {
    header = Buffer.alloc(8);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(data.length, 2);
    mask.copy(header, 4);
  } else {
    header = Buffer.alloc(14);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
    mask.copy(header, 10);
  }

  return Buffer.concat([header, masked]);
}

function* decodeFrames(buf) {
  let offset = 0;
  while (offset < buf.length) {
    if (offset + 2 > buf.length) return buf.length > 0 ? offset : -1;

    const opcode = buf[offset] & 0x0f;
    const masked = !!(buf[offset + 1] & 0x80);
    let payloadLen = buf[offset + 1] & 0x7f;
    let headerSize = 2;

    if (payloadLen === 126) {
      if (offset + 4 > buf.length) return offset;
      payloadLen = buf.readUInt16BE(offset + 2);
      headerSize = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buf.length) return offset;
      payloadLen = Number(buf.readBigUInt64BE(offset + 2));
      headerSize = 10;
    }

    if (masked) headerSize += 4;

    if (offset + headerSize + payloadLen > buf.length) return offset;

    let payload = buf.subarray(offset + headerSize, offset + headerSize + payloadLen);
    if (masked) {
      const maskKey = buf.subarray(offset + headerSize - 4, offset + headerSize);
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskKey[i & 3];
      }
    }

    yield { opcode, payload: Buffer.from(payload) };
    offset += headerSize + payloadLen;
  }
  return -1;
}

// --- Edge TTS helpers ---

function generateSecMsGec() {
  let ticks = Date.now() / 1000;
  ticks += WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= S_TO_NS / 100;
  const strToHash = `${Math.floor(ticks)}${TRUSTED_CLIENT_TOKEN}`;
  return createHash("sha256").update(strToHash, "ascii").digest("hex").toUpperCase();
}

function connectId() {
  return randomUUID().replace(/-/g, "");
}

function dateToString() {
  const d = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return (
    `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ` +
    `${String(d.getUTCDate()).padStart(2, "0")} ${d.getUTCFullYear()} ` +
    `${String(d.getUTCHours()).padStart(2, "0")}:` +
    `${String(d.getUTCMinutes()).padStart(2, "0")}:` +
    `${String(d.getUTCSeconds()).padStart(2, "0")} GMT+0000 (Coordinated Universal Time)`
  );
}

function mkssml(voice, rate, volume, pitch, escapedText) {
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
    `<voice name='${voice}'>` +
    `<prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>` +
    `${escapedText}` +
    `</prosody></voice></speak>`
  );
}

function ssmlHeadersPlusData(requestId, timestamp, ssml) {
  return (
    `X-RequestId:${requestId}\r\n` +
    `Content-Type:application/ssml+xml\r\n` +
    `X-Timestamp:${timestamp}Z\r\n` +
    `Path:ssml\r\n\r\n${ssml}`
  );
}

function parseHeaders(data, headerLength) {
  const headers = {};
  for (const line of data.subarray(0, headerLength).toString().split("\r\n")) {
    const idx = line.indexOf(":");
    if (idx !== -1) {
      headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return headers;
}

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Synthesize text to speech using Edge TTS.
 *
 * @param {string} text - Text to synthesize
 * @param {object} [options]
 * @param {string} [options.voice="zh-CN-XiaoxiaoNeural"] - Voice name
 * @param {string} [options.rate="+0%"] - Speech rate (e.g. "+25%", "-10%")
 * @param {string} [options.volume="+0%"] - Volume
 * @param {string} [options.pitch="+0Hz"] - Pitch
 * @returns {Promise<Buffer>} MP3 audio buffer
 */
export async function synthesize(text, options = {}) {
  const {
    voice = "zh-CN-XiaoxiaoNeural",
    rate = "+0%",
    volume = "+0%",
    pitch = "+0Hz",
  } = options;

  const escapedText = escapeXml(text);
  const requestId = connectId();
  const muid = randomBytes(16).toString("hex").toUpperCase();
  const secMsGec = generateSecMsGec();

  const query =
    `&ConnectionId=${requestId}` +
    `&Sec-MS-GEC=${secMsGec}` +
    `&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;

  const wsKey = randomBytes(16).toString("base64");

  const headers = {
    Upgrade: "websocket",
    Connection: "Upgrade",
    "Sec-WebSocket-Key": wsKey,
    "Sec-WebSocket-Version": "13",
    "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits",
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
    Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
    "User-Agent": USER_AGENT,
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-CH-UA": `" Not;A Brand";v="99", "Microsoft Edge";v="${CHROMIUM_MAJOR}", "Chromium";v="${CHROMIUM_MAJOR}"`,
    "Sec-CH-UA-Mobile": "?0",
    Cookie: `muid=${muid};`,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: WSS_HOST,
        port: 443,
        path: WSS_PATH + query,
        method: "GET",
        headers,
      },
      (res) => {
        reject(new Error(`Edge TTS: server returned ${res.statusCode}`));
      }
    );

    req.on("upgrade", (res, socket) => {
      const audioChunks = [];
      let recvBuf = Buffer.alloc(0);
      let useDeflate = false;
      let resolved = false;

      // Check if server agreed to permessage-deflate
      const extHeader = res.headers["sec-websocket-extensions"] || "";
      useDeflate = extHeader.includes("permessage-deflate");

      function finish(audio) {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          if (audio) {
            resolve(audio);
          } else {
            reject(new Error("Edge TTS: no audio received"));
          }
        }
      }

      socket.on("data", (chunk) => {
        recvBuf = Buffer.concat([recvBuf, chunk]);

        let remaining;
        for (const frame of decodeFrames(recvBuf)) {
          remaining = undefined;
          let payload = frame.payload;

          if (frame.opcode === OPCODE_BINARY) {
            // First 2 bytes = header length
            if (payload.length < 2) continue;
            const headerLen = payload.readUInt16BE(0);
            if (headerLen > payload.length) continue;

            const hdrs = parseHeaders(payload, headerLen);
            if (hdrs.Path !== "audio") continue;

            const ct = hdrs["Content-Type"];
            if (!ct || ct !== "audio/mpeg") continue;

            const audioData = payload.subarray(headerLen + 2);
            if (audioData.length > 0) {
              audioChunks.push(audioData);
            }
          } else if (frame.opcode === OPCODE_TEXT) {
            const str = payload.toString("utf-8");
            if (str.includes("Path:turn.end")) {
              socket.write(encodeFrame(OPCODE_CLOSE, Buffer.alloc(0)));
              finish(Buffer.concat(audioChunks));
              return;
            }
          } else if (frame.opcode === OPCODE_CLOSE) {
            finish(audioChunks.length > 0 ? Buffer.concat(audioChunks) : null);
            return;
          }
        }

        if (typeof remaining === "number" && remaining > 0) {
          recvBuf = recvBuf.subarray(remaining);
        } else {
          recvBuf = Buffer.alloc(0);
        }
      });

      socket.on("error", (err) => {
        finish(audioChunks.length > 0 ? Buffer.concat(audioChunks) : null);
      });

      socket.on("close", () => {
        finish(audioChunks.length > 0 ? Buffer.concat(audioChunks) : null);
      });

      // Send config message
      const configMsg =
        `X-Timestamp:${dateToString()}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        `{"context":{"synthesis":{"audio":{"metadataoptions":{` +
        `"sentenceBoundaryEnabled":"true","wordBoundaryEnabled":"false"` +
        `},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`;

      socket.write(encodeTextFrame(configMsg));

      // Send SSML request
      const ssml = mkssml(voice, rate, volume, pitch, escapedText);
      const ssmlMsg = ssmlHeadersPlusData(connectId(), dateToString(), ssml);
      socket.write(encodeTextFrame(ssmlMsg));
    });

    req.on("error", (err) => {
      reject(new Error(`Edge TTS connection error: ${err.message}`));
    });

    req.setTimeout(30000, () => {
      req.destroy(new Error("Edge TTS: connection timeout"));
    });

    req.end();
  });
}

/**
 * Synthesize text and save to file.
 *
 * @param {string} text - Text to synthesize
 * @param {string} outputPath - Output file path
 * @param {object} [options] - Same as synthesize()
 * @returns {Promise<string>} Absolute path to the saved file
 */
export async function synthesizeToFile(text, outputPath, options = {}) {
  const { resolve: resolvePath } = await import("path");
  const absPath = resolvePath(outputPath);
  const audio = await synthesize(text, options);
  writeFileSync(absPath, audio);
  return absPath;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Synthesize with automatic retry on transient failures.
 */
export async function synthesizeWithRetry(text, options = {}) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await synthesize(text, options);
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      if (e.message.includes("ECONNRESET") || e.message.includes("timeout")) {
        console.warn(`Edge TTS retry ${attempt}/${MAX_RETRIES}: ${e.message}`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
        continue;
      }
      throw e;
    }
  }
}

/**
 * Run an async task pool with limited concurrency.
 *
 * @param {Array} items - Items to process
 * @param {Function} fn - Async function (item, index) => result
 * @param {number} concurrency - Max parallel tasks
 * @returns {Promise<Array>} Results in original order
 */
export async function concurrentMap(items, fn, concurrency = 6) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

// --- CLI entry point (drop-in replacement for Python edge-tts CLI) ---

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("edge-tts.mjs")) {
  const args = process.argv.slice(2);
  let text = "";
  let voice = "zh-CN-XiaoxiaoNeural";
  let rate = "+0%";
  let writeMedia = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--text" && i + 1 < args.length) {
      text = args[++i];
    } else if (args[i] === "--voice" && i + 1 < args.length) {
      voice = args[++i];
    } else if (args[i] === "--rate" && i + 1 < args.length) {
      rate = args[++i];
    } else if (args[i] === "--write-media" && i + 1 < args.length) {
      writeMedia = args[++i];
    }
  }

  if (!text || !writeMedia) {
    console.error("Usage: edge-tts.mjs --text <text> --voice <voice> [--rate <rate>] --write-media <path>");
    process.exit(1);
  }

  synthesizeWithRetry(text, { voice, rate })
    .then((audio) => {
      writeFileSync(writeMedia, audio);
    })
    .catch((err) => {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    });
}
