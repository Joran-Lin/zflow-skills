<!-- SPDX-License-Identifier: Apache-2.0. Copyright (c) 2026 Min Li, Zhuoran Lin <zhuoran.lin@z.ai>. Original work of zflow-skills (not derived from upstream). -->

# <schematic-callout> Structure Breakdown Callout Annotation

## Effect Description

The center of the frame displays a core subject image (a satellite, a heart, a credit card, a rocket, etc.) against a dark-toned background with a slow Ken Burns push-in effect applied. After the subject image fades in, multiple callout lines extend outward from the image's center or anchor point, simulating a laser-scanning draw animation (via SVG strokeDashoffset). Each line ends with a label marker that pops out one after another with a bouncing scale effect. The overall result is a tech-flavored structural breakdown visual.

Visual element stacking order (bottom to top):
1. **Dark background layer** — solid color + faint radial glow
2. **Subject image layer** — Ken Burns fade-in + slow zoom-in
3. **SVG callout line layer** — glowing lines "drawn" outward from the anchor point
4. **Marker label layer** — numbered dots at line ends + text labels that bounce into view
5. **Decoration layer** — fine grid, corner L-shaped frame lines, scanline texture (optional)

## Applicable Scenarios

- Structural analysis of objects in popular-science videos (satellites, engines, human organs, building cross-sections)
- Product teardown and component annotation (phones, chips, mechanical devices)
- Highlighting on flowcharts / architecture diagrams
- Any narrative scenario that needs "one image + multiple callout labels"

This component should be preferred when the script contains the following keywords:
- "breakdown", "structure", "parts", "composition", "interior", "cross-section"
- "annotation", "label", "arrow pointing"
- "composed of ...", "contains the following components"

## AI Input Interface

```json
{
  "bgImage": "scene-003.png",
  "markers": [
    { "x": 200, "y": 300, "label": "Solar Panels" },
    { "x": 500, "y": 600, "label": "High-Gain Antenna" },
    { "x": 800, "y": 250, "label": "Thermal Control System" }
  ]
}
```

Field reference:
| Field | Type | Description |
|------|------|------|
| `bgImage` | string | Subject image filename, placed in the project root directory |
| `markers` | array | Marker-point array; minimum 1, recommended no more than 8 |
| `markers[].x` | number | X coordinate of the marker point on the 1920x1080 canvas |
| `markers[].y` | number | Y coordinate of the marker point on the 1920x1080 canvas |
| `markers[].label` | string | Label text; recommended no more than 8 Chinese characters |

The lines originate from the canvas center (960, 540) and extend toward each marker point. If the subject is shifted left/right, the convergence point can be adjusted via `lineOriginX` / `lineOriginY`.

Optional fields:
```json
{
  "lineOriginX": 960,
  "lineOriginY": 540,
  "lineColor": "#c8a45c",
  "labelBgColor": "rgba(7, 9, 15, 0.85)",
  "kenBurnsScale": 1.08
}
```

