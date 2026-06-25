#!/usr/bin/env node

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadDotEnv } from "../../../scripts/utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
const SUBMIT_URL = `${BASE_URL}/async/images/generations`;
const RESULT_URL = `${BASE_URL}/async-result/`;
const DEFAULT_MODEL = "glm-image";
const DEFAULT_SIZE = "1280x1280";
const DEFAULT_QUALITY = "hd";
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    prompt: "",
    output: "",
    outputDir: "",
    size: DEFAULT_SIZE,
    batch: "",
    model: DEFAULT_MODEL,
    quality: DEFAULT_QUALITY,
    noWatermark: false,
    env: "",
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--prompt":     opts.prompt = args[++i]; break;
      case "--output":     opts.output = args[++i]; break;
      case "--output-dir": opts.outputDir = args[++i]; break;
      case "--size":       opts.size = args[++i]; break;
      case "--batch":      opts.batch = args[++i]; break;
      case "--model":      opts.model = args[++i]; break;
      case "--quality":      opts.quality = args[++i]; break;
      case "--no-watermark": opts.noWatermark = true; break;
      case "--env":          opts.env = args[++i]; break;
      case "--help":
        console.log(`Usage:
  generate-image.mjs --prompt "提示词" --output path/to/image.png [--size 1280x1280]
  generate-image.mjs --batch prompts.json --output-dir path/to/assets/ [--size 1280x1280]

Options:
  --prompt     Image generation prompt (Chinese recommended for GLM-Image)
  --output     Output file path (single image mode)
  --output-dir Output directory (batch mode)
  --size       Image size (default: ${DEFAULT_SIZE})
  --batch      Path to JSON file with prompts array
  --model      Model name (default: ${DEFAULT_MODEL})
  --quality       Image quality: "hd" (~20s, default) or "standard" (~5s)
  --no-watermark  Disable the API watermark on generated images
  --env           Path to .env file (default: searches up from cwd)

Available sizes:
  ${DEFAULT_SIZE} (default), 1568x1056, 1056x1568, 1472x1088, 1088x1472, 1728x960, 960x1728
  Custom: 1024-2048px per side, max 4194304 total pixels, multiples of 32.

Environment (.env file):
  ZHIPU_API_KEY   Required. Your Zhipu API key.

Batch JSON format:
  [
    { "prompt": "提示词1", "filename": "image1.png", "size": "1728x960" },
    { "prompt": "提示词2", "filename": "image2.png" }
  ]

  "size" is optional per item — falls back to --size default.`);
        process.exit(0);
    }
  }
  return opts;
}


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function submitTask(prompt, apiKey, model, size, quality, noWatermark) {
  const body = { model, prompt, size };
  if (quality) body.quality = quality;
  if (noWatermark) body.watermark_enabled = false;

  const res = await fetch(SUBMIT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Submit failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (!data.id) {
    throw new Error("No task ID returned from API");
  }
  return data.id;
}

async function pollResult(taskId, apiKey) {
  const startTime = Date.now();

  while (Date.now() - startTime < POLL_TIMEOUT_MS) {
    const res = await fetch(`${RESULT_URL}${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Poll failed (${res.status}): ${text}`);
    }

    const data = await res.json();

    if (data.task_status === "SUCCESS") {
      if (!data.image_result || data.image_result.length === 0) {
        throw new Error("Task succeeded but no image in response");
      }
      return data.image_result[0].url;
    }

    if (data.task_status === "FAIL") {
      throw new Error(`Image generation task failed: ${JSON.stringify(data)}`);
    }

    // PROCESSING — wait and retry
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error("Polling timed out — image generation took too long");
}

async function generateImage(prompt, apiKey, model, size, quality, noWatermark) {
  const taskId = await submitTask(prompt, apiKey, model, size, quality, noWatermark);
  console.log(`  Task submitted: ${taskId}`);
  const url = await pollResult(taskId, apiKey);
  return url;
}

async function downloadImage(url, filePath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(filePath, buffer);
  console.log(`  Saved: ${filePath} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  const opts = parseArgs();
  loadDotEnv({ searchUp: true, envPath: opts.env });

  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) {
    console.error("Error: ZHIPU_API_KEY not found.");
    console.error("Add it to a .env file in your project root:");
    console.error('  ZHIPU_API_KEY=your_key_here');
    process.exit(1);
  }

  if (opts.batch) {
    const batchPath = resolve(opts.batch);
    const raw = readFileSync(batchPath, "utf-8");
    const items = JSON.parse(raw);

    if (!Array.isArray(items) || items.length === 0) {
      console.error("Batch file must be a non-empty JSON array.");
      process.exit(1);
    }

    const outDir = resolve(opts.outputDir);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    console.log(`Generating ${items.length} image(s) in parallel...`);

    const results = await Promise.allSettled(
      items.map(async (item) => {
        const { prompt, filename, size } = item;
        if (!prompt || !filename) throw new Error("Each item needs 'prompt' and 'filename'");
        const imgSize = size || opts.size;
        console.log(`  [${filename}] "${prompt.slice(0, 40)}..." (${imgSize})`);
        const url = await generateImage(prompt, apiKey, opts.model, imgSize, opts.quality, opts.noWatermark);
        const filePath = resolve(outDir, filename);
        await downloadImage(url, filePath);
      })
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error(`\n${failed.length} image(s) failed:`);
      failed.forEach((r) => console.error(`  - ${r.reason.message || r.reason}`));
      process.exit(1);
    }
    console.log(`\nDone. ${items.length - failed.length}/${items.length} images generated.`);
  } else if (opts.prompt && opts.output) {
    console.log("Generating image...");
    console.log(`  Prompt: "${opts.prompt}"`);
    console.log(`  Size: ${opts.size}, Quality: ${opts.quality}`);

    const url = await generateImage(opts.prompt, apiKey, opts.model, opts.size, opts.quality, opts.noWatermark);
    const filePath = resolve(opts.output);
    await downloadImage(url, filePath);
    console.log("Done.");
  } else {
    console.error("Provide --prompt + --output for single image, or --batch + --output-dir for batch mode.");
    console.error("Run with --help for usage.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
