<!-- Derived from heygen-com/hyperframes (Apache-2.0), commit e59089bf. Modified by zflow-skills (Min Li, Zhuoran Lin). -->

# Video Composition

Video frames are not web pages. These rules apply to every composition regardless of brand, style, or design.md.

## design.md Is Brand, Not Layout

design.md defines what the brand looks like: colors, fonts, personality, constraints. It does NOT define how to compose a video frame. Use brand colors at video-appropriate intensity — not at web-UI opacity.

**Strict from design.md:** hex values (including background color), font families, weight relationships, Do's and Don'ts. If the user chose a light canvas, use a light canvas. If they chose dark, use dark. Do not override their palette.

**Adapt for video:** type sizes, spacing, decorative opacity, border weight, component treatments. A web UI card at `border: 1px solid #e2e3e6` with `box-shadow: 0 2px 4px rgba(0,0,0,0.06)` is invisible on video. The brand color is sacred; the application is yours.

## Density

A beat with 3 elements looks empty. A beat with 8-10 feels alive — **but only if those elements carry visual weight.**

### Element count is necessary but insufficient

8 thin elements = 1 rich element. Counting elements is the floor, not the ceiling:

```
BAD  (8 elements, zero visual weight):
  ghost number at 3%    → invisible
  radial glow           → just background color
  hairline accent rule  → a single pixel
  mono label 16px       → decorative metadata
  heading               → content
  body text             → content
  image (small, right)  → the ONE thing to look at
  accent dot            → a dot

GOOD (8 elements, high visual weight):
  flowing particle field (CSS/SVG) → the background IS the atmosphere
  duotone-treated image at 50% frame  → you can't miss it
  hero stat at 120px+                   → dominates the frame
  data stream bars with live pulse      → animated, data-rich
  heading in display font               → weighted typography
  body text on dark surface panel       → readable + framed
  grid overlay at 12% opacity           → texture, not flat
  corner registration marks + mono tag → produced feel
```

### Three richness dimensions

Every scene must satisfy ALL THREE — not just element count:

1. **Background richness** — the background must have texture AND atmosphere, not just a color + glow. Options (pick 2+ per scene):
   - Particle field / flowing dots / drifting grid (CSS or SVG animated)
   - Noise grain overlay (even subtle — it prevents banding)
   - Geometric pattern (hex grid, circuit traces, data stream lines)
   - Gradient mesh (multiple overlapping radial/linear gradients, not one flat glow)
   - Video at 40%+ opacity with treatment (duotone, color grade, hue shift)
   - Oversized type as texture (ghost numbers at 12-25%, not 3-5%)

2. **Focal weight** — at least one element must DOMINATE the frame. "Heading + body text + small image" has no focal weight. Options (pick 1-2 per scene):
   - Hero stat/number at 100-200px (the entire frame orbits around it)
   - Full-frame or half-frame image/video with treatment
   - CSS/SVG data visualization that fills 30%+ of the frame
   - Kinetic typography (oversized animated text)
   - Split-frame with equal-weight sides (not just a small image in the corner)

3. **Foreground detail** — the "produced, not generated" layer. Options (pick 2+ per scene):
   - Structural elements: dividers, border panels, accent rules, corner brackets
   - Data labels: monospace metadata, coordinates, timestamps, category tags
   - Registration marks, crop marks, corner indicators
   - Small data bars, sparklines, progress indicators
   - Status dots, pulsing indicators, connection nodes

### Non-Text Dominance (fourth dimension)

Video is a visual medium. When body-text mirrors what the narrator is already saying, it's redundant — captions already carry narration. The frame must communicate through visuals, not duplicate audio as text.

**Core rules:**

1. **Every scene's visual area must be ≥60% non-text visual elements** — data cards, hero stats, progress bars, comparison charts, icon rows, SVG diagrams, gradient blocks, decorative patterns, treated images/videos. body-text is supplementary-only.
2. **Narration-mirror body-text is banned.** If a sentence appears in both captions and body-text, the body-text MUST be replaced by a non-text visual element. Acceptable replacements: stat pills, progress bars, tier comparison rows, icon-label grids, breakdown charts, tag badges, data bars.
3. **Acceptable text in scenes:** heading/title (1), labels/tags (2-3), data values in stat cards (unlimited), caption (1, handled by framework). Everything else should be a visual element.
4. **Anti-pattern: the paragraph scene.** A scene where the main visual element is a paragraph of body-text that restates the narration is a web page, not a video frame. Replace with structured data visuals.

### Information Density (fifth dimension)

Decoration provides atmosphere; information provides substance. Both are required. A scene with 10 decorative elements but zero information is visually rich but substantively empty.

**Core rules:**

1. **At least 3 of the 8+ visual elements must be information-carrying** — elements that convey specific data, concepts, comparisons, or narrative content, not just atmosphere or decoration.
   - Information-carrying: hero stats, data cards, progress bars, comparison bars, tier indicators, breakdown charts, icon-label pairs with values, category tags with data, trend arrows, causal diagrams
   - Pure decoration: particle fields, grain overlays, registration marks, accent rules, ghost type, gradient blocks (unless encoding data like heat maps)