## Complete Code

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Schematic Callout</title>
<style>
  :root {
    --bg-dark: #07090f;
    --accent-gold: #c8a45c;
    --accent-gold-dim: rgba(200, 164, 92, 0.3);
    --accent-gold-glow: rgba(200, 164, 92, 0.15);
    --text-primary: #e8e6e1;
    --text-dim: rgba(232, 230, 225, 0.6);
    --label-bg: rgba(7, 9, 15, 0.85);
    --label-border: rgba(200, 164, 92, 0.4);
    --grid-color: rgba(200, 164, 92, 0.04);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  [data-composition-id="schematic-callout"] {
    width: 1920px;
    height: 1080px;
    position: relative;
    overflow: hidden;
    background: var(--bg-dark);
    font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  }

  /* ---- Background layer ---- */
  .sc-bg {
    position: absolute;
    inset: 0;
    background: var(--bg-dark);
  }

  .sc-bg-radial {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse 60% 50% at 50% 50%,
      rgba(200, 164, 92, 0.06) 0%,
      transparent 70%
    );
  }

  /* ---- Fine grid decoration ---- */
  .sc-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(var(--grid-color) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
    background-size: 60px 60px;
    opacity: 0;
  }

  /* ---- Corner L-shaped frame lines ---- */
  .sc-corner {
    position: absolute;
    width: 80px;
    height: 80px;
    opacity: 0;
  }
  .sc-corner::before,
  .sc-corner::after {
    content: "";
    position: absolute;
    background: var(--accent-gold-dim);
  }
  .sc-corner::before {
    width: 100%;
    height: 1px;
  }
  .sc-corner::after {
    width: 1px;
    height: 100%;
  }
  .sc-corner.tl { top: 40px; left: 40px; }
  .sc-corner.tl::before { top: 0; left: 0; }
  .sc-corner.tl::after { top: 0; left: 0; }
  .sc-corner.tr { top: 40px; right: 40px; }
  .sc-corner.tr::before { top: 0; right: 0; }
  .sc-corner.tr::after { top: 0; right: 0; }
  .sc-corner.bl { bottom: 40px; left: 40px; }
  .sc-corner.bl::before { bottom: 0; left: 0; }
  .sc-corner.bl::after { bottom: 0; left: 0; }
  .sc-corner.br { bottom: 40px; right: 40px; }
  .sc-corner.br::before { bottom: 0; right: 0; }
  .sc-corner.br::after { bottom: 0; right: 0; }

  /* ---- Subject image layer ---- */
  .sc-subject {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 0;
    will-change: transform, opacity;
  }

  /* ---- SVG callout line layer ---- */
  .sc-lines {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .sc-line {
    fill: none;
    stroke: var(--accent-gold);
    stroke-width: 1.5;
    stroke-linecap: round;
    filter: drop-shadow(0 0 4px var(--accent-gold-glow));
  }

  /* ---- Anchor pulse ---- */
  .sc-anchor-pulse {
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent-gold);
    transform: translate(-50%, -50%);
    opacity: 0;
    box-shadow: 0 0 12px var(--accent-gold-dim), 0 0 24px var(--accent-gold-glow);
  }

  .sc-anchor-ring {
    position: absolute;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid var(--accent-gold-dim);
    transform: translate(-50%, -50%) scale(0.3);
    opacity: 0;
  }

  /* ---- Marker point + label layer ---- */
  .sc-marker {
    position: absolute;
    transform: translate(-50%, -50%);
    opacity: 0;
  }

  .sc-marker-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent-gold);
    box-shadow: 0 0 8px var(--accent-gold-dim);
    margin: 0 auto;
  }

  .sc-marker-index {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 10px;
    font-weight: 700;
    color: var(--bg-dark);
    line-height: 1;
    width: 10px;
    height: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sc-marker-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1px solid var(--accent-gold-dim);
  }

  .sc-label {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 14px;
    padding: 8px 18px;
    background: var(--label-bg);
    border: 1px solid var(--label-border);
    border-radius: 4px;
    white-space: nowrap;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .sc-label-text {
    font-size: 20px;
    font-weight: 500;
    color: var(--text-primary);
    letter-spacing: 0.5px;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
  }

  .sc-label-connector {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    width: 1px;
    height: 14px;
    background: var(--label-border);
  }

  /* ---- Scanline decoration (optional) ---- */
  .sc-scanline {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(200, 164, 92, 0.015) 2px,
      rgba(200, 164, 92, 0.015) 4px
    );
    opacity: 0;
    pointer-events: none;
  }
</style>
</head>
<body>
<div
  data-composition-id="schematic-callout"
  data-start="0"
  data-duration="8"
  data-width="1920"
  data-height="1080"
