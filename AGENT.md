# zflow-skills — Agent Instructions

AI-driven video generation pipeline: brief → content plan → material → tts → hyperframes → images → MP4.

This file is the single source of truth for pipeline rules, skill flow, and decision logic.
Any AI agent (Claude Code, Cursor, Windsurf, Copilot, etc.) should read and follow this file.

---

## Project Structure & Conventions

This project is **agent-agnostic**. The pipeline rules below apply to any AI agent that reads this file; `.claude/` and `CLAUDE.md` are an *optional* Claude Code adapter layer, not the core.

### Skill layout

Each skill lives in `skills/<name>/`:

- `SKILL.md` — the skill's workflow definition (the only mandatory file)
- `scripts/` *(optional)* — implementation scripts (`*.mjs`)
- `references/` *(optional)* — reference material loaded on demand

### SKILL.md frontmatter (agent-agnostic)

Every `SKILL.md` starts with a YAML frontmatter block:

```yaml
---
name: <skill-name>
description: >
  <one-line positioning>. <trigger / responsibility>.
  <output or handoff artifacts>.
version: 1.0.0
---
```

- `description` uses a YAML folded scalar (`>`) and **English** (documentation language is English throughout).
- **Do not add agent-specific fields** (`allowed-tools`, `model`, …) here — those are Claude Code-only. Tools/models are decided by whichever agent runs the skill.

### Handoff contract

