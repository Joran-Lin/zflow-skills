---
name: hyperframes
description: >
  Creative engine for video composition: build scenes, animations, title cards,
  masks, captions, voiceover, audio-reactive motion, and scene transitions inside
  HyperFrames HTML. Use it whenever you need to build any HTML video content, add
  captions synced to audio, generate TTS narration, produce audio-reactive
  animation (beat-synced, pulsing with music), apply highlight effects to text
  (marker sweep, hand-drawn circle, burst lines, sketch outline), or add
  transitions between scenes (crossfade, wipe, reveal, shader transition). Covers
  composition authoring, timing, media, and the full video production workflow.
  CLI commands (init/lint/preview/render/transcribe/tts) live in the hyperframes-cli skill.
version: 1.0.0
---

<!-- Derived from heygen-com/hyperframes (Apache-2.0), commit e59089bf. Modified by zflow-skills (Min Li, Zhuoran Lin). -->

# HyperFrames

HTML is the source of truth for video. A composition is an HTML file with `data-*` attributes for timing, a GSAP timeline for animation, and CSS for appearance. The framework handles clip visibility, media playback, and timeline sync.

## MANDATORY EXECUTION PROTOCOL

Every composition creation MUST follow these steps **in exact order**. Skipping, merging, or reordering steps is a **critical error** — the result will have invisible elements, broken paths, or layout collisions.

```
Step 1: Design System ──→ artifact: visual identity extracted
         ║
    STEP-GATE 1: design.md read OR design choices written to expanded-prompt.md
         ║
Step 2: Prompt Expansion ──→ artifact: .hyperframes/expanded-prompt.md
         ║
    STEP-GATE 2: expanded-prompt.md EXISTS on disk (not just in memory)
         ║
Step 3: Plan ──→ artifact: scene list, rhythm, materials mapping IN expanded-prompt.md
         ║
    STEP-GATE 3: Visual Density Gate + In-Scene Phasing Gate + Materials-First Mapping verified
         ║
Step 4: Layout Before Animation ──→ artifact: static HTML+CSS (no GSAP)
         ║
    STEP-GATE 4: hero frame for each scene is readable without animation
         ║
Step 5: Animate ──→ artifact: GSAP timeline added to HTML
         ║
    STEP-GATE 5: opacity gate + caption safe zone + material paths verified
         ║
Step 6: Output Checklist ──→ artifact: lint/validate/inspect results
         ║
    STEP-GATE 6: all checklist items pass
         ║
       DONE
```

**Enforcement rules:**

1. **You MUST write each step's artifact to disk before starting the next step.** "I'll do it in my head" is not acceptable — the artifact must exist as a file the user can inspect.
2. **You MUST announce which step you are starting and finishing.** Begin each step with `▶ Step N: [name]` and end with `✓ Step N complete: [artifact written]`.
3. **If a STEP-GATE fails, you MUST fix the problem before proceeding.** Do not "note it and continue." Fix it, re-verify, then proceed.
4. **Small edits (fix a color, adjust one timing value) may skip to Step 5 or 6.** Any change affecting layout, scenes, or animation density must start from the appropriate upstream step.
5. **The Output Checklist is NOT optional.** Even for "quick" compositions, run `lint` and `validate` at minimum.
6. **NEVER read other projects' composition HTML for reference.** When generating a new composition, do NOT open `output/<other-project>/composition/index.html` or any file from another project's output directory. Other projects' compositions are NOT part of this skill — they are prior outputs with their own design context. Reading them causes style convergence (every composition starts looking the same). Your only references are: this SKILL.md, `design.md`/`DESIGN.md`, `visual-styles.md`, `house-style.md`, and the `references/` directory. Read the current project's `content-plan.json`, `materials.json`, and `block-timing.json` for content — that's your source. Design from scratch every time.

## Pre-flight Check

Before using any pipeline skill for the first time, run the environment check:

```bash
npm run setup            # check + auto-install + interactive API key config
npm run setup:check      # check only
```

This verifies: Node.js ≥ 22, FFmpeg, Chrome/Chromium, API keys, npm dependencies, and project structure. If any check fails and you haven't run this, stop and run it first — most "component not rendering" or "command not found" errors are caused by missing environment.

## Pipeline Data Sources

When invoked as part of the video pipeline (`/hyperframes`), the skill auto-detects and reads these files:

1. `content-plan.json` — narration text (the `narration` field)
2. `brief.json` — visual style, resolution, aspect ratio
3. `block-timing.json` — precise block timestamps from TTS (if available)
4. `materials.json` — flat pool of available assets (if available)
5. `audio.mp3` — audio file (if available)

**Hard constraints:**
- Block start/end times (from block-timing, for caption sync)
- Resolution and aspect ratio
- Audio sync
- **Captions are mandatory** — every composition must include captions (`caption-group` or `.caption`) synced to block-timing. If no `block-timing.json` exists, estimate from character count (4 char/s default, 3 char/s for dense content, 6 char/s for rapid lists) and generate captions from the narration text.

**Everything else is a creative decision you make freely.** Read the narration text, understand the story, and design the composition. Scene structure, visual beats, layout, animation, and material usage are all your creative choices. No one pre-defines your scenes or tells you where to place visual emphasis — the narration text itself carries that information.

**No TTS timing estimation:** When `block-timing.json` doesn't exist, estimate from character count (4 char/s default, 3 char/s for dense content, 6 char/s for rapid lists), with 0.6s pause between sentences.

**Material requests:** If needed materials aren't in materials.json, output `material-requests.json` alongside the HTML for later collection.

## Approach

When invoked via the pipeline (`content-plan.json` exists), skip Discovery — read the narration text and design freely. Use materials.json's available assets to inform visual choices.

### Discovery (exploratory requests only)

For open-ended requests ("make me a product launch video", "create something for our brand") where the user hasn't committed to a direction, understand intent before picking colors:

- **Audience** — who watches this? Developers? Executives? General consumers?
- **Platform** — where does it play? Social (15s), website hero, product demo, internal?
- **Priority** — what matters most? Motion quality? Content accuracy? Brand fidelity? Speed?
- **Variations** — does the user want options, or a single best shot?

For specific requests ("add a title card", "fix the timing on scene 3"), skip discovery.