>

  <!-- Background layer -->
  <div class="sc-bg"></div>
  <div class="sc-bg-radial"></div>
  <div class="sc-grid"></div>

  <!-- Corner decoration -->
  <div class="sc-corner tl"></div>
  <div class="sc-corner tr"></div>
  <div class="sc-corner bl"></div>
  <div class="sc-corner br"></div>

  <!-- Subject image (replace the bgImage path) -->
  <div
    class="sc-subject"
    style="background-image: url('scene-003.png');"
  ></div>

  <!-- Scanline -->
  <div class="sc-scanline"></div>

  <!-- Anchor (callout convergence center) -->
  <div class="sc-anchor-pulse" style="left: 960px; top: 540px;"></div>
  <div class="sc-anchor-ring" style="left: 960px; top: 540px;"></div>

  <!-- SVG callout lines (JS dynamically generates strokeDasharray) -->
  <svg class="sc-lines" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet">
    <!-- Callout 1: Center -> Solar Panels -->
    <line class="sc-line sc-line-0" x1="960" y1="540" x2="200" y2="300" />
    <!-- Callout 2: Center -> High-Gain Antenna -->
    <line class="sc-line sc-line-1" x1="960" y1="540" x2="500" y2="600" />
    <!-- Callout 3: Center -> Thermal Control System -->
    <line class="sc-line sc-line-2" x1="960" y1="540" x2="800" y2="250" />
  </svg>

  <!-- Marker point 1 -->
  <div class="sc-marker" style="left: 200px; top: 300px;">
    <div class="sc-marker-dot">
      <span class="sc-marker-index">1</span>
    </div>
    <div class="sc-marker-ring"></div>
    <div class="sc-label">
      <div class="sc-label-connector"></div>
      <span class="sc-label-text">Solar Panels</span>
    </div>
  </div>

  <!-- Marker point 2 -->
  <div class="sc-marker" style="left: 500px; top: 600px;">
    <div class="sc-marker-dot">
      <span class="sc-marker-index">2</span>
    </div>
    <div class="sc-marker-ring"></div>
    <div class="sc-label">
      <div class="sc-label-connector"></div>
      <span class="sc-label-text">High-Gain Antenna</span>
    </div>
  </div>

  <!-- Marker point 3 -->
  <div class="sc-marker" style="left: 800px; top: 250px;">
    <div class="sc-marker-dot">
      <span class="sc-marker-index">3</span>
    </div>
    <div class="sc-marker-ring"></div>
    <div class="sc-label">
      <div class="sc-label-connector"></div>
      <span class="sc-label-text">Thermal Control System</span>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <script>
    (function () {
      /* ========== Configuration ========== */
      const LINE_ORIGIN_X = 960;
      const LINE_ORIGIN_Y = 540;

      /* Marker data generated from the JSON interface; hardcoded here as an example */
      const markers = [
        { x: 200, y: 300, label: "Solar Panels" },
        { x: 500, y: 600, label: "High-Gain Antenna" },
        { x: 800, y: 250, label: "Thermal Control System" }
      ];

      /* ========== Initialize SVG strokeDasharray ========== */
      markers.forEach(function (m, i) {
        var line = document.querySelector(".sc-line-" + i);
        if (!line) return;
        /* Calculate the line segment length */
        var dx = m.x - LINE_ORIGIN_X;
        var dy = m.y - LINE_ORIGIN_Y;
        var len = Math.sqrt(dx * dx + dy * dy);
        len = Math.max(1, Math.round(len));
        line.setAttribute("stroke-dasharray", len);
        line.setAttribute("stroke-dashoffset", len);
      });

      /* ========== GSAP timeline ========== */
      var tl = gsap.timeline({ paused: true });

      /* --- 0.0s: Background grid fade-in --- */
      tl.from(".sc-grid", {
        opacity: 0,
        duration: 1.2,
        ease: "power2.out"
      }, 0);

      /* --- 0.0s: Scanline fade-in --- */
      tl.from(".sc-scanline", {
        opacity: 0,
        duration: 1.0,
        ease: "power1.out"
      }, 0.2);

      /* --- 0.1s: Corner frame lines fade in sequentially --- */
      tl.from(".sc-corner.tl", { opacity: 0, duration: 0.5, ease: "power2.out" }, 0.1);
      tl.from(".sc-corner.tr", { opacity: 0, duration: 0.5, ease: "power2.out" }, 0.2);
      tl.from(".sc-corner.bl", { opacity: 0, duration: 0.5, ease: "power2.out" }, 0.3);
      tl.from(".sc-corner.br", { opacity: 0, duration: 0.5, ease: "power2.out" }, 0.4);

      /* --- 0.3s: Subject image Ken Burns fade-in --- */
      tl.from(".sc-subject", {
        opacity: 0,
        scale: 1.0,
        duration: 1.2,
        ease: "power3.out"
      }, 0.3);

      /* --- 1.5s: Subject continues slow zoom-in (Ken Burns push-in) --- */
      tl.to(".sc-subject", {
        scale: 1.06,
        duration: 6.5,
        ease: "none"
      }, 1.5);

      /* --- 1.2s: Anchor pulse appears --- */
      tl.from(".sc-anchor-pulse", {
        opacity: 0,
        scale: 0.3,
        duration: 0.5,
        ease: "back.out(3)"
      }, 1.2);

      tl.from(".sc-anchor-ring", {
        opacity: 0,
        scale: 0.3,
        duration: 0.8,
        ease: "power2.out"
      }, 1.2);

      /* Anchor continuously breathes */
      tl.to(".sc-anchor-pulse", {
        scale: 1.3,
        opacity: 0.5,
        duration: 1.5,
        ease: "sine.inOut",
        repeat: 4,
        yoyo: true
      }, 1.7);

      tl.to(".sc-anchor-ring", {
        scale: 1.8,
        opacity: 0,
        duration: 1.5,
        ease: "sine.inOut",
        repeat: 4,
        yoyo: true
      }, 1.7);

      /* --- From 1.6s: Callout lines are "drawn" sequentially --- */
      markers.forEach(function (m, i) {
        var delay = 1.6 + i * 0.45;

        /* Calculate the line segment length (same as initialization) */
        var dx = m.x - LINE_ORIGIN_X;
        var dy = m.y - LINE_ORIGIN_Y;
        var len = Math.sqrt(dx * dx + dy * dy);
        len = Math.max(1, Math.round(len));

        /* strokeDashoffset animates from len to 0 */
        tl.from(".sc-line-" + i, {
          attr: { "stroke-dashoffset": len },
          duration: 0.6,
          ease: "power2.inOut"
        }, delay);
      });

      /* --- After lines are drawn: Marker points + labels bounce in --- */
      markers.forEach(function (m, i) {
        var lineDrawEnd = 1.6 + i * 0.45 + 0.6; /* Time when the line finishes drawing */
        var markerDelay = lineDrawEnd + 0.05;

        /* Marker point bounces in */
        tl.from(".sc-marker:nth-child(" + (i + 1) + ")", {
          opacity: 0,
          scale: 0,
          duration: 0.45,
          ease: "back.out(4)"
        }, markerDelay);

        /* Label bounces from the marker-point position to its offset position */
        tl.from(".sc-marker:nth-child(" + (i + 1) + ") .sc-label", {
          opacity: 0,
          y: 15,
          scale: 0.7,
          duration: 0.4,
          ease: "back.out(3)"
        }, markerDelay + 0.1);
      });

      /* ========== Register the timeline ========== */
      window.__timelines = window.__timelines || {};
      window.__timelines["schematic-callout"] = tl;
    })();
  </script>
