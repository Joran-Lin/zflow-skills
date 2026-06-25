---
name: check
description: >
  Detects layout issues in the HTML composition. Checks for element
  position overlaps, viewport overflow, and content clipping to catch
  all display anomalies before rendering.
version: 1.0.0
---

<HARD-RULE>
**No cross-project peek:** When working on project X (`output/X/`), NEVER read files from `output/<other-project>/`. Only read `output/X/**` and this skill's own files. Reading other projects' generated outputs causes style convergence.
</HARD-RULE>

# Layout Validation

Detects three categories of layout issues in the composition HTML.

**Pre-flight:** Run `node scripts/check-env.mjs` before first use to ensure Chrome and `puppeteer-core` are installed.

## When to Use

- After `/hyperframes` generates the HTML, before rendering the video
- After manually editing the HTML layout, to verify no new issues were introduced
- As a regression test after modifying skill templates

## Detected Issues

### 1. Element Overlap
Elements overlap by more than 5% of their area.

### 2. Viewport Overflow
Elements extend beyond the scene boundary (1080×1920) and get clipped. Overflow is checked in all four directions.

### 3. Content Clipped
A container with `overflow: hidden` whose child content's actual size exceeds the container's visible area.
For example, a `max-height` constraint truncating the bottom rows of a bar chart.

### 4. Caption Zone Intrusion
The bottom of a non-caption element intrudes into the caption safe zone (200px upward from the bottom of the scene). Captions must remain clearly visible; no content element may overlap the caption.

### 5. Excessive Gap
Vertical spacing between adjacent content elements exceeds 150px. Excessive spacing indicates wasted layout space — add content between elements or reduce the spacing.

### 6. Scene Diversity
Checked across scenes:
- 2 consecutive scenes use the exact same layout structure
- The same component type (e.g. gauge-ring) appears in more than 3 scenes

## How It Works

1. Open the composition HTML with Puppeteer
2. For each scene, force every content element to `opacity: 1`
3. Collect each content element's `getBoundingClientRect()`
4. Detect:
   - Pairwise rectangle overlap (skipping ancestor/descendant pairs, decorative elements, and full-screen backgrounds)
   - Whether elements exceed the scene viewport
   - Mismatch between `scrollHeight` and `clientHeight` on `overflow: hidden` elements
5. Categorize and report all issues

**Why checking once at the end of each scene is enough:**
The hyperframes spec forbids in-scene exit animations (rule #3); elements only animate IN, never OUT.
Therefore the end of a scene is the "worst case" where all elements are simultaneously visible — no new conflicts can emerge after elements disappear.

## Invocation

```bash
# Validate a specific composition directory
node skills/check/scripts/check-layout.mjs output/<project>/composition/

# Or point directly at the HTML file
node skills/check/scripts/check-layout.mjs output/<project>/composition/index.html
```

Requires `puppeteer-core` (install globally: `npm install -g puppeteer-core`).

## Output

```
✓ No layout issues detected (no overlaps, no clipping, no viewport overflow)
```

Or:

```
✗ Found 3 layout issue(s):

  ── Overlaps (1) ──
  [s2] chart-diversify ↔ s2-badges
    Overlap: 960x12 (2.7% of smaller element)
    chart-diversify: left=60 top=1200 960x442
    s2-badges: left=80 top=1640 460x70

  ── Content Clipped (2) ──
  [s2] chart-diversify has overflow:hidden, 71px hidden vertically
    Visible: 960x380, Content: 960x451

  [s3] chart-compound has overflow:hidden, 139px hidden vertically
    Visible: 960x380, Content: 960x519

  ...
```

## Skipped Elements

| Type | Reason |
|------|--------|
| `.glow` | Decorative glow effect |
| `.scan-line` | Decorative scan line |
| `.data-rain` | Decorative particles |
| `.caption-group` | Caption layer (z-index: 100, intentional overlay) |
| Full-screen background image | img-slot covering >80% of the scene |

## Positioning

**Optional step.** The hyperframes Output Checklist (Step 6) already includes basic checks for overflow, clipping, and the caption safe zone. This skill provides additional deep validation: element overlap detection, vertical gap analysis, and cross-scene diversity review. Use as needed.

## Completion Prompt

After validation passes, inform the user:

```
✅ Layout validation passed! All elements are positioned correctly.

Next:
  If you need AI-generated images → /image-gen
  If ready → /render to render the output video
```

If validation fails, fix the issues and re-run `/check` until it passes.

## Position in the Pipeline

```
/hyperframes → generates HTML
     ↓
/image-gen or /render (default path)
     ↑
/check → optional deep validation (as needed)
```