2. **Narration-visual mapping:** Every key data point, proper noun, or conceptual claim in the narration MUST have a corresponding visual element on screen. If the narrator says "60岁以上人口3亿", the frame must show "3亿" as a stat card or data bar — not rely on the caption alone. Captions are accessibility; the visual IS the content.
3. **Scene information ceiling:** No more than 5 independent information points per scene. Beyond 5, the viewer can't absorb them in a single pass — split into phases or scenes.

### Temporal richness (sixth dimension)

A scene's visual density must be rich not just in space but in time. When a scene spans multiple narration blocks, the frame MUST evolve — a static frame for 10+ seconds is a slide, not a video scene.

**Core rules:**

1. Each block within a multi-block scene triggers a visual phase. Phase 2+ elements enter near their block's `startTime` from `block-timing.json`. A scene where every element enters at t=0 and nothing changes is a **frozen frame** — a critical anti-pattern.
2. Each phase's visible frame must satisfy the density gate's core spirit independently — three layers, focal weight, frame anchoring. If Phase 2 elements are hidden, Phase 1 must NOT look hollow.
3. At least one element from an earlier phase MUST visually respond when a later phase arrives (transform, shift, pulse, change state). Phase transitions where all earlier elements stay static and only new elements appear are **accretion** — just stacking slides, not evolving a scene.

**Quantified anti-pattern:** If more than 70% of a multi-block scene's non-background elements enter in Phase 1 with no subsequent visual change, it's a frozen frame regardless of how many elements it has.

### The frame coverage test

After designing a scene, squint at the frame. If more than 30% of the frame is "just background color," the scene is too thin. The eye should land on something interesting everywhere it looks — not just in one corner.

### Anti-pattern: the thin template

The most common failure mode is a formulaic 3-layer template applied identically to every scene:

```
BG: solid color + one glow + ghost number at 3%
MG: heading + body + image (small, right-aligned)
FG: hairline accent rule + mono label
```

This scores 8 elements but fails all three richness dimensions:
- Background: one glow is not texture — it's a colored spot
- Focal: the image is small, the heading is standard — nothing dominates
- Foreground: a hairline and a label add detail but not weight

**Every scene should look different at the richness level, not just at the content level.**

### Layout Diversity

当多个场景使用相同的布局骨架（相同的区域划分、相同的元素位置、相同的视觉重心）时，即使内容不同，观众也会觉得"每个画面都一样"。

**核心原则：相邻场景的布局骨架应该有可感知的差异。**

"布局骨架"指区域划分方式 + 视觉重心位置。两个场景如果区域划分和重心都一样，即使文字不同，观众也会觉得"又是这个排版"。

**差异维度（相邻场景至少满足一个）：**
- **区域划分不同**：从左右分变为上下分，从单区域变为双区域，从居中变为偏左
- **视觉重心位置不同**：从左侧大数字变为右侧图表，从顶部标题变为底部数据条
- **元素角色不同**：同一个左重右轻结构，左侧从大数字变为流程图，右侧从说明文字变为对比数据

**连续使用同种布局时**，必须通过重心偏移、元素类型变化或视觉处理变化制造差异。

## Color Presence

Muted is fine. Flat is not. Every scene should have at least one color that pulls the eye.

- Brand accent should be VISIBLE — not a 5% opacity glow lost in compression. 15-25% for atmospheric, full saturation for focal elements.
- **Light canvases work differently than dark.** On dark: accent glows pop naturally. On light: use bolder borders (2px+ solid), stronger structural elements (rules, dividers), and full-saturation accent hits. Light backgrounds need texture (subtle grain, patterns) to avoid the "blank slide" feel. Don't switch to dark — make light cinematic.
- Tint neutrals toward the brand hue. Dead gray reads as undesigned.

## Scale

Web sizes are invisible on video. Everything scales up.

| Element            | Web     | Video    |
| ------------------ | ------- | -------- |
| Headlines          | 32-48px | 64-120px |
| Body text          | 14-16px | 28-42px  |
| Labels             | 12px    | 18-24px  |
| Decorative opacity | 3-8%    | 12-25%   |
| Borders            | 1px     | 2-4px    |
| Padding            | 16-32px | 60-140px |

If you're writing a font-size under 24px in a video composition, justify it. If you're writing decorative opacity under 10%, it's invisible.

## Motion Intensity

Subtle reads as static at 30fps. Err toward more movement than feels safe.

- Every decorative element should have ambient motion: breathe, drift, pulse, orbit. Static decoratives feel dead.
- Vary motion per scene — don't repeat the same ambient pattern.
- Scene entrances should use 3+ different eases and directions. If every element enters from `y: 30, opacity: 0`, the scene has no choreography.

## Frame Composition

- **Two focal points minimum.** The eye needs somewhere to travel.
- **Fill the frame.** Hero text: 60-80% of frame width.
- **Anchor to edges.** Pin content to left/top or right/bottom. Centered-and-floating is a web layout pattern.
- **Split frames.** Data panel left, content right. Top bar with metadata, full-width below. Zone-based layouts over centered stacks.
- **Structural elements.** Rules, dividers, border panels. They create visual paths and animate well (`scaleX: 0` → `1`).