</div>
</body>
</html>
```

## Animation Timing Reference

Full choreography (using an 8-second total duration as an example):

| Time | Event | Easing |
|------|------|------|
| 0.0s | Background grid + radial glow fade in | `power2.out` |
| 0.1-0.4s | Four corner L-shaped frame lines fade in sequentially (0.1s apart) | `power2.out` |
| 0.2s | Scanline texture fade in | `power1.out` |
| 0.3s | Subject image fade in (opacity 0->1) | `power3.out` |
| 1.2s | Anchor pulse + expanding ring appear | `back.out(3)` |
| 1.5s | Subject begins Ken Burns slow push-in (scale 1.0->1.06) | `none` (linear, constant speed) |
| 1.7s | Anchor breathing loop starts | `sine.inOut` (continues until the end) |
| 1.6s | Callout 1 draws out (0.6s) | `power2.inOut` |
| 2.05s | Callout 2 draws out (0.6s) | `power2.inOut` |
| 2.5s | Callout 3 draws out (0.6s) | `power2.inOut` |
| 2.2s | Marker 1 + label bounce in | `back.out(4)` |
| 2.7s | Marker 2 + label bounce in | `back.out(4)` |
| 3.15s | Marker 3 + label bounce in | `back.out(4)` |
| 3.2s+ | All elements visible, held on a static frame | — |

Rhythm of the line drawing: each line begins 0.45s after the previous one and takes 0.6s to draw. When the next line starts, the previous one is about 75% complete, producing an overlapping "scan" feeling. Markers pop in immediately after their corresponding line finishes, reinforcing a sense of causality: "the line arrives, the marker is in place".

## Tuning Guide

### Color Theme

Modify the CSS variables to recolor globally:

```css
:root {
  /* Tech-blue theme */
  --accent-gold: #4ecdc4;
  --accent-gold-dim: rgba(78, 205, 196, 0.3);
  --accent-gold-glow: rgba(78, 205, 196, 0.15);
  --label-border: rgba(78, 205, 196, 0.4);
  --bg-dark: #0a0e1a;
}

