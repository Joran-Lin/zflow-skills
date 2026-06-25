<div align="center">

# <img src="assets/logo.webp" alt="logo" width="48" style="vertical-align:middle" /> zflow-skills

### Give it a sentence. Get a finished video.

*AI writes **code**, not pixels — **HTML is the video source.***

<img src="assets/banner-anim.webp" alt="zflow-skills — AI-driven HTML video generation (animated)" width="100%">

<p align="center" style="margin:8px 0">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License: Apache-2.0"></a>
  <a href="#installation"><img src="https://img.shields.io/badge/node-%3E%3E22-339933.svg" alt="Node ≥ 22"></a>
  <a href="#quick-start"><img src="https://img.shields.io/badge/built_for-agent-8957e5.svg" alt="Built for Agent"></a>
</p>

</div>

---

## What it is

**zflow-skills** turns **a theme, a sentence, or a paragraph** into a high-quality short video — visuals, voiceover, captions, and motion, all generated. **Zero manual editing. No timeline. No dragging clips.**

> 🎯 **The core bet:** *AI is better at emitting structured code than unstable raw pixels.* So here, **a video is an HTML file** — `data-*` timing attributes, a GSAP timeline, CSS for looks — rendered frame-by-frame to MP4 by a headless Chrome.

That single decision is what unlocks everything else.

## What you get

<img src="assets/features-anim.webp" alt="Three capabilities: a creative engine not a template, gated quality control, and three TTS voices (animated)" width="100%">

A pipeline of **8 stages**, each a single-purpose skill (plus `start` for env bootstrapping, and `gsap` / `hyperframes-cli` as references). Each stage writes a JSON artifact to disk, and the next reads it back — nothing lives in memory as a black box. So you can inspect any artifact, tweak it, and rerun **only** the stages downstream of your change.

| | Step | Skill | Output | Role |
|---|---|---|---|---|
| 🎯 | 1 | `video-brief` | `brief.json` | Collect requirements — audience / platform / **8 preset visual styles** / resolution |
| ✍️ | 2 | `content-plan` | `content-plan.json` | Rewrite text into spoken narration (keyword mode auto-builds a Hook→Body→Outro arc) |
| 🖼️ | 3 | `material` | `materials.json` | Pexels + Pixabay search, **two rounds** — broad net, then targeted fill |
| 🎙️ | 4 | `tts` | `audio.mp3` + `block-timing.json` | Per-sentence synthesis with content-aware pauses; timestamps drive scene cuts |
| 🧠 | 5 | `hyperframes` | `index.html` + `design.md` | Autonomously designs the HTML storyboard + motion + captions |
| 🪄 | 6 | `image-gen` | `assets/*.png` | AI text-to-image fallback **only** when materials are missing; CSS/SVG-first |
| 🔍 | 7 | `check` | audit report | Deep layout validation (overlap / clipping / density) before render — optional |
| 🎬 | 8 | `render` | `final.mp4` | Headless Chrome frame-by-frame + ffmpeg mux · draft / standard / high · 24/30/60fps |

> Steps 3 and 4 are independent and run in parallel. Skip `tts` for a visual-only preview (hyperframes estimates timing at ~4 chars/sec).

### TTS — three engines

Pick one via the `ttsProvider` field in `brief.json`. All three do **per-sentence synchronized synthesis + concurrency** and output 24kHz mono mp3.

<table>
<tr>
<td width="33%" align="center" valign="top">

🔊 **`edge`** *(default)*

Edge TTS

free · no key

6 Chinese voices

</td>
<td width="33%" align="center" valign="top">

🎙️ **`zhipu`**

Zhipu GLM-TTS

refined Chinese voices

needs `ZHIPU_API_KEY`

</td>
<td width="33%" align="center" valign="top">

✨ **`minimax`**

MiniMax

100+ voices · controllable emotion · top quality

needs `MINIMAX_API_KEY`

</td>
</tr>
</table>

## How it works — where the magic lives

### 🧠 A creative engine, not a template engine.

