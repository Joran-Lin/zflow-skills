---
name: start
description: >
  Pipeline entry point. On first run, checks and installs all environment
  dependencies (Node.js, FFmpeg, Chrome, API keys, npm packages). Once passing,
  guides the user into /video-brief to begin the video creation pipeline.
  You can run /start at any time to re-check the environment status.
version: 1.0.0
---

<HARD-RULE>
**No cross-project peek:** When working on project X (`output/X/`), NEVER read files from `output/<other-project>/`. Only read `output/X/**` and this skill's own files. Reading other projects' generated outputs causes style convergence.
</HARD-RULE>

# Start — Pipeline Entry Point

This is the unified entry point for zflow-skills. Start here on first use or whenever the environment changes.

## Workflow

### Step 1: Environment Pre-check

Run the environment check script to confirm all dependencies are ready:

```bash
npm run setup
```

`npm run setup` automatically detects, installs, and interactively configures all dependencies.

**If all checks pass** (0 fail, 0 warn) → proceed to Step 2.

**If there are failures** → the script attempts automatic fixes:
- Auto-installed items: Node.js, FFmpeg, Chromium (via Playwright, no need to install full Chrome), global npm packages, ws module
- Interactively configured items: API keys (asked one by one at runtime, automatically written to `.env`)

**If the user already has a Chrome browser** → it is detected automatically and not reinstalled.

You can also run them separately:
```bash
npm run setup:check   # check only, no install
npm run setup:fix     # check + auto-install (non-interactive)
```

**If any API keys are not set** → ask the user in conversation and write them directly to `.env`:

```
The following API keys are not configured. You can tell me now and I will write them to the .env file for you:
  - ZHIPU_API_KEY  — required for Zhipu AI image generation + GLM-TTS (get at: https://open.bigmodel.cn)
  - MINIMAX_API_KEY — MiniMax TTS, optional (only needed when /tts uses the minimax engine) (get at: https://platform.minimaxi.com/user-center/basic-information/interface-key)
  - PEXELS_API_KEY — required for material video collection   (get at: https://www.pexels.com/api/)
  - PIXABAY_API_KEY — required for material video collection  (get at: https://pixabay.com/api/docs/)

Please give me your keys, in the format:
  ZHIPU_API_KEY=xxxxx
  MINIMAX_API_KEY=xxxxx
  PEXELS_API_KEY=xxxxx

If you don't have a key yet, just press Enter to skip. You can manually edit the .env file later.
```

After receiving the user's keys, **write them directly to the `.env` file** — the user does not need to edit it manually.

**Do not proceed to subsequent steps until the environment is ready.** Wait for the user to confirm all issues are resolved.

### Step 2: Guide into the Pipeline

Once the environment is ready, show the user the full pipeline and guide them into the first step:

```
✅ All environment checks passed! Ready to start creating videos.

Full pipeline:
  1. /video-brief    — collect video creation requirements → brief.json
  2. /content-plan   — narration rewrite (oral style, sentence optimization) → content-plan.json
  3. /material — material collection (Pexels/Pixabay search and download) → materials.json
  4. /tts      — voice generation (per-sentence TTS + silence stitching) → audio.mp3 + block-timing.json
  5. /hyperframes    — HTML composition generation → index.html
  6. /image-gen — AI image generation (fallback only, optional)
  7. /render         — render output MP4 + audio mux + validation

Optional step:
  /check — layout validation (element overlap, scene diversity), use as needed

💡 Steps 3 and 4 can run in parallel (materials and voice are independent of each other)
💡 If no voiceover is needed, skip step 4 (hyperframes will estimate duration at ~4 chars/sec)

Now type /video-brief to begin!
```

### Step 3: Create the Project Directory (if the user already has a topic)

If the user already stated the video topic when invoking `/start` (e.g. "I want to make a video about XX"), then:

1. Create a project directory under `output/`: `output/<project-name>/`
2. Tell the user that all subsequent files will be saved in this directory

If the user has not specified a topic, wait until the `/video-brief` stage to create it.

## Environment Check Items

| # | Check item | Auto-fix | Manual config |
|---|-----------|---------|---------|
| 1 | OS compatibility | — | — |
| 2 | Node.js >= 22 | winget/brew/apt/nvm/fnm/volta | [download](https://nodejs.org) |
| 3 | FFmpeg + ffprobe | winget/brew/apt | [download](https://ffmpeg.org) |
| 4 | Chrome/Chromium | Playwright Chromium / winget/brew/apt | [download](https://google.com/chrome) |
| 5 | API keys (.env) | create from .env.example + interactive input | user fills in manually or provides in conversation |
| 6 | Global npm packages (hyperframes, puppeteer-core) | npm install -g | — |
| 7 | Project structure | create output/ directory | — |
| 8 | Smoke test | — | — |

> **Tip**: An existing Chrome browser is detected automatically — no extra install needed. If Chrome is absent, prefer installing a lightweight Chromium via `npx playwright install chromium`.