Skills hand off exclusively via JSON/markdown files (see [Data Flow Summary](#data-flow-summary)). No skill reads another skill's internals — only the declared artifacts. Any agent that follows this contract can drive the whole pipeline.

### Adapter layers

- **Claude Code** — `.claude/commands/<name>.md` maps `/name` to `skills/<name>/SKILL.md`; `CLAUDE.md` holds render params. Optional.
- **Other agents (Cursor / Windsurf / Copilot …)** — point the agent at this file, then open the target `skills/<name>/SKILL.md` and ask it to execute. See README "Using with other agents".

---

## GLOBAL RULE: No Cross-Project Peek

**No skill may read files from `output/<other-project>/` during generation.** When working on project X (`output/X/`), only read files within `output/X/` and the skill's own `references/` directory. Reading another project's `composition/index.html`, `content-plan.json`, `materials.json`, or any generated output is forbidden — it causes style convergence (every project starts looking the same).

**Allowed reads:**
- `output/<current-project>/**` — the project you're generating
- `skills/<current-skill>/**` — skill definitions, references, scripts
- `AGENT.md` — pipeline rules (this file)

**Forbidden reads:**
- `output/<other-project>/composition/index.html`
- `output/<other-project>/content-plan.json`
- `output/<other-project>/materials.json`
- Any file under `output/<other-project>/` that is generated output, not shared config

**Rationale:** Each composition must be designed from scratch based on its own narration, materials, and design.md. "Borrowing" layout patterns, animation sequences, or color schemes from prior output makes every video look identical.

---

## Pipeline Overview

```
User text (or topic keyword)
  │
  ▼
┌──────────────┐    brief.json     ┌───────────────┐   content-plan.json
│ video-brief   │ ──────────────▶ │ content-plan   │ ──────────────────▶
│ requirements  │                 │ narration gen  │
│ (sourceType)  │                 │ (topic expand) │
└──────────────┘                  └───────────────┘
                                          │
                       ┌──────────────────┤──────────────────┐
                       ▼                                     ▼
              ┌───────────────┐                     ┌───────────────┐
              │ material │  【Round 1】        │  tts    │
              │  broad search │                     │  voice gen    │
              └───────┬───────┘                     └───────┬───────┘
                      │                                     │
               materials.json                          audio.mp3
                                            block-timing.json
                      │                                     │
                      └──────────────────┬──────────────────┘
                                         ▼
                                 ┌───────────────┐    material-requests.json
                                 │  hyperframes   │──────────────────────▶ material
                                 │  HTML compose  │                      │  【Round 2】
                                 │  (design.md    │◀──── updated materials ─┘
                                 │   captions)   │
                                 └───────┬───────┘
                                         │
                               ┌─────────┼─────────┐
                               ▼                   ▼
                      ┌───────────────┐    ┌───────────────┐
                      │ image-gen     │    │   render       │
                      │ (optional)    │    │  video output  │
                      └───────┬───────┘    └───────┬───────┘
                              │                    │
                              ▼                    ▼
                         PNG images          final.mp4
                                                    │
                                            ┌───────┴────────┐
                                            ▼                ▼
                                      (optional) check
                                            layout check
```

### Default Flow

```
0. start          — environment check + install + flow guide (first-time must-run)
1. video-brief    — requirements → brief.json
2. content-plan   — narration (topic expand if needed) → content-plan.json
3. material       — Round 1 broad search → materials.json
4. tts            — voice gen → audio.mp3 + block-timing.json
5. hyperframes    — HTML composition → index.html + design.md (mandatory)
6. material (R2)  — targeted supplement from material-requests.json (if produced)
7. image-gen      — AI image gen (optional, fallback only)
8. render         — render MP4 + audio mux + validation
```

> Steps 3 and 4 can run in parallel (material collection and TTS are independent).
> `check` (layout validation) is optional — run after hyperframes, before render, as needed.

---

## Skills Reference

| Skill | Directory | Purpose |
|-------|-----------|---------|
| **start** | `skills/start/` | Environment check + install + flow guide (first-time must-run) |
| **video-brief** | `skills/video-brief/` | Collect video requirements, generate brief.json |
| **content-plan** | `skills/content-plan/` | Narration rewriting: oral style, sentence optimization, audience fit |
| **tts** | `skills/tts/` | Voice gen: per-block TTS + silence splice + block-level timestamps |
| **hyperframes** | `skills/hyperframes/` | HTML composition: scene design, animation, captions, material requests |
| **material** | `skills/material/` | Material collection: Pexels/Pixabay search & download |
| **image-gen** | `skills/image-gen/` | AI image generation via GLM API |
| **check** | `skills/check/` | Layout validation (optional): overlap, overflow, crop, caption safe zone |
| **render** | `skills/render/` | Video render: render + audio mux + validation |
| **gsap** | `skills/gsap/` | GSAP animation patterns and effects reference |
| `hyperframes-cli` | `skills/hyperframes-cli/` | *Reference skill* — HyperFrames CLI command reference (not a `/` command) |

---

## Decision Logic: What to Do Next

After each skill completes, the agent must guide the user to the next step:

### After video-brief
```
✅ brief.json generated!
Next: content-plan (generate narration from your text)
```

### After content-plan
```
✅ content-plan.json generated!
Next: Run material AND tts in parallel (they are independent)
```

### After material (Round 1)
```
✅ Material collection complete! materials.json ready.
Next: hyperframes (needs materials.json + block-timing.json)

💡 If TTS is not yet complete, wait for it before entering hyperframes
💡 Material collection and TTS can run in parallel, enter hyperframes after BOTH complete
```

### After tts
```
✅ TTS complete! audio.mp3 + block-timing.json ready.
Next: hyperframes (needs block-timing.json + materials.json)

💡 If material collection is not yet complete, wait for it before entering hyperframes
💡 TTS and material collection can run in parallel, enter hyperframes after BOTH complete
```

### After hyperframes
```
✅ Composition generated! All checks passed.
Next:
  If AI image generation needed → image-gen
  If ready → render

💡 For additional layout validation, run check (optional)
```

### After material (Round 2)
```
✅ Material supplement complete! materials.json updated.
Next:
  If AI image generation needed → image-gen
  If ready → render
```

### After image-gen
```
✅ AI images generated!
Next: render (render output video)
```

### After render
```
✅ Video rendered! output.mp4 ready.
Next: Done! 🎉
```

---

## Running Modes

### Full Mode (with TTS)
```
video-brief → content-plan → material(R1) + tts(parallel) → hyperframes → [material(R2)] → image-gen(optional) → render
```

### Preview Mode (no TTS)
```
video-brief → content-plan → material(R1) → hyperframes → image-gen(optional) → render
```
Skip TTS step. Hyperframes estimates timing from character count (~4 char/s).

### Topic Mode
```
video-brief(sourceType=topic) → content-plan(auto-expand) → same as full mode
```
User provides only a topic keyword (e.g. "赚钱"), content-plan Phase 1B auto-expands to full narration.

---

## Prerequisites

- **Node.js 22+** (18+ works for most skills, 22+ required by hyperframes CLI)
- **FFmpeg** installed and on PATH
- **Chrome/Chromium** installed (required for rendering and layout checks)
- **ZHIPU_API_KEY** in `.env` (from [open.bigmodel.cn](https://open.bigmodel.cn)) — for AI image generation
- **PEXELS_API_KEY** in `.env` (from [pexels.com/api](https://www.pexels.com/api/)) — for stock footage
- **PIXABAY_API_KEY** in `.env` (from [pixabay.com/api/docs](https://pixabay.com/api/docs/)) — for stock footage

## Setup (One-Time)

**Windows:**
```bash
setup.bat
```

**macOS / Linux:**
```bash
chmod +x setup.sh && ./setup.sh
```

This runs `scripts/check-env.mjs` which:
1. Checks OS compatibility (Windows/macOS/Linux)
2. Verifies Node.js >= 22, auto-installs via winget/brew/apt if missing
3. Verifies FFmpeg, auto-installs if missing
4. Verifies Chrome/Chromium, auto-installs if missing
5. Checks API keys in `.env`, creates `.env` from `.env.example` if missing
6. Installs global npm packages (hyperframes, puppeteer-core)
7. Verifies project structure (skills, config files)
8. Runs a smoke test on the hyperframes CLI

**Check only (no auto-install):**
```bash
node scripts/check-env.mjs --check
```

---

## Data Flow Summary

### JSON File Relationships

| File | Producer | Consumer |
|------|----------|----------|
| `brief.json` | video-brief | content-plan, hyperframes, image-gen, material, render |
| `content-plan.json` | content-plan | tts, hyperframes, material |
| `block-timing.json` | tts | hyperframes |
| `materials.json` | material | hyperframes |
| `material-requests.json` | hyperframes | material (Round 2) |
| `design.md` | hyperframes (Step 1) | hyperframes (Step 2-6) |
| `audio.mp3` | tts | hyperframes, render (audio mux) |
| `index.html` | hyperframes | render |
| `assets/*.png` | image-gen | hyperframes (HTML reference) |

---

## Core Design Principles

1. **JSON-chained, declarative** — Each stage outputs structured JSON, not code. Any node can be reviewed, modified, re-run downstream.
2. **Separation of concerns** — Each skill does one thing: brief collects requirements, content-plan writes narration, hyperframes designs visuals.
3. **Previewable** — Every stage has visual output (JSON is readable, HTML is browser-previewable), problems surface before final render.
4. **Deterministic rendering** — All animations via GSAP timeline + data attributes, frame state fully determined at any point.
5. **Content-driven design** — Same visual preset produces different colors, fonts, layouts based on content. No templates.
6. **Mandatory captions** — Every composition must include captions synced to block-timing.
7. **Mandatory design.md** — Every composition must have design.md, auto-generated from visual preset + content.

---

## Error Handling

- If a skill fails, check the skill's `SKILL.md` Troubleshooting section
- Each skill's output can be manually inspected and edited before proceeding
- Re-running a skill is safe if its input files haven't changed
- If hyperframes produces `material-requests.json`, run material Round 2 before render
