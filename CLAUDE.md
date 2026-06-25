# zflow-skills — Claude Code Config

> **Core pipeline rules are in `AGENT.md`** — read it first.
> This file contains **Claude Code-specific configuration only** (slash-command mapping, render params). Agent-agnostic rules live in `AGENT.md`.

## Custom Slash Commands

All skills are registered as Claude Code slash commands in `.claude/commands/`:

| Command | Maps to | Purpose |
|---------|---------|---------|
| `/start` | `skills/start/` | Environment check + install + flow guide |
| `/video-brief` | `skills/video-brief/` | Collect requirements → brief.json |
| `/content-plan` | `skills/content-plan/` | Narration gen → content-plan.json |
| `/material` | `skills/material/` | Material collection → materials.json |
| `/tts` | `skills/tts/` | Voice gen → audio.mp3 + block-timing.json |
| `/hyperframes` | `skills/hyperframes/` | HTML composition → index.html + design.md |
| `/image-gen` | `skills/image-gen/` | AI image gen (optional) |
| `/check` | `skills/check/` | Layout validation (optional) |
| `/render` | `skills/render/` | Render MP4 + audio mux |
| `/gsap` | `skills/gsap/` | GSAP animation patterns reference |

## Quick Start

**First time? Run `/start`** — checks and installs all dependencies, then guides you into the pipeline.

The full pipeline flow (start → video-brief → content-plan → material+tts → hyperframes → render) is defined in [`AGENT.md`](AGENT.md) — this is the authoritative source. In Claude Code, each step maps to a slash command:

| Step | Command |
|------|---------|
| Env check + install | `/start` |
| Requirements | `/video-brief` |
| Narration | `/content-plan` |
| Material (R1) | `/material` |
| Voice + timing | `/tts` |
| HTML composition | `/hyperframes` |
| Material supplement (R2, if needed) | `/material` |
| AI images (optional) | `/image-gen` |
| Render MP4 | `/render` |
| Layout check (optional) | `/check` |

> `/material` (R1) and `/tts` can run in parallel. Skip `/tts` for preview mode.

> Steps 3 and 4 can run in parallel (material collection and TTS are independent).

### Without TTS (preview mode)

Skip step 4. Hyperframes will estimate timing from character count (~4 char/s).

## Hyperframes Creative Mode

`/hyperframes` is the visual creation engine. It reads narration + block-timing + materials and designs autonomously:

- **Full freedom**: scene division, visual selection, layout, animation choreography — all decided by the model
- **Strict adherence**: block-timing timestamps (caption sync), audio sync, resolution
- **Content-driven**: model reads narration to understand the story, naturally arranging visual changes at content transitions
- **Materials available**: materials.json assets are freely selectable, not mandatory

## Layout Check (optional)

Optional deep layout validation, detects element overlap, excessive vertical whitespace, scene diversity issues before rendering. Hyperframes Output Checklist already includes basic checks; this step is for when you need more:

```bash
node skills/check/scripts/check-layout.mjs output/<project>/composition/
```

Exit code `0` = pass, `1` = issues found. Requires Chrome browser and `puppeteer-core` (install globally: `npm install -g puppeteer-core`).

## Render Engine

HyperFrames CLI is installed globally (`npm install -g hyperframes`). Render a composition:

```bash
hyperframes render <composition-dir> --output <output.mp4>
```

Options: `--fps 24|30|60`, `--quality draft|standard|high`, `--gpu`

### Audio Mux (required)

HyperFrames built-in audio processing has a path resolution bug on Windows — rendered video has no audio. **After rendering, must manually merge audio with ffmpeg:**

```bash
ffmpeg -i <output.mp4> -i <composition-dir>/audio.mp3 -c:v copy -c:a aac -b:a 192k -shortest -y <output-with-audio.mp4>
```

Then replace the original file. If there's no `audio.mp3` in the composition directory (visual-only preview mode), skip this step.