Materials, caption timestamps, and narration go *in* — but the storyboard, palette, layout, and motion choreography are decided by the model **only after it reads the content.** There is deliberately no template library in this repo. The same preset produces *different* colors, fonts, and layouts for different content, because `design.md` is written fresh every time.

Freedom like that normally spirals into chaos. So four gates hold the line:

🚦 **6-step protocol** — Design → Prompt Expansion → Plan → Layout → Animate → Output Checklist. Every step ships a reviewable artifact. Problems surface **before** render, never after.

🎨 **Visual density** — every scene must hold a 3-layer structure, 8+ elements, and a dual-focus layout. *Flat “one image + one line of text” frames are rejected.*

🎬 **In-scene phasing** — a scene spanning 2+ blocks must **evolve** with the narration. Early elements transform and respond as later phases arrive. Frozen frames and mere stacking are rejected.

🔒 **Deterministic frames** — no `Math.random()`, no infinite loops, no async at render time. Any frame is exactly reproducible.

…plus two loops that close the gaps: **material-first mapping** (real assets located before layout — AI image-gen is only the last resort) and a **two-round material loop** (broad net → design → targeted replenish, so you never "compromise a scene just to fill it").

## Demo

> 🎬 A 2m30s video, generated from **a single Weibo post** (Prof. Tang Jie). Topic-to-video, end-to-end, no manual edit.

<video src="https://github.com/user-attachments/assets/07a7c144-dbde-433f-8d23-c2601d7c0369" controls muted width="100%"></video>

<p align="center"><em>Inline preview is compressed. <a href="./assets/demos/tangjie-demo-hd.mp4">Watch the HD version</a> (1080p, 21 MB).</em></p>

## Quick start

```bash
git clone https://github.com/Joran-Lin/zflow-skills.git && cd zflow-skills
```

Run `/start` inside your agent — it auto-checks and installs all dependencies (Node, FFmpeg, Chromium, the hyperframes CLI, CJK fonts).

Then drive the pipeline. The slash commands below run in **Claude Code** (smoothest experience); on Cursor / Windsurf / Copilot, just follow [`AGENT.md`](./AGENT.md) or run the scripts in `skills/*/scripts/` directly.

```
/video-brief    # "make a video about X"   → brief.json
/content-plan   # narration                → content-plan.json
/material       # assets                   → materials.json
/tts            # voice                    → audio.mp3 + block-timing.json
/hyperframes    # design                   → index.html + design.md
/render         # → final.mp4 🎉
```

## Installation

| Dependency | Version | Purpose |
|---|---|---|
| Node.js | ≥ 22 | Runtime |
| FFmpeg + ffprobe | any stable | Audio/video processing |
| Chrome / Chromium | any modern | Headless render, layout checks |
| hyperframes CLI | — | Renders compositions (`npm install -g`, or via `npm run setup`) |
| `ZHIPU_API_KEY` | — | AI image gen + Zhipu TTS *(optional)* |
| `MINIMAX_API_KEY` | — | MiniMax TTS *(optional)* |
| `PEXELS_API_KEY` / `PIXABAY_API_KEY` | — | Material search *(optional)* |

## License

[Apache-2.0](./LICENSE) © 2026 Min Li, Zhuoran Lin.

- `skills/hyperframes*` and `skills/gsap` — vendored fork of [HyperFrames](https://github.com/heygen-com/hyperframes) (Apache-2.0, © HeyGen, Inc.). Modified files carry a provenance marker.
- `skills/tts/scripts/edge-tts.mjs` — LGPL-3.0-or-later clean-room port of [edge-tts](https://github.com/rany2/edge-tts).

See [`NOTICE`](./NOTICE) and [`LICENSES/`](./LICENSES/) for full attributions.


## Community

Join us to chat, share ideas, or request features 👋

| Discord | Feishu | Xiaohongshu |
|---|---|---|
| [Join Discord](https://discord.gg/gBdhZksqKc) | [Join Feishu](https://applink.feishu.cn/client/chat/chatter/add_by_link?link_token=364sa102-b5f0-4dea-8d3a-ab2ae4ddad52) | <img src="assets/xiaohongshu.webp" alt="Xiaohongshu" width="180"> |