:root {
  /* Medical-red theme */
  --accent-gold: #e05555;
  --accent-gold-dim: rgba(224, 85, 85, 0.3);
  --accent-gold-glow: rgba(224, 85, 85, 0.15);
  --label-border: rgba(224, 85, 85, 0.4);
  --bg-dark: #0f0708;
}
```

### Animation Speed

Adjust the key parameters in the GSAP timeline:

- **Line draw speed**: change `duration: 0.6` to `0.4` (faster) or `0.9` (more leisurely)
- **Line interval**: change `i * 0.45` to `i * 0.3` (denser) or `i * 0.6` (sparser)
- **Label bounce**: change `back.out(4)` to `back.out(2)` (softer) or `elastic.out(1, 0.3)` (springier)
- **Ken Burns magnitude**: change `scale: 1.06` to `1.03` (subtle push) or `1.12` (strong push)

### Marker Count

When adding or removing markers, three places must be updated in sync:
1. **SVG `<line>` elements** — one line per marker; `x1`/`y1` is the anchor point, `x2`/`y2` are the marker coordinates
2. **`.sc-marker` div** — one per marker; set `left`/`top` in `style`
3. **`markers` array** — the corresponding data in JS; the count and coordinates must match the HTML

A maximum of 8 markers is recommended. When exceeding 6, it is recommended to reduce `font-size` to 18px and shrink the line interval to 0.3s.

### Label Position Fine-tuning

By default the label sits directly below the marker point. If the label obscures the subject, you can offset it manually:

```html
<div class="sc-label" style="left: -40px; margin-top: 20px;">
```

Or display the label to the left of the marker point:

```css
.sc-label.left-aligned {
  top: 50%;
  right: 100%;
  bottom: auto;
  left: auto;
  margin-top: 0;
  margin-right: 14px;
  transform: translateY(-50%);
}
```

### Callout Convergence Point

By default lines emanate from the canvas center (960, 540). If the subject is shifted left, move the anchor to the subject's center:

```js
const LINE_ORIGIN_X = 700;
const LINE_ORIGIN_Y = 540;
```

Also update the anchor's HTML `style`:

```html
<div class="sc-anchor-pulse" style="left: 700px; top: 540px;"></div>
<div class="sc-anchor-ring" style="left: 700px; top: 540px;"></div>
```

As well as the `x1`/`y1` attributes of all SVG `<line>` elements.

### Callout Style Variants

**Curved lines**: replace the SVG `<line>` with a `<path>` using a quadratic Bezier curve:

```svg
<path class="sc-line sc-line-0"
  d="M 960 540 Q 580 420 200 300"
/>
```

In the JS, switch the length calculation to use `getTotalLength()`:

```js
var line = document.querySelector(".sc-line-" + i);
var len = Math.max(1, Math.round(line.getTotalLength()));
```

**Dashed lines**: modify the CSS:

```css
.sc-line {
  stroke-dasharray: 8 6;
  /* Overrides the stroke-dasharray set by JS, producing a dashed effect */
}
```

Note: when using a dashed style, the strokeDashoffset animation still works, but visually it feels more like "dotted scanning" than a "continuous laser".
