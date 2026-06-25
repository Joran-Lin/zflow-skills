<!-- Derived from heygen-com/hyperframes (Apache-2.0), commit e59089bf. Modified by zflow-skills (Min Li, Zhuoran Lin). -->

# Data in Motion

Guidance for data, stats, and non-text visual elements in video compositions. The [house style](./house-style.md) handles aesthetics — this addresses data-specific design quality and anti-patterns.

## Visual Continuity

When successive stats belong to the same concept (Q1 → Q2 → Q3 → Q4, or three metrics for the same product), keep them in the same visual space with the same aesthetic. Only the VALUE changes. An aesthetic change should signal a new concept, not just a new number.

## Numbers Need Visual Weight

A number on its own floats in empty space. Pair every metric with a visual element that gives it presence — a proportional fill bar, a background color shift, a shape that represents the value, a progress ring. The visual doesn't need to be a chart — it just needs to fill the frame and make the data feel tangible rather than just text on a background.

## Non-Text Element Quality Gate

Every non-text visual element (stat card, progress bar, comparison chart, tier indicator, icon-label pair, tag badge, etc.) must satisfy ALL THREE quality criteria. If it fails any one, it's a web UI component — not a video element.

### 1. Visual Gravity

The element must command attention — not merely be visible, but be impossible to ignore. A stat at 18px with a thin border is a label, not a focal point. Size, brightness, saturation, or contrast must make the eye land on it.

**Fails:** you notice it only after scanning the whole frame. **Passes:** it's one of the first things you see.

### 2. Atmosphere Integration

The element must belong to its scene's visual world — it should look like it was born there, not copy-pasted from a component library. Dark/cinematic scenes use glow, gradient fills, luminous edges. Light/editorial scenes use borders, shadows, color blocks, paper textures. The element's visual language (corners, depth, motion style) must match the scene's design.md or house-style aesthetic.

**Fails:** looks like a Bootstrap card floating in a cinematic frame. **Passes:** same design DNA as the background, headings, and decoratives.

### 3. Data Narrative

The element must tell a data story — not display a naked number. A "3" with no context is meaningless. Every data element needs at minimum: the value + its unit or scale + context (trend arrow, comparison baseline, category label, rank/position). The viewer should understand the data point without hearing the narration.

**Fails:** "3亿" alone. **Passes:** "3亿 ↑12%" or "3亿 / 60岁以上" or a bar showing 3亿 vs 2亿 last year.

## Quality Gradient: BAD → OK → GOOD

Use this to calibrate. Your elements should land at GOOD. OK is acceptable for secondary information. BAD fails the quality gate.

### Hero Stat

- **BAD:** number in default font, thin border, no unit, no motion, no background treatment
- **OK:** large number, accent background, unit visible, simple entrance animation
- **GOOD:** commands the frame at a glance, enters with momentum (scale-bounce, count-up, or slam), breathes or pulses with scene rhythm, carries trend context (↑↓→), atmosphere-matched (glow on dark, shadow on light, gradient fill in both)

### Stat Pill / Data Card

- **BAD:** 1px border, flat fill, number only, looks like a web UI badge
- **OK:** rounded, accent-tinted background, number + unit, slide-in entrance
- **GOOD:** integrated with scene atmosphere (frosted glass on dark, warm shadow on light), enters with stagger timing relative to siblings, subtle ambient motion (breathing scale or soft glow pulse), sized to be read without squinting

### Progress Bar / Fill Bar

- **BAD:** flat solid fill, sharp edge, static width, no label
- **OK:** gradient fill, rounded end, label with value, width animates in
- **GOOD:** end-glow pulses with data heartbeat, fills with a GSAP ease that feels intentional (ease-out for "approaching target", ease-in for "accelerating growth"), background track has texture matching scene grain, value label counts up in sync with fill

### Comparison Bar / Dual Bar

- **BAD:** two plain divs side by side, same height, different colors, no labels
- **OK:** color-coded bars with labels and values, staggered entrance
- **GOOD:** winner and loser are visually distinct (winner pulses or glows, loser dims or recedes), bars grow with staggered timing that tells the comparison story, the gap between them IS the visual point — not just two shapes

### Tier / Status Row

- **BAD:** plain text list with ✓/✗ symbols, same size, same color
- **OK:** rows with status icons, color-coded (green/red/gray), slide-in
- **GOOD:** each tier has distinct visual weight (available = bold and saturated, limited = muted, unavailable = dimmed with strikethrough or dashed border), rows reveal in sequence to build the narrative, the visual hierarchy mirrors the service hierarchy

### Breakdown / Stacked Bar

- **BAD:** flat-colored segments stacked in a bar, no labels
- **OK:** distinct segment colors, labels overlay, segments animate in
- **GOOD:** segment boundaries have subtle glow or highlight, each segment enters with a slight stagger, the dominant segment visually dominates (not just proportionally wider but also brighter or more saturated), total value anchors one end

### Tag Badge / Category Label

- **BAD:** rounded rectangle with text, thin border, flat fill
- **OK:** pill shape, accent-tinted fill, clean entrance
- **GOOD:** gradient or semi-transparent fill matching scene atmosphere, border or glow that ties it to the element it labels, entrance animation that connects it to its parent element (follows parent in with 0.1-0.2s delay)

## Avoid Web Patterns

- **No pie charts** — hard to compare, looks like PowerPoint
- **No multi-axis charts** — viewer can't study intersections in a 3-second window
- **No 6-panel dashboards** — 2-3 related metrics side-by-side is fine, 6+ is a web pattern
- **No gridlines, tick marks, or legends** — visual noise that adds nothing in motion
- **No chart library output** — build with GSAP + SVG/CSS, not D3 or Chart.js
- **No raw component-library aesthetics** — if your stat card could be from Bootstrap, Tailwind UI, or Material Design, it hasn't been adapted for video. Video elements need more size, more motion, more atmosphere