For exploratory requests, consider offering 2-3 variations that differ meaningfully — not just color swaps, but different pacing, energy levels, or structural approaches. One safe/expected, one ambitious. Don't mandate this — it's a tool available when appropriate.

### Step 1: Design system

If `design.md` or `DESIGN.md` exists in the project, read it first (check both casings — they're different files on Linux). It's the source of truth for brand colors, fonts, and constraints. Use its exact values — don't invent colors or substitute fonts. Any format works (YAML frontmatter, prose, tables — just extract the values).

If it names fonts you can't find locally (no `fonts/` directory with `.woff2` files, not a built-in font), warn the user before writing HTML: "design.md specifies [font name] but no font files found. Please add .woff2 files to `fonts/` or I'll fall back to [closest built-in alternative]."

<HARD-GATE>
**Font loading for headless render:** Every non-system font used in the composition MUST be loadable in a headless browser. System fonts: `Arial`, `Helvetica`, `Times New Roman`, `Georgia`, `Courier New`, `monospace`, `sans-serif`, `serif`. Everything else requires one of:
1. **Google Fonts CDN** — add a `<link>` tag in `<head>`. Example: `<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet" />`. This is the preferred method — hyperframes' compiler auto-caches and inlines Google Fonts.
2. **Local woff2** — place `.woff2` files in `fonts/` and add `@font-face` rules in `<style>`.
If any font in the composition has neither a CDN link nor a local file, the composition will render with fallback fonts and look broken. Verify before writing HTML.
</HARD-GATE>

If no `design.md` exists, you MUST create one. The creation path depends on `brief.json`:

**Path A — `brief.json` has `visualStyle` (one of 8 presets):** Auto-generate `design.md` with zero user interaction.

1. Read [visual-styles.md](./visual-styles.md) and find the matching preset — use it as the **starting point**, not a rigid template.
2. Read `content-plan.json` (narration text) and `brief.json` (audience, language, topic). **Understand the content** — its domain, emotion, key themes, and intended impact.
3. **Adapt the preset to fit the content.** The preset gives you the visual DNA (mood, animation language, transition type). You adapt the specifics:
   - **Accent color** — pick a hue that resonates with the content's domain and emotion, not just the preset's default. A "Data Drift" video about healthcare feels different from one about crypto.
   - **Fonts** — if the preset says "Helvetica", that's a suggestion. Choose fonts that match both the preset's mood AND the content's character. Cross-category pairings per [references/typography.md](references/typography.md).
   - **Derived values** (rounded, spacing, elevation) — derive from the combination of preset mood + content nature. A "Soft Signal" video for a tech product has different spacing than one for a personal story.
4. Write the complete `design.md` to the project root with YAML frontmatter containing: `colors` (bg, fg, accent, muted), `typography` (heading + body font, weights), `rounded`, `spacing`, `elevation`. Add prose sections: `## Overview`, `## Colors`, `## Typography`, `## Layout`, `## Elevation`, `## Motion` (GSAP signature), `## Transitions`.

**The preset is your compass, not your cage.** Two videos with the same visualStyle should share the same visual DNA (mood, animation language, transition feel) but differ in accent color, font choice, and derived values based on their content.

**Path B — `brief.json` has `visualStyle: "custom:Playground"`:** Interactive design picker.

1. Read [references/design-picker.md](references/design-picker.md) for the full workflow. This serves a visual picker page. The user configures mood, palette, typography, and motion in the browser, then copies the generated design.md and pastes it back into the conversation.
2. Save the pasted content verbatim as `design.md` to the project root.

**Path C — No `brief.json` or no `visualStyle` field:** Quick Q&A.

1. Ask the user 3 questions: mood?, light or dark?, any brand colors/fonts?
2. Pick a palette from [house-style.md](./house-style.md).
3. Write the result as `design.md` to the project root.

**design.md defines the brand. It does not define video composition rules.** Those come from [references/video-composition.md](references/video-composition.md) and [house-style.md](./house-style.md). Use brand colors at video-appropriate scale — not at web-UI opacity.

<HARD-GATE>
Before writing ANY composition HTML — verify you have a visual identity from Step 1. If you're reaching for `#333`, `#3b82f6`, or `Roboto`, you skipped it.
</HARD-GATE>

**STEP-GATE 1 — Design System Complete:**
- [ ] `design.md` EXISTS on disk (read from existing or created in this step)
- [ ] Colors/fonts extracted from `design.md`
- [ ] Every non-system font has a Google Fonts CDN link or local `.woff2` (font loading gate)
- [ ] Palette written into `expanded-prompt.md` (or design.md values confirmed)
- ⛔ **Do not proceed to Step 2 until all items are checked.**

### Step 2: Prompt expansion

Always run on every composition (except single-scene pieces and trivial edits). This step grounds the user's intent against `design.md` and `house-style.md` and produces a consistent intermediate that every downstream agent reads the same way.

Read [references/prompt-expansion.md](references/prompt-expansion.md) for the full process and output format.

**STEP-GATE 2 — Prompt Expansion Complete:**
- [ ] `.hyperframes/expanded-prompt.md` file EXISTS on disk (check with `ls` or equivalent)
- [ ] File contains: visual style choices, scene breakdown, rhythm pattern, materials mapping table
- ⛔ **Do not proceed to Step 3 until expanded-prompt.md is written. No exceptions — this file is the auditable record that Step 1 and Step 2 were executed.**

### Step 3: Plan

Before writing HTML, think at a high level:

1. **What** — what should the viewer experience? Identify the narrative arc, key moments, and emotional beats.
2. **Structure** — how many compositions, which are sub-compositions vs inline, what tracks carry what (video, audio, overlays, captions).
3. **Rhythm** — declare your scene rhythm before implementing. Which scenes are quick hits, which are holds, where do shaders land, where does energy peak. Name the pattern: fast-fast-SLOW-fast-SHADER-hold. Read [references/beat-direction.md](references/beat-direction.md) for rhythm templates.
4. **Timing** — which clips drive the duration, where do transitions land, what's the pacing.
5. **Media** — for each scene, pick the right medium (video, image, vector, CSS/SVG) based on content nature and visual style. Read [references/media-selection.md](references/media-selection.md).
6. **Layout** — build the end-state first. See "Layout Before Animation" below.
7. **Animate** — then add motion using the rules below.

**Pipeline mode** — when `content-plan.json` exists:

- Read the narration text and understand the story — the characters, concepts, emotions, contrasts, and flow
- Design scenes freely based on your understanding of the content
- Use block-timing.json for caption sync (when each sentence appears/disappears)
- Use materials.json for available visual assets
- **In-scene phasing (mandatory):** When a scene spans 2+ blocks from block-timing.json, the visual MUST evolve across those blocks — NOT dump all elements at scene start and freeze. Design a distinct visual phase for each block, timed to its startTime. See "In-Scene Phasing" hard gate below.

**Pipeline mode** — when `materials.json` exists, it feeds into Plan:

- **Real assets available** → lean into them. A good stock video of a city skyline is more compelling than a CSS recreation. Let the available materials influence your visual approach.
- **No materials for a segment** → that's where self-drawn visuals (CSS/SVG/GSAP) shine. No need to request AI images for everything — embrace what the content calls for.

**Build what was asked.** A request for "a title card" is not a request for "a title card + 3 supporting scenes + ambient music + captions." Every scene, every element, every tween should earn its place. If additional scenes or elements would genuinely improve the piece, propose them — don't add them.

For small edits (fix a color, adjust timing, add one element), skip straight to the rules.

**STEP-GATE 3 — Plan Complete:**
- [ ] Scene list with block assignments written to `expanded-prompt.md`
- [ ] Rhythm pattern declared (e.g., "fast-fast-SLOW-fast-SHADER-hold")
- [ ] Materials-First Mapping table written to `expanded-prompt.md` (see Materials-First Mapping section)
- [ ] For multi-block scenes: phase structure defined (which elements enter in which block)
- ⛔ **Do not proceed to Layout Before Animation until the plan is written and auditable.**

### Visual Density Gate

<HARD-GATE>
Before writing scene HTML, verify each scene meets minimum density. If a scene fails any check, add elements before proceeding. Read [references/video-composition.md](references/video-composition.md) for the full density rules.

Every scene must have:

1. **Three layers minimum** — background texture (particle field, grain, grid, gradient mesh — not just a glow) + midground content + foreground accents (dividers, labels, data bars, metadata). Solid flat color + a single radial glow is NOT a background.
2. **8+ visual elements** — count them: background treatments, heading, body text, images, accent lines, labels, data bars, decorative shapes, registration marks. Two should be decorative elements the user didn't ask for — you add them because empty frames look broken.
3. **Background richness** — the background must have 2+ texture sources (particle field, grid, grain, gradient mesh, treated video). A flat color + one glow fails this check.
4. **Focal weight** — at least one element must dominate the frame (hero stat at 100-200px, full-frame image/video, or CSS/SVG visualization filling 30%+ of the frame). "Heading + body + small image" has no focal weight.
5. **Two focal points minimum** — the eye needs somewhere to travel. A single text block floating in space is a slide, not a scene.
6. **Frame anchoring** — pin content to edges (left/top, right/bottom) or use split layouts (data left, content right). Centered-and-floating is a web pattern, not a video frame.
7. **Non-text dominance** — body-text area must not exceed 40% of any scene's visual content. If a sentence appears in both captions and body-text, replace the body-text with a non-text visual element (stat card, progress bar, icon row, comparison chart, tag badge, gradient block). Captions already carry narration; body-text echoing captions is redundant.
8. **Information density** — of the 8+ visual elements, at least 3 must carry information (data, concepts, comparisons), not just decoration. Every key data point or claim in the narration must have a corresponding non-text visual element on screen. No more than 5 independent information points per scene.
9. **Non-text element quality** — every non-text visual element (stat card, progress bar, comparison chart, etc.) must pass the three-criterion quality gate from [data-in-motion.md](data-in-motion.md): visual gravity (commands attention), atmosphere integration (belongs to the scene's visual world), and data narrative (value + context, not a naked number). If it looks like a web UI component pasted into a video frame, it fails.

If you catch yourself building a scene with just a title + subtitle + background color + glow → stop, open [references/video-composition.md](references/video-composition.md), and add density before writing HTML.

**Anti-pattern: the thin template.** If every scene in your composition uses the same "solid + glow + ghost number / heading + body + image / accent line + mono label" pattern, you have 8 elements per scene but zero visual variety. Each scene should look different at the richness level, not just at the content level.

**Layout diversity.** Adjacent scenes must have perceptibly different layout skeletons (area division + visual weight position). If two scenes share the same skeleton, at least one must differ: area division, focal position, or element roles. See [references/video-composition.md](references/video-composition.md) for the three difference dimensions.
</HARD-GATE>

### In-Scene Phasing Gate

<HARD-GATE>
When a scene spans 2+ blocks from block-timing.json, the visual MUST evolve across those blocks. Dumping all elements at scene start and freezing is a frozen frame — not a video scene.

**Phase structure:**

- A scene spanning N blocks MUST have N visual phases — one per block.
- Phase timing: Phase N elements enter near block N's `startTime` from block-timing.json.
- For each non-background element, you MUST explicitly decide which phase it belongs to. Decision logic: an element enters in the phase whose block it explains or enriches. Body text auto-assigns to its corresponding block's phase; heading and background layers always Phase 1; all other elements require per-element judgment. When uncertain, delay to a later phase.

**Per-phase density:**

- Each phase's visible frame MUST independently satisfy the core spirit of the Visual Density Gate — three layers, focal weight, frame anchoring. No phase should look like a partial version waiting for more.
- Multi-block scenes should have MORE total elements than a single-block scene of equal duration — each phase should have elements unique to it, not just a redistribution of a fixed pool.
- Validation: if you hide Phase 2+ elements, Phase 1's frame must NOT feel hollow.

**Phase-to-phase interaction:**

- Phase transitions MUST show visual interaction, not just accumulation.
- At least one element from an earlier phase MUST transform, respond, or causally connect when a later phase arrives. A phase transition where all earlier elements stay static and only new elements appear is "accretion" — just stacking slides, not evolving a scene.
- Interaction types (pick at least one per transition): **transform** (element changes state/color/shape), **respond** (element shifts, pulses, or reacts), **causal link** (new element extends or connects to an existing one).

**Anti-patterns:**

- **Frozen Frame:** all elements enter at scene start, nothing changes for the entire scene duration.
- **Accretion:** new elements pile on at each phase, but every earlier element stays perfectly static — no visual response to the new content.
- **Thin Phase:** a phase that only has elements withheld from another phase, with nothing unique to itself.

**Single-block exemption:** scenes spanning only 1 block do not require phasing.

**Code example — timing, not element types:**

```js
// WRONG — frozen frame: everything enters at scene start
tl.from(".heading", { y: 40, opacity: 0 }, 0);
tl.from(".body-1", { y: 30, opacity: 0 }, 0.2);
tl.from(".body-2", { y: 30, opacity: 0 }, 0.4);
tl.from(".stamp", { scale: 0, opacity: 0 }, 0.6);
// 10 seconds of frozen frame follows — no visual evolution

// RIGHT — phased: Phase 1 at block-1 startTime, Phase 2 at block-2 startTime
// Phase 1 (block-1, e.g. 5.6s):
tl.from(".heading", { y: 40, opacity: 0 }, 5.6);
tl.from(".body-1", { y: 30, opacity: 0 }, 5.8);
// Phase 2 (block-2, e.g. 10.98s):
tl.from(".body-2", { y: 30, opacity: 0 }, 10.98);
tl.from(".stamp", { scale: 0, opacity: 0 }, 11.1);
// At least one Phase-1 element changes at the phase boundary:
tl.to(".heading", { color: "#FFD700", duration: 0.5 }, 10.98);
```
</HARD-GATE>

## Materials-First Mapping

Before designing any layout, you MUST first map available materials (images, videos) to scenes. This mapping table goes into `expanded-prompt.md` as a section — it is auditable, not a mental step.

**Why:** Without this step, layouts default to CSS-first design with materials as afterthought accents. Materials are the viewer's anchor to reality; CSS/SVG is the abstract layer. Start with the anchor.

### The process

1. **Inventory materials** — read `materials.json`, list every available image and video with its path and description.
2. **Map each scene to materials** — for each scene, decide:
   - Which material is the **primary visual** (occupies the largest area, draws the eye first)?
   - Which materials are **phase visuals** (enter in Phase 2+ to show evolution)?
   - Which materials are **accent visuals** (smaller, supporting)?
   - Write `none` explicitly if a scene genuinely has no fitting material — but justify why.
3. **Gap check** — look at the completed table. Any scene with `none` that has unused materials nearby in theme? Any strong materials (faces, actions, emotional moments) assigned only as accents? Reassign until the table feels complete.
4. **Then proceed to Layout Before Animation** — design the layout around the materials you just mapped, with CSS/SVG as supporting layers.

### Example mapping table

```
| Scene | Primary visual        | Phase visuals              | Accent visuals      |
|-------|-----------------------|----------------------------|---------------------|
| S1    | pexels-7054384 (BG)  | —                          | hexgrid overlay     |
| S2    | pexels-vid-30289540  | pexels-11798250 (P2 swap)  | ghost text          |
| S5    | pexels-5831256       | pexels-7567565 (P2 relief) | ECG wave           |
```

## Layout Before Animation

Position every element where it should be at its **most visible moment** — the frame where it's fully entered, correctly placed, and not yet exiting. Write this as static HTML+CSS first. No GSAP yet.

**Why this matters:** If you position elements at their animated start state (offscreen, scaled to 0, opacity 0) and tween them to where you think they should land, you're guessing the final layout. Overlaps are invisible until the video renders. By building the end state first, you can see and fix layout problems before adding any motion.

### The process

1. **Identify the hero frame** for each scene — the moment when the most elements are simultaneously visible. For multi-block scenes, also identify the sub-hero frame at each phase boundary (when Phase 2+ elements have just entered). The layout must work at every phase, not just the final state. Each phase should have its own visual completeness — no phase should look like a partial version waiting for more.
2. **Write static CSS** for that frame. The `.scene-content` container MUST fill the full scene using `width: 100%; height: 100%; padding: Npx;` with `display: flex; flex-direction: column; gap: Npx; box-sizing: border-box`. Use padding to push content inward — NEVER `position: absolute; top: Npx` on a content container. Absolute-positioned content containers overflow when content is taller than the remaining space. Reserve `position: absolute` for decoratives only.
3. **Add entrances with `gsap.from()`** — animate FROM offscreen/invisible TO the CSS position. The CSS position is the ground truth; the tween describes the journey to get there. (In sub-compositions loaded via `data-composition-src`, prefer `gsap.fromTo()` — see load-bearing GSAP rules in [references/motion-principles.md](references/motion-principles.md).)

<HARD-GATE>
**`gsap.from()` + `opacity: 0` trap:** GSAP `.from({opacity: 0})` tweens FROM the given value TO the element's *current computed value*. If the element's inline style or CSS says `opacity: 0`, the computed value is also 0 — so the tween becomes 0→0 and the element stays invisible forever.

**Rules:**
1. **NEVER set `opacity: 0` in inline styles or CSS on elements that will be animated with `.from({opacity: 0})`.** The element's resting CSS state must be `opacity: 1` (visible) — the `.from()` tween handles making it invisible at the start.
2. If you must hide an element before its entrance, use `gsap.set("#el", {opacity: 1})` in a setup block before building the timeline, OR use `gsap.fromTo()` which is immune to this bug.
3. **Verify after writing:** grep all `.from(` calls, find their target elements, and confirm no target element has `opacity: 0` in its CSS or inline style.
</HARD-GATE>
4. **Add exits with `gsap.to()`** — animate TO offscreen/invisible FROM the CSS position.

### Example

```css
/* scene-content fills the scene, padding positions content */
.scene-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 120px 160px;
  gap: 24px;
  box-sizing: border-box;
}
.title {
  font-size: 120px;
}
.subtitle {
  font-size: 42px;
}
/* Container fills any scene size (1920x1080, 1080x1920, etc).
   Padding positions content. Flex + gap handles spacing. */
```

<HARD-GATE>
**Caption safe zone — bottom padding:** Every composition has captions (mandatory). The bottom of `.scene-content` MUST reserve a safe zone so no content is obscured by captions.

- **Default caption position:** `bottom: 60px`, approximately 60px tall → caption occupies roughly the bottom 60–130px of the frame.
- **Minimum `padding-bottom`:** `200px` on `.scene-content` (or the equivalent container). This gives ~70px clearance above the caption area.
- **Elements using `margin-top: auto`** (pushed to bottom of flex container) land at the `padding-bottom` boundary — verify they are above the caption zone.
- **Absolutely-positioned bottom elements** (e.g., `position: absolute; bottom: Npx`) — `N` must be ≥ `180px` to clear the caption.
</HARD-GATE>

**WRONG — hardcoded dimensions and absolute positioning:**

```css
.scene-content {
  position: absolute;
  top: 200px;
  left: 160px;
  width: 1920px;
  height: 1080px;
  display: flex; /* ... */
}
```

```js
// Step 3: Animate INTO those positions
tl.from(".title", { y: 60, opacity: 0, duration: 0.6, ease: "power3.out" }, 0);
tl.from(".subtitle", { y: 40, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.2);
tl.from(".logo", { scale: 0.8, opacity: 0, duration: 0.4, ease: "power2.out" }, 0.3);

// Step 4: Animate OUT from those positions
tl.to(".title", { y: -40, opacity: 0, duration: 0.4, ease: "power2.in" }, 3);
tl.to(".subtitle", { y: -30, opacity: 0, duration: 0.3, ease: "power2.in" }, 3.1);
tl.to(".logo", { scale: 0.9, opacity: 0, duration: 0.3, ease: "power2.in" }, 3.2);
```

### When elements share space across time

If element A exits before element B enters in the same area, both should have correct CSS positions for their respective hero frames. The timeline ordering guarantees they never visually coexist — but if you skip the layout step, you won't catch the case where they accidentally overlap due to a timing error.

### What counts as intentional overlap

Layered effects (glow behind text, shadow elements, background patterns) and z-stacked designs (card stacks, depth layers) are intentional. The layout step is about catching **unintentional** overlap — two headlines landing on top of each other, a stat covering a label, content bleeding off-frame.

**STEP-GATE 4 — Layout Complete:**
- [ ] Static HTML+CSS written for every scene's hero frame
- [ ] Each scene has ≥8 visual elements (Visual Density Gate)
- [ ] Caption safe zone: `padding-bottom` ≥ 200px (captions are mandatory)
- [ ] Captions exist: every scene has `caption-group` or `.caption` elements synced to block-timing
- [ ] Material paths correct: all `src=` resolve relative to HTML file location
- [ ] No `opacity: 0` in inline styles on `.from()` target elements
- [ ] **No peeking:** did NOT read any other project's `composition/index.html` for layout/animation patterns
- ⛔ **Do not add GSAP animation until layout is verified.**

**STEP-GATE 5 — Animation Complete:**
- [ ] Every element has a `gsap.from()` entrance tween (no element appears fully-formed)
- [ ] Multi-block scenes have phased entrances timed to block-timing (not all at scene start)
- [ ] At least one earlier-phase element transforms/responds at each phase boundary
- [ ] No exit animations except on the final scene (Scene Transitions rule)
- [ ] Opacity gate: grep all `.from(` targets — none have `opacity: 0` in CSS or inline style
- [ ] `window.__timelines` registration present
- ⛔ **Do not proceed to Output Checklist until animation is verified.**

## Data Attributes

### All Clips

| Attribute          | Required                          | Values                                                 |
| ------------------ | --------------------------------- | ------------------------------------------------------ |
| `id`               | Yes                               | Unique identifier                                      |
| `data-start`       | Yes                               | Seconds or clip ID reference (`"el-1"`, `"intro + 2"`) |
| `data-duration`    | Required for img/div/compositions | Seconds. Video/audio defaults to media duration.       |
| `data-track-index` | Yes                               | Integer. Same-track clips cannot overlap.              |
| `data-media-start` | No                                | Trim offset into source (seconds)                      |
| `data-volume`      | No                                | 0-1 (default 1)                                        |

`data-track-index` does **not** affect visual layering — use CSS `z-index`.

### Composition Clips

| Attribute                    | Required | Values                                                            |
| ---------------------------- | -------- | ----------------------------------------------------------------- |
| `data-composition-id`        | Yes      | Unique composition ID                                             |
| `data-start`                 | Yes      | Start time (root composition: use `"0"`)                          |
| `data-duration`              | Yes      | Takes precedence over GSAP timeline duration                      |
| `data-width` / `data-height` | Yes      | Pixel dimensions (1920x1080 or 1080x1920)                         |
| `data-composition-src`       | No       | Path to external HTML file                                        |
| `data-variable-values`       | No       | JSON object of per-instance variable overrides on a sub-comp host |

On the root `<html>` element:

| Attribute                    | Required | Values                                                                                                                         |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `data-composition-variables` | No       | JSON array of declared variables (id/type/label/default) — drives Studio editing UI and provides defaults for `getVariables()` |

## Composition Structure

Sub-compositions loaded via `data-composition-src` use a `<template>` wrapper. **Standalone compositions (the main index.html) do NOT use `<template>`** — they put the `data-composition-id` div directly in `<body>`. Using `<template>` on a standalone file hides all content from the browser and breaks rendering.

Sub-composition structure:

```html
<template id="my-comp-template">
  <div data-composition-id="my-comp" data-width="1920" data-height="1080">
    <!-- content -->
    <style>
      [data-composition-id="my-comp"] {
        /* scoped styles */
      }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      // tweens...
      window.__timelines["my-comp"] = tl;
    </script>
  </div>
</template>
```

Load in root: `<div id="el-1" data-composition-id="my-comp" data-composition-src="compositions/my-comp.html" data-start="0" data-duration="10" data-track-index="1"></div>`

## Variables (Parametrized Compositions)

Render the same composition with different content — title, theme color, prices, captions — without editing the source HTML.

**Three-step pattern:**

1. **Declare** variables on the composition's `<html>` root with `data-composition-variables`. Each entry needs `id`, `type` (one of `string`, `number`, `color`, `boolean`, `enum`), `label`, and `default`. Enum entries also need `options: [{value, label}, ...]`.
2. **Read** the resolved values inside the composition's script with `window.__hyperframes.getVariables()`. Returns the merged result of declared defaults + per-instance overrides + CLI overrides.
3. **Override** at render time with `npx hyperframes render --variables '{...}'` (top-level) or with `data-variable-values='{...}'` on the host element (per-instance for sub-comps).

```html
<!doctype html>
<html
  data-composition-variables='[
  {"id":"title","type":"string","label":"Title","default":"Hello"},
  {"id":"theme","type":"enum","label":"Theme","default":"light","options":[
    {"value":"light","label":"Light"},
    {"value":"dark","label":"Dark"}
  ]}
]'
>
  <body>
    <div data-composition-id="root" data-width="1920" data-height="1080">
      <h1 id="hero" class="clip" data-start="0" data-duration="3"></h1>
      <script>
        const { title, theme } = window.__hyperframes.getVariables();
        document.getElementById("hero").textContent = title;
        document.body.dataset.theme = theme;
      </script>
    </div>
  </body>
</html>
```

```bash
# Dev preview uses declared defaults
npx hyperframes preview

# Render with overrides
npx hyperframes render --variables '{"title":"Q4 Report","theme":"dark"}' --output q4.mp4

# Or from a JSON file
npx hyperframes render --variables-file ./vars.json
```

**Sub-composition per-instance values:** the same `getVariables()` works inside sub-comps loaded via `data-composition-src`. Each host element passes its own values:

```html
<div
  data-composition-id="card-pro"
  data-composition-src="compositions/card.html"
  data-variable-values='{"title":"Pro","price":"$29"}'
></div>
<div
  data-composition-id="card-enterprise"
  data-composition-src="compositions/card.html"
  data-variable-values='{"title":"Enterprise","price":"Custom"}'
></div>
```

The runtime layers each host's `data-variable-values` over the sub-comp's declared defaults on a per-instance basis, so the same source can be embedded multiple times with different content.

**Rules of thumb:**

- Always provide a sensible `default` for every declared variable. Dev preview uses defaults — without them, the composition won't render correctly until `--variables` is provided.
- Read variables once at the top of the script (`const { title } = ...`), not inside frame loops or event handlers — `getVariables()` allocates a fresh object per call.
- Use `--strict-variables` in CI to fail fast on undeclared keys or type mismatches.
- Variable types are validated at render time. `string`, `number`, `boolean`, and `color` (hex string) check `typeof`; `enum` checks the value is in the declared `options`.

## Video and Audio

Video must be `muted playsinline`. Audio is always a separate `<audio>` element:

```html
<video
  id="el-v"
  data-start="0"
  data-duration="30"
  data-track-index="0"
  src="video.mp4"
  muted
  playsinline
></video>
<audio
  id="el-a"
  data-start="0"
  data-duration="30"
  data-track-index="2"
  src="video.mp3"
  data-volume="1"
></audio>
```

<HARD-GATE>
**Material path resolution:** When the composition HTML file is inside a subdirectory (e.g., `composition/index.html`), all material references (`src` on `<video>`, `<img>`, `<audio>`) MUST use paths relative to the HTML file's location — NOT relative to the project root.

- **Directory layout is typically:** `output/<project>/composition/index.html` with materials at `output/<project>/materials/`
- **Correct path from `composition/index.html`:** `src="../materials/videos/foo.mp4"` (go up one level from `composition/` to reach `materials/`)
- **Wrong path:** `src="materials/videos/foo.mp4"` — this looks for `composition/materials/` which doesn't exist
- **Rule:** Before writing any `src` attribute, count the directory levels between the HTML file and the materials directory. Each level down from the common parent requires one `../` prefix.
- **Verify:** After writing the HTML, grep all `src=` attributes and confirm every path resolves correctly relative to the HTML file's location.
</HARD-GATE>

## Timeline Contract

- All timelines start `{ paused: true }` — the player controls playback
- Register every timeline: `window.__timelines["<composition-id>"] = tl`
- Framework auto-nests sub-timelines — do NOT manually add them
- Duration comes from `data-duration`, not from GSAP timeline length
- Never create empty tweens to set duration

## Rules (Non-Negotiable)

**Deterministic:** No `Math.random()`, `Date.now()`, or time-based logic. Use a seeded PRNG if you need pseudo-random values (e.g. mulberry32).

**GSAP:** Only animate visual properties (`opacity`, `x`, `y`, `scale`, `rotation`, `color`, `backgroundColor`, `borderRadius`, transforms). Do NOT animate `visibility`, `display`, or call `video.play()`/`audio.play()`.

**Animation conflicts:** Never animate the same property on the same element from multiple timelines simultaneously.

**No `repeat: -1`:** Infinite-repeat timelines break the capture engine. Calculate the exact repeat count from composition duration: `repeat: Math.ceil(duration / cycleDuration) - 1`.

**Synchronous timeline construction:** Never build timelines inside `async`/`await`, `setTimeout`, or Promises. The capture engine reads `window.__timelines` synchronously after page load. Fonts are embedded by the compiler, so they're available immediately — no need to wait for font loading.

**Never do:**

1. Forget `window.__timelines` registration
2. Use video for audio — always muted video + separate `<audio>`
3. Nest video inside a timed div — use a non-timed wrapper
4. Use `data-layer` (use `data-track-index`) or `data-end` (use `data-duration`)
5. Animate video element dimensions — animate a wrapper div
6. Call play/pause/seek on media — framework owns playback
7. Create a top-level container without `data-composition-id`
8. Use `repeat: -1` on any timeline or tween — always finite repeats
9. Build timelines asynchronously (inside `async`, `setTimeout`, `Promise`)
10. Use `gsap.set()` on clip elements from later scenes — they don't exist in the DOM at page load. Use `tl.set(selector, vars, timePosition)` inside the timeline at or after the clip's `data-start` time instead.
11. Use `<br>` in content text — forced line breaks don't account for actual rendered font width. Text that wraps naturally + a `<br>` produces an extra unwanted break, causing overlap. Let text wrap via `max-width` instead. Exception: short display titles where each word is deliberately on its own line (e.g., "THE\nIMMORTAL\nGAME" at 130px).
12. Dump all scene elements at scene start and freeze. When a scene spans multiple blocks, each block deserves its own visual phase. A scene where every element enters at t=0 and nothing changes for 10+ seconds is a frozen frame, not a video. Equally, adding only new elements without any existing element responding is just stacking slides.

## Scene Transitions (Non-Negotiable)

Every multi-scene composition MUST follow ALL of these rules. Violating any one of them is a broken composition.

1. **ALWAYS use transitions between scenes.** No jump cuts. No exceptions.
2. **ALWAYS use entrance animations on every scene.** Every element animates IN via `gsap.from()`. No element may appear fully-formed. If a scene has 5 elements, it needs 5 entrance tweens.
3. **NEVER use exit animations** except on the final scene. This means: NO `gsap.to()` that animates opacity to 0, y offscreen, scale to 0, or any other "out" animation before a transition fires. The transition IS the exit. The outgoing scene's content MUST be fully visible at the moment the transition starts.
4. **Final scene only:** The last scene may fade elements out (e.g., fade to black). This is the ONLY scene where `gsap.to(..., { opacity: 0 })` is allowed.

**WRONG — exit animation before transition:**

```js
// BANNED — this empties the scene before the transition can use it
tl.to("#s1-title", { opacity: 0, y: -40, duration: 0.4 }, 6.5);
tl.to("#s1-subtitle", { opacity: 0, duration: 0.3 }, 6.7);
// transition fires on empty frame
```

**RIGHT — entrance only, transition handles exit:**

```js
// Scene 1 entrance animations
tl.from("#s1-title", { y: 50, opacity: 0, duration: 0.7, ease: "power3.out" }, 0.3);
tl.from("#s1-subtitle", { y: 30, opacity: 0, duration: 0.5, ease: "power2.out" }, 0.6);
// NO exit tweens — transition at 7.2s handles the scene change
// Scene 2 entrance animations
tl.from("#s2-heading", { x: -40, opacity: 0, duration: 0.6, ease: "expo.out" }, 8.0);
```

## Animation Guardrails

- Offset first animation 0.1-0.3s (not t=0)
- Vary eases across entrance tweens — use at least 3 different eases per scene
- Don't repeat an entrance pattern within a scene
- Avoid full-screen linear gradients on dark backgrounds (H.264 banding — use radial or solid + localized glow)
- 60px+ headlines, 20px+ body, 16px+ data labels for rendered video
- `font-variant-numeric: tabular-nums` on number columns

If no `design.md` exists, follow [house-style.md](./house-style.md) for aesthetic defaults.

## Typography and Assets

- **Built-in fonts:** Write the `font-family` you want in CSS — the compiler embeds supported fonts automatically.
- **Custom fonts:** If design.md names a font that isn't built-in, the user must provide `.woff2` files in a `fonts/` directory. If missing, warn before writing HTML. When files exist, add `@font-face` declarations pointing to the local files.
- Add `crossorigin="anonymous"` to external media
- For dynamic text overflow, use `window.__hyperframes.fitTextFontSize(text, { maxWidth, fontFamily, fontWeight })`
- All files live at the project root alongside `index.html`; sub-compositions use `../`

## Editing Existing Compositions

- **Read actual files, don't guess.** When editing, extending, or creating companion compositions, read the existing source. Don't reconstruct hex codes from memory. Don't guess GSAP easing patterns. The composition IS the spec — extract exact values from it.
- Match existing fonts, colors, animation patterns from what you read
- Only change what was requested
- Preserve timing of unrelated clips

## Output Checklist

**Fast (run immediately, block on results):**

- [ ] `npx hyperframes lint` and `npx hyperframes validate` both pass
- [ ] Design adherence verified if design.md exists
- [ ] In-scene phasing verified: every scene spanning 2+ blocks has phased entrances with at least one existing element visually responding at each phase boundary
- [ ] **Opacity gate:** No element with `.from({opacity: 0})` has `opacity: 0` in inline style or CSS. Grep all `.from(` targets and verify their resting state is `opacity: 1` (or use `.fromTo()` instead).
- [ ] **Font loading gate:** Every non-system font in the composition has either a Google Fonts `<link>` in `<head>` or a local `.woff2` with `@font-face`. Headless rendering will fall back to system fonts otherwise.
- [ ] **Material path gate:** All `src=` attributes resolve correctly relative to the HTML file's directory. If HTML is in `composition/index.html` and materials are in `../materials/`, every path must include the `../` prefix.
- [ ] **Caption gate:** Every scene has captions (`caption-group` or `.caption`) synced to block-timing. No scene without captions.
- [ ] **Caption safe zone gate:** `padding-bottom` on `.scene-content` is ≥ 200px. Absolutely-positioned bottom elements use `bottom: ≥ 180px`.

**Slow (run in parallel while presenting the preview to the user):**

- [ ] `npx hyperframes inspect` passes, or every reported overflow is intentionally marked
- [ ] Contrast warnings addressed (see Quality Checks below)
- [ ] Animation choreography verified (see Quality Checks below)

**STEP-GATE 6 — Output Checklist Complete:**
- [ ] `npx hyperframes lint` passes
- [ ] `npx hyperframes validate` passes
- [ ] All fast checklist items above are checked
- [ ] All STEP-GATE 1–5 items are verified (no shortcuts taken)
- ⛔ **Composition is not "done" until this gate passes. If any item fails, fix it and re-run.**

## Quality Checks

### Visual Inspect

`hyperframes inspect` runs the composition in headless Chrome, seeks through the timeline, and maps visual layout issues with timestamps, selectors, bounding boxes, and fix hints. Run it after `lint` and `validate`:

```bash
npx hyperframes inspect
npx hyperframes inspect --json
```

Failures usually mean text is spilling out of a bubble/card, a fixed-size label is clipping dynamic copy, or text has moved off the canvas. Fix by increasing container size or padding, reducing font size or letter spacing, adding a real `max-width` so text wraps inside the container, or using `window.__hyperframes.fitTextFontSize(...)` for dynamic copy.

Use `--samples 15` for dense videos and `--at 1.5,4,7.25` for specific hero frames. Repeated static issues are collapsed by default to avoid flooding agent context. If overflow is intentional for an entrance/exit animation, mark the element or ancestor with `data-layout-allow-overflow`. If a decorative element should never be audited, mark it with `data-layout-ignore`.

### Contrast

`hyperframes validate` runs a WCAG contrast audit by default. It seeks to 5 timestamps, screenshots the page, samples background pixels behind every text element, and computes contrast ratios. Failures appear as warnings:

```
⚠ WCAG AA contrast warnings (3):
  · .subtitle "secondary text" — 2.67:1 (need 4.5:1, t=5.3s)
```

If warnings appear:

- On dark backgrounds: brighten the failing color until it clears 4.5:1 (normal text) or 3:1 (large text, 24px+ or 19px+ bold)
- On light backgrounds: darken it
- Stay within the palette family — don't invent a new color, adjust the existing one
- Re-run `hyperframes validate` until clean

Use `--no-contrast` to skip if iterating rapidly and you'll check later.

### Design Adherence

If a `design.md` exists, verify the composition follows it after authoring. Read the HTML and check:

1. **Colors** — every hex value in the composition appears in design.md's palette section
2. **Typography** — font families and weights match design.md's type spec
3. **Corners** — border-radius values match the declared corner style
4. **Spacing** — padding and gap values fall within the declared density range
5. **Depth** — shadow usage matches the declared depth level
6. **Avoidance rules** — verify none of the declared anti-patterns are present

Report violations as a checklist. Fix each one before serving.

If no `design.md` exists (house-style-only path), verify:

1. **Palette consistency** — the same bg, fg, and accent colors are used across all scenes. No per-scene color invention.
2. **No lazy defaults** — check against house-style.md's "Lazy Defaults to Question" list.

### Animation Map

After authoring animations, run the animation map to verify choreography:

```bash
node skills/hyperframes/scripts/animation-map.mjs <composition-dir> \
  --out <composition-dir>/.hyperframes/anim-map
```

Outputs a single `animation-map.json` with:

- **Per-tween summaries**: `"#card1 animates opacity+y over 0.50s. moves 23px up. fades in. ends at (120, 200)"`
- **ASCII timeline**: Gantt chart of all tweens across the composition duration
- **Stagger detection**: reports actual intervals (`"3 elements stagger at 120ms"`)
- **Dead zones**: periods over 1s with no animation — intentional hold or missing entrance?
- **Phase compliance**: for each multi-block scene, verify that (1) Phase 2+ elements enter near their block startTime, not all at scene start, and (2) at least one earlier element has a visual change at the phase boundary
- **Element lifecycles**: first/last animation time, final visibility
- **Scene snapshots**: visible element state at 5 key timestamps
- **Flags**: `offscreen`, `collision`, `invisible`, `paced-fast` (under 0.2s), `paced-slow` (over 2s)

Read the JSON. Scan summaries for anything unexpected. Check every flag — fix or justify. Verify the timeline shows the intended choreography rhythm. Re-run after fixes.

Skip on small edits (fixing a color, adjusting one duration). Run on new compositions and significant animation changes.

---

## References (loaded on demand)

- **[references/captions.md](references/captions.md)** — Captions, subtitles, lyrics, karaoke synced to audio. Tone-adaptive style detection, per-word styling, text overflow prevention, caption exit guarantees, word grouping. Read when adding any text synced to audio timing.
- **[references/audio-reactive.md](references/audio-reactive.md)** — Audio-reactive animation: map frequency bands and amplitude to GSAP properties. Read when visuals should respond to music, voice, or sound.
- **[references/css-patterns.md](references/css-patterns.md)** — CSS+GSAP marker highlighting: highlight, circle, burst, scribble, sketchout. Deterministic, fully seekable. Read when adding visual emphasis to text.
- **[references/video-composition.md](references/video-composition.md)** — Video-medium rules: density, color presence, scale, frame composition, design.md as brand not layout. **Always read** — these override web instincts.
- **[references/beat-direction.md](references/beat-direction.md)** — Beat planning: concept, mood, choreography verbs, rhythm templates, transition decisions, depth layers. **Always read for multi-scene compositions.**
- **[references/typography.md](references/typography.md)** — Typography: font pairing, OpenType features, dark-background adjustments, font discovery script. **Always read** — every composition has text.
- **[references/media-selection.md](references/media-selection.md)** — Media selection: when to use video, image, vector, or CSS/SVG. Two-dimension decision (visual style × content nature). Read before designing scene visuals.
- **[references/motion-principles.md](references/motion-principles.md)** — Motion design principles, image motion treatment, load-bearing GSAP rules. **Always read** — every composition has motion.
- **[references/techniques.md](references/techniques.md)** — 11 visual techniques with code patterns: SVG drawing, Canvas 2D, CSS 3D, kinetic type, Lottie, video compositing, typing effect, variable fonts, MotionPath, velocity transitions, audio-reactive. Read when planning techniques per beat.
- **[references/narration.md](references/narration.md)** — Pacing, tone, script structure, number pronunciation, opening line patterns. Read when the composition includes voiceover or TTS.
- **[references/design-picker.md](references/design-picker.md)** — Create a design.md via visual picker. Read when no design.md exists and the user wants to create one.
- **[references/tts.md](references/tts.md)** — Text-to-speech with Kokoro-82M. Voice selection, speed tuning, TTS+captions workflow. Read when generating narration or voiceover.
- **[references/dynamic-techniques.md](references/dynamic-techniques.md)** — Dynamic caption animation techniques (karaoke, clip-path, slam, scatter, elastic, 3D).
- **[visual-styles.md](visual-styles.md)** — 8 named visual styles with hex palettes, GSAP easing signatures, and shader pairings. Read when user names a style or when generating design.md.
- **[house-style.md](house-style.md)** — Default motion, sizing, and color palettes when no design.md is specified.
- **[patterns.md](patterns.md)** — PiP, title cards, slide show patterns.
- **[data-in-motion.md](data-in-motion.md)** — Data, stats, and infographic patterns.
- **[references/transcript-guide.md](references/transcript-guide.md)** — Caption-side transcript handling: input formats, mandatory quality check, cleaning JS, OpenAI/Groq API fallback.
- **[references/transitions.md](references/transitions.md)** — Scene transitions: crossfades, wipes, reveals, shader transitions. Energy/mood selection, CSS vs WebGL guidance. **Always read for multi-scene compositions** — scenes without transitions feel like jump cuts.
  - [transitions/catalog.md](references/transitions/catalog.md) — Hard rules, scene template, and routing to per-type implementation code.
  - Shader transitions are in `@hyperframes/shader-transitions` (`packages/shader-transitions/`) — read package source, not skill files.

GSAP patterns and effects are in the `/gsap` skill.

## Completion Prompt

After Step 6 Output Checklist fully passes, inform the user:

```
✅ Composition generated successfully! All checks passed.

Next:
  If AI image generation is needed → /image-gen
  If ready → /render to render the output video

💡 For additional layout validation (element overlap, scene diversity), run /check (optional)
```

If a `material-requests.json` was generated, use this prompt instead:

```
✅ Composition generated successfully! Detected material-requests.json — some materials need to be supplemented.

Next:
  /material — supplement materials (round 2)
  then → /image-gen or /render
```
