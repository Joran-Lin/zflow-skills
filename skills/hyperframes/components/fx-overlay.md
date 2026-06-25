<!-- SPDX-License-Identifier: Apache-2.0. Copyright (c) 2026 Min Li, Zhuoran Lin <zhuoran.lin@z.ai>. Original work of zflow-skills (not derived from upstream). -->

# <fx-overlay> Scene Atmosphere Background Filter

## Effect Description

A scene atmosphere overlay layer used to add ambient visual effects above any scene. It is not a standalone scene — it embeds inside any `.scene-content` as a background ambience layer, covering beneath or above the main content.

Provides three effect variants:
- **matrix** — Matrix-style green digital rain (CSS falling-character animation)
- **space** — Slowly rotating starfield with floating cosmic dust particles (CSS floating-particle animation)
- **blueprint** — Engineering blueprint grid lines (CSS background pattern)

All effects are pure CSS @keyframes animations — no GSAP, no JS. Variation is achieved through CSS `animation-delay` to ensure determinism (seekable).

## Applicable Scenarios

- Add Matrix digital rain ambience to dark tech scenes
- Add a starfield particle background to space/universe themes
- Add a blueprint grid for engineering/data/architecture themes
- Any scene that needs an ambient layer rather than a standalone background video
- Used as a background layer within a scene; main content sits above it via z-index

## AI Input Interface

```json
{
  "effect": "space",
  "intensity": 0.5
}
```

| Parameter | Type | Allowed values | Default | Description |
|-----------|------|----------------|---------|-------------|
| `effect` | string | `"matrix"`, `"space"`, `"blueprint"` | — | Required. Specifies the effect type. |
| `intensity` | number | `0.1` - `1.0` | `0.5` | Controls effect strength (opacity, density, speed, etc.). |

## Usage Rules

1. The overlay is sized 1920x1080 and uses `position: absolute; inset: 0` to cover the entire scene
2. All overlays set `pointer-events: none` so they do not affect interaction
3. Overlay `z-index` is lower than the main content (typically `z-index: 1`, main content `z-index: 2+`)
4. No `Math.random()`, `Date.now()`, or any non-deterministic logic — use CSS `animation-delay` to produce variation
5. Pure CSS @keyframes animations; no GSAP timeline needed
6. Effect strength is mapped from the `intensity` parameter to the CSS custom property `--fx-opacity`
7. Paste the following code inside the scene's `<div data-composition-id="...">`, placed as a sibling of or inside `.scene-content`

## Full Code

### Common Container Structure

All three effects share the same container structure. Paste the CSS and HTML for the corresponding effect into your composition:

```html
<!-- fx-overlay container: place as a sibling of or inside scene-content -->
<div class="fx-overlay fx-overlay--[effect]"
     style="--fx-opacity: [intensity];">
  <!-- effect-specific child elements -->
</div>
```

```css
/* Common overlay base styles */
.fx-overlay {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}
```

---

### Variant 1: matrix (Matrix digital rain)

A matrix effect with green characters falling from the top. Uses multiple column divs + CSS @keyframes to implement the character-fall animation.

```html
<div class="fx-overlay fx-overlay--matrix" style="--fx-opacity: 0.4;">
  <!-- 30 columns of character rain, staggered via animation-delay -->
  <div class="matrix-col" style="--col-x: 0; --char-count: 18; --delay: 0s; --speed: 8s; --start-y: -900px;">
    0110100111010010110100111010010110100111010010
  </div>
  <div class="matrix-col" style="--col-x: 64px; --char-count: 22; --delay: 1.2s; --speed: 10s; --start-y: -1100px;">
    1011010011101001011010011101001011010011101001
  </div>
  <div class="matrix-col" style="--col-x: 128px; --char-count: 15; --delay: 0.4s; --speed: 7s; --start-y: -750px;">
    1100101110100101101001110100101101001110100101
  </div>
  <div class="matrix-col" style="--col-x: 192px; --char-count: 20; --delay: 2.8s; --speed: 9s; --start-y: -1000px;">
    0100111010010110100111010010110100111010010110
  </div>
  <div class="matrix-col" style="--col-x: 256px; --char-count: 16; --delay: 0.8s; --speed: 7.5s; --start-y: -800px;">
    1010011101001011010011101001011010011101001011
  </div>
  <div class="matrix-col" style="--col-x: 320px; --char-count: 24; --delay: 3.5s; --speed: 11s; --start-y: -1200px;">
    0110100111010010110100111010010110100111010010
  </div>
  <div class="matrix-col" style="--col-x: 384px; --char-count: 17; --delay: 1.6s; --speed: 8.5s; --start-y: -850px;">
    1001011010011101001011010011101001011010011101
  </div>
  <div class="matrix-col" style="--col-x: 448px; --char-count: 19; --delay: 4.1s; --speed: 9.5s; --start-y: -950px;">
    0101101001110100101101001110100101101001110100
  </div>
  <div class="matrix-col" style="--col-x: 512px; --char-count: 14; --delay: 0.2s; --speed: 6.5s; --start-y: -700px;">
    1110100101101001110100101101001110100101101001
  </div>
  <div class="matrix-col" style="--col-x: 576px; --char-count: 21; --delay: 2.2s; --speed: 10.5s; --start-y: -1050px;">
    0110100111010010110100111010010110100111010010
  </div>
  <div class="matrix-col" style="--col-x: 640px; --char-count: 18; --delay: 1.0s; --speed: 8s; --start-y: -900px;">
    1001110100101101001110100101101001110100101101
  </div>
  <div class="matrix-col" style="--col-x: 704px; --char-count: 23; --delay: 3.0s; --speed: 10.8s; --start-y: -1150px;">
    0100111010010110100111010010110100111010010110
  </div>
  <div class="matrix-col" style="--col-x: 768px; --char-count: 16; --delay: 0.6s; --speed: 7.2s; --start-y: -800px;">
    1011010011101001011010011101001011010011101001
  </div>
  <div class="matrix-col" style="--col-x: 832px; --char-count: 20; --delay: 2.5s; --speed: 9.2s; --start-y: -1000px;">
    0011010011101001011010011101001011010011101001
  </div>
  <div class="matrix-col" style="--col-x: 896px; --char-count: 15; --delay: 1.4s; --speed: 7.8s; --start-y: -750px;">
    1110100101101001110100101101001110100101101001
  </div>
  <div class="matrix-col" style="--col-x: 960px; --char-count: 22; --delay: 3.8s; --speed: 10.2s; --start-y: -1100px;">
    0110100111010010110100111010010110100111010010
  </div>
  <div class="matrix-col" style="--col-x: 1024px; --char-count: 17; --delay: 0.9s; --speed: 8.2s; --start-y: -850px;">
    1001011010011101001011010011101001011010011101
  </div>
  <div class="matrix-col" style="--col-x: 1088px; --char-count: 19; --delay: 2.0s; --speed: 9.8s; --start-y: -950px;">
    0101101001110100101101001110100101101001110100
  </div>
  <div class="matrix-col" style="--col-x: 1152px; --char-count: 14; --delay: 4.5s; --speed: 6.8s; --start-y: -700px;">
    1100101110100101101001110100101101001110100101
  </div>
  <div class="matrix-col" style="--col-x: 1216px; --char-count: 21; --delay: 1.8s; --speed: 10.6s; --start-y: -1050px;">
    1010011101001011010011101001011010011101001011
  </div>
  <div class="matrix-col" style="--col-x: 1280px; --char-count: 18; --delay: 3.2s; --speed: 8.8s; --start-y: -900px;">
    0110100111010010110100111010010110100111010010
  </div>
  <div class="matrix-col" style="--col-x: 1344px; --char-count: 16; --delay: 0.3s; --speed: 7.4s; --start-y: -800px;">
    1001110100101101001110100101101001110100101101
  </div>
  <div class="matrix-col" style="--col-x: 1408px; --char-count: 23; --delay: 2.6s; --speed: 11.2s; --start-y: -1150px;">
    0100111010010110100111010010110100111010010110
  </div>
  <div class="matrix-col" style="--col-x: 1472px; --char-count: 15; --delay: 1.5s; --speed: 7.6s; --start-y: -750px;">
    1011010011101001011010011101001011010011101001
  </div>
  <div class="matrix-col" style="--col-x: 1536px; --char-count: 20; --delay: 3.6s; --speed: 9.6s; --start-y: -1000px;">
    1110100101101001110100101101001110100101101001
  </div>
  <div class="matrix-col" style="--col-x: 1600px; --char-count: 18; --delay: 0.7s; --speed: 8.4s; --start-y: -900px;">
    0110100111010010110100111010010110100111010010
  </div>
  <div class="matrix-col" style="--col-x: 1664px; --char-count: 22; --delay: 2.3s; --speed: 10.4s; --start-y: -1100px;">
    1001011010011101001011010011101001011010011101
  </div>
  <div class="matrix-col" style="--col-x: 1728px; --char-count: 17; --delay: 4.2s; --speed: 8.6s; --start-y: -850px;">
    0101101001110100101101001110100101101001110100
  </div>
  <div class="matrix-col" style="--col-x: 1792px; --char-count: 19; --delay: 1.1s; --speed: 9.4s; --start-y: -950px;">
    0011010011101001011010011101001011010011101001
  </div>
  <div class="matrix-col" style="--col-x: 1856px; --char-count: 21; --delay: 3.4s; --speed: 10.8s; --start-y: -1050px;">
    1010011101001011010011101001011010011101001011
  </div>
</div>
```

```css
/* matrix effect styles */
.fx-overlay--matrix {
  background: rgba(0, 0, 0, 0.3);
}

.fx-overlay--matrix .matrix-col {
  position: absolute;
  left: var(--col-x);
  top: var(--start-y);
  font-family: "Courier New", "Consolas", monospace;
  font-size: 20px;
  line-height: 28px;
  color: #00ff41;
  text-shadow:
    0 0 8px rgba(0, 255, 65, 0.6),
    0 0 16px rgba(0, 255, 65, 0.3);
  opacity: var(--fx-opacity);
  white-space: nowrap;
  letter-spacing: 2px;
  animation: matrix-fall var(--speed) var(--delay) linear infinite;
  will-change: transform;
}

@keyframes matrix-fall {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(2200px);
  }
}
```

---

### Variant 2: space (starfield particles)

A slowly rotating starfield background paired with floating light-point particles of varying sizes. Particles use CSS animation-delay to achieve a staggered floating rhythm.

```html
<div class="fx-overlay fx-overlay--space" style="--fx-opacity: 0.5;">
  <!-- starfield background layer -->
  <div class="space-starfield">
    <div class="space-stars-layer space-stars--near"></div>
    <div class="space-stars-layer space-stars--mid"></div>
    <div class="space-stars-layer space-stars--far"></div>
  </div>
  <!-- floating cosmic dust particles -->
  <div class="space-particle" style="--px: 120px; --py: 180px; --size: 4px; --dur: 18s; --delay: 0s; --drift-x: 80px; --drift-y: -60px;"></div>
  <div class="space-particle" style="--px: 340px; --py: 90px; --size: 3px; --dur: 22s; --delay: 1.5s; --drift-x: -50px; --drift-y: 40px;"></div>
  <div class="space-particle" style="--px: 560px; --py: 400px; --size: 5px; --dur: 16s; --delay: 3.0s; --drift-x: 70px; --drift-y: 30px;"></div>
  <div class="space-particle" style="--px: 780px; --py: 250px; --size: 2px; --dur: 25s; --delay: 0.8s; --drift-x: -90px; --drift-y: -40px;"></div>
  <div class="space-particle" style="--px: 1000px; --py: 600px; --size: 6px; --dur: 14s; --delay: 4.2s; --drift-x: 60px; --drift-y: -70px;"></div>
  <div class="space-particle" style="--px: 120px; --py: 700px; --size: 3px; --dur: 20s; --delay: 2.1s; --drift-x: 40px; --drift-y: 50px;"></div>
  <div class="space-particle" style="--px: 440px; --py: 520px; --size: 4px; --dur: 19s; --delay: 5.0s; --drift-x: -60px; --drift-y: -30px;"></div>
  <div class="space-particle" style="--px: 680px; --py: 80px; --size: 5px; --dur: 17s; --delay: 1.2s; --drift-x: 100px; --drift-y: 20px;"></div>
  <div class="space-particle" style="--px: 900px; --py: 350px; --size: 2px; --dur: 24s; --delay: 3.8s; --drift-x: -40px; --drift-y: -60px;"></div>
  <div class="space-particle" style="--px: 1120px; --py: 150px; --size: 3px; --dur: 21s; --delay: 0.5s; --drift-x: 55px; --drift-y: 45px;"></div>
  <div class="space-particle" style="--px: 1340px; --py: 480px; --size: 4px; --dur: 15s; --delay: 2.8s; --drift-x: -75px; --drift-y: -50px;"></div>
  <div class="space-particle" style="--px: 1560px; --py: 300px; --size: 6px; --dur: 18s; --delay: 4.5s; --drift-x: 85px; --drift-y: 35px;"></div>
  <div class="space-particle" style="--px: 1780px; --py: 550px; --size: 2px; --dur: 23s; --delay: 1.8s; --drift-x: -55px; --drift-y: 65px;"></div>
  <div class="space-particle" style="--px: 200px; --py: 950px; --size: 5px; --dur: 16s; --delay: 3.5s; --drift-x: 65px; --drift-y: -45px;"></div>
  <div class="space-particle" style="--px: 520px; --py: 780px; --size: 3px; --dur: 20s; --delay: 0.3s; --drift-x: -80px; --drift-y: 30px;"></div>
  <div class="space-particle" style="--px: 840px; --py: 900px; --size: 4px; --dur: 22s; --delay: 5.5s; --drift-x: 45px; --drift-y: -55px;"></div>
  <div class="space-particle" style="--px: 1160px; --py: 820px; --size: 2px; --dur: 19s; --delay: 2.4s; --drift-x: -70px; --drift-y: -20px;"></div>
  <div class="space-particle" style="--px: 1480px; --py: 680px; --size: 5px; --dur: 14s; --delay: 4.0s; --drift-x: 90px; --drift-y: -65px;"></div>
  <div class="space-particle" style="--px: 1700px; --py: 920px; --size: 3px; --dur: 21s; --delay: 1.0s; --drift-x: -50px; --drift-y: 40px;"></div>
  <div class="space-particle" style="--px: 80px; --py: 450px; --size: 4px; --dur: 17s; --delay: 3.2s; --drift-x: 75px; --drift-y: -35px;"></div>
</div>
```

```css
/* space effect styles */
.fx-overlay--space {
  background: radial-gradient(ellipse at 50% 50%, #0a0e27 0%, #020412 70%, #000005 100%);
}

/* starfield background layer — three layers of differently-sized star points, implemented via box-shadow */
.space-starfield {
  position: absolute;
  inset: 0;
  animation: space-rotate 120s linear infinite;
}

.space-stars-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: transparent;
  opacity: var(--fx-opacity);
}

/* near star points: larger and brighter */
.space-stars--near {
  box-shadow:
    100px 50px 2px 1px rgba(255, 255, 255, 0.9),
    350px 200px 1px 0px rgba(200, 220, 255, 0.8),
    600px 80px 2px 1px rgba(255, 255, 255, 0.85),
    850px 350px 1px 0px rgba(180, 200, 255, 0.7),
    1100px 150px 2px 1px rgba(255, 255, 255, 0.9),
    1350px 420px 1px 0px rgba(220, 230, 255, 0.75),
    1600px 90px 2px 1px rgba(255, 255, 255, 0.8),
    1800px 300px 1px 0px rgba(200, 210, 255, 0.7),
    250px 600px 2px 1px rgba(255, 255, 255, 0.85),
    500px 750px 1px 0px rgba(190, 210, 255, 0.75),
    750px 550px 2px 1px rgba(255, 255, 255, 0.9),
    1000px 700px 1px 0px rgba(210, 220, 255, 0.7),
    1250px 600px 2px 1px rgba(255, 255, 255, 0.8),
    1500px 800px 1px 0px rgba(200, 215, 255, 0.8),
    1750px 650px 2px 1px rgba(255, 255, 255, 0.85),
    150px 900px 1px 0px rgba(220, 230, 255, 0.7),
    400px 950px 2px 1px rgba(255, 255, 255, 0.9),
    650px 850px 1px 0px rgba(190, 205, 255, 0.75),
    900px 1000px 2px 1px rgba(255, 255, 255, 0.8),
    1200px 950px 1px 0px rgba(210, 220, 255, 0.7);
  animation: space-twinkle-near 4s ease-in-out infinite alternate;
}

/* mid star points: medium size */
.space-stars--mid {
  box-shadow:
    80px 120px 1px 0px rgba(255, 255, 255, 0.5),
    280px 340px 0px 0px rgba(180, 200, 255, 0.4),
    480px 60px 1px 0px rgba(255, 255, 255, 0.5),
    680px 480px 0px 0px rgba(200, 215, 255, 0.35),
    880px 220px 1px 0px rgba(255, 255, 255, 0.5),
    1080px 560px 0px 0px rgba(190, 210, 255, 0.4),
    1280px 130px 1px 0px rgba(255, 255, 255, 0.45),
    1480px 380px 0px 0px rgba(210, 225, 255, 0.35),
    1680px 520px 1px 0px rgba(255, 255, 255, 0.5),
    1880px 180px 0px 0px rgba(180, 200, 255, 0.4),
    180px 700px 1px 0px rgba(255, 255, 255, 0.5),
    380px 820px 0px 0px rgba(200, 215, 255, 0.4),
    580px 680px 1px 0px rgba(255, 255, 255, 0.45),
    780px 900px 0px 0px rgba(190, 205, 255, 0.35),
    980px 750px 1px 0px rgba(255, 255, 255, 0.5),
    1180px 880px 0px 0px rgba(210, 220, 255, 0.4),
    1380px 700px 1px 0px rgba(255, 255, 255, 0.5),
    1580px 920px 0px 0px rgba(200, 210, 255, 0.35),
    1780px 800px 1px 0px rgba(255, 255, 255, 0.45),
    130px 400px 0px 0px rgba(180, 200, 255, 0.4);
  animation: space-twinkle-mid 6s ease-in-out infinite alternate;
}

/* far star points: smallest and dimmest */
.space-stars--far {
  box-shadow:
    50px 30px 0px 0px rgba(255, 255, 255, 0.25),
    180px 160px 0px 0px rgba(200, 210, 255, 0.2),
    310px 280px 0px 0px rgba(255, 255, 255, 0.2),
    440px 100px 0px 0px rgba(190, 205, 255, 0.15),
    570px 340px 0px 0px rgba(255, 255, 255, 0.25),
    700px 50px 0px 0px rgba(210, 220, 255, 0.2),
    830px 220px 0px 0px rgba(255, 255, 255, 0.2),
    960px 380px 0px 0px rgba(180, 200, 255, 0.15),
    1090px 110px 0px 0px rgba(255, 255, 255, 0.25),
    1220px 290px 0px 0px rgba(200, 215, 255, 0.2),
    1350px 50px 0px 0px rgba(255, 255, 255, 0.2),
    1480px 200px 0px 0px rgba(190, 210, 255, 0.15),
    1610px 370px 0px 0px rgba(255, 255, 255, 0.25),
    1740px 130px 0px 0px rgba(210, 225, 255, 0.2),
    1870px 280px 0px 0px rgba(255, 255, 255, 0.2),
    100px 500px 0px 0px rgba(200, 210, 255, 0.2),
    230px 650px 0px 0px rgba(255, 255, 255, 0.25),
    360px 530px 0px 0px rgba(180, 200, 255, 0.15),
    490px 720px 0px 0px rgba(255, 255, 255, 0.2),
    620px 600px 0px 0px rgba(210, 220, 255, 0.2),
    750px 480px 0px 0px rgba(255, 255, 255, 0.25),
    880px 670px 0px 0px rgba(190, 205, 255, 0.15),
    1010px 540px 0px 0px rgba(255, 255, 255, 0.2),
    1140px 710px 0px 0px rgba(200, 215, 255, 0.2),
    1270px 580px 0px 0px rgba(255, 255, 255, 0.2),
    1400px 450px 0px 0px rgba(180, 200, 255, 0.15),
    1530px 630px 0px 0px rgba(255, 255, 255, 0.25),
    1660px 500px 0px 0px rgba(210, 225, 255, 0.2),
    1790px 680px 0px 0px rgba(255, 255, 255, 0.2),
    80px 850px 0px 0px rgba(200, 210, 255, 0.2),
    210px 950px 0px 0px rgba(255, 255, 255, 0.25),
    340px 880px 0px 0px rgba(190, 205, 255, 0.15),
    470px 1020px 0px 0px rgba(255, 255, 255, 0.2),
    600px 900px 0px 0px rgba(210, 220, 255, 0.2),
    730px 1050px 0px 0px rgba(255, 255, 255, 0.2);
  animation: space-twinkle-far 8s ease-in-out infinite alternate;
}

/* floating particles */
.space-particle {
  position: absolute;
  left: var(--px);
  top: var(--py);
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(200, 220, 255, 0.9) 0%, rgba(100, 150, 255, 0.3) 60%, transparent 100%);
  box-shadow: 0 0 calc(var(--size) * 2) rgba(150, 180, 255, 0.4);
  opacity: calc(var(--fx-opacity) * 0.7);
  animation: space-drift var(--dur) var(--delay) ease-in-out infinite alternate;
  will-change: transform, opacity;
}

@keyframes space-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes space-twinkle-near {
  0% { opacity: calc(var(--fx-opacity) * 0.6); }
  100% { opacity: calc(var(--fx-opacity) * 1.0); }
}

@keyframes space-twinkle-mid {
  0% { opacity: calc(var(--fx-opacity) * 0.4); }
  100% { opacity: calc(var(--fx-opacity) * 0.7); }
}

@keyframes space-twinkle-far {
  0% { opacity: calc(var(--fx-opacity) * 0.2); }
  100% { opacity: calc(var(--fx-opacity) * 0.4); }
}

@keyframes space-drift {
  0% {
    transform: translate(0, 0);
    opacity: calc(var(--fx-opacity) * 0.3);
  }
  25% {
    opacity: calc(var(--fx-opacity) * 0.8);
  }
  50% {
    transform: translate(var(--drift-x), var(--drift-y));
    opacity: calc(var(--fx-opacity) * 0.5);
  }
  75% {
    opacity: calc(var(--fx-opacity) * 0.9);
  }
  100% {
    transform: translate(calc(var(--drift-x) * -0.5), calc(var(--drift-y) * -0.8));
    opacity: calc(var(--fx-opacity) * 0.3);
  }
}
```

---

### Variant 3: blueprint (engineering blueprint grid)

White/light-blue grid lines on a blue background, simulating a technical drawing or engineering blueprint effect. Pure CSS background pattern, no animation.

```html
<div class="fx-overlay fx-overlay--blueprint" style="--fx-opacity: 0.45;">
  <!-- grid intersection highlight decorations -->
  <div class="blueprint-node" style="--nx: 480px; --ny: 270px;"></div>
  <div class="blueprint-node" style="--nx: 960px; --ny: 540px;"></div>
  <div class="blueprint-node" style="--nx: 1440px; --ny: 270px;"></div>
  <div class="blueprint-node" style="--nx: 480px; --ny: 810px;"></div>
  <div class="blueprint-node" style="--nx: 1440px; --ny: 810px;"></div>
  <div class="blueprint-node" style="--nx: 720px; --ny: 540px;"></div>
  <div class="blueprint-node" style="--nx: 1200px; --ny: 540px;"></div>
  <div class="blueprint-node" style="--nx: 240px; --ny: 135px;"></div>
  <div class="blueprint-node" style="--nx: 1680px; --ny: 135px;"></div>
  <div class="blueprint-node" style="--nx: 240px; --ny: 945px;"></div>
  <div class="blueprint-node" style="--nx: 1680px; --ny: 945px;"></div>
  <div class="blueprint-node" style="--nx: 960px; --ny: 135px;"></div>
  <div class="blueprint-node" style="--nx: 960px; --ny: 945px;"></div>
  <!-- center crosshair marker -->
  <div class="blueprint-crosshair"></div>
  <!-- corner labels -->
  <div class="blueprint-corner-label blueprint-corner-label--tl">ORIGIN</div>
  <div class="blueprint-corner-label blueprint-corner-label--tr">REV 3.2</div>
  <div class="blueprint-corner-label blueprint-corner-label--bl">SCALE 1:1</div>
  <div class="blueprint-corner-label blueprint-corner-label--br">1920 x 1080</div>
</div>
```

```css
/* blueprint effect styles */
.fx-overlay--blueprint {
  background-color: #1a3a5c;
  background-image:
    /* fine grid lines (every 60px) */
    linear-gradient(
      to right,
      rgba(100, 180, 255, calc(var(--fx-opacity) * 0.12)) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      rgba(100, 180, 255, calc(var(--fx-opacity) * 0.12)) 1px,
      transparent 1px
    ),
    /* bold grid lines (every 240px) */
    linear-gradient(
      to right,
      rgba(100, 180, 255, calc(var(--fx-opacity) * 0.3)) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      rgba(100, 180, 255, calc(var(--fx-opacity) * 0.3)) 1px,
      transparent 1px
    ),
    /* diagonal guide line */
    linear-gradient(
      45deg,
      transparent 49.5%,
      rgba(100, 180, 255, calc(var(--fx-opacity) * 0.05)) 49.5%,
      rgba(100, 180, 255, calc(var(--fx-opacity) * 0.05)) 50.5%,
      transparent 50.5%
    );
  background-size:
    60px 60px,
    60px 60px,
    240px 240px,
    240px 240px,
    120px 120px;
}

/* decorative small dot at grid intersections */
.blueprint-node {
  position: absolute;
  left: var(--nx);
  top: var(--ny);
  width: 8px;
  height: 8px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1.5px solid rgba(100, 180, 255, calc(var(--fx-opacity) * 0.6));
  background: rgba(100, 180, 255, calc(var(--fx-opacity) * 0.15));
}

/* center crosshair marker lines */
.blueprint-crosshair {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 120px;
  height: 120px;
  transform: translate(-50%, -50%);
  opacity: var(--fx-opacity);
}

.blueprint-crosshair::before,
.blueprint-crosshair::after {
  content: "";
  position: absolute;
  background: rgba(100, 180, 255, 0.5);
}

.blueprint-crosshair::before {
  left: 50%;
  top: 0;
  width: 1px;
  height: 100%;
  transform: translateX(-50%);
}

.blueprint-crosshair::after {
  top: 50%;
  left: 0;
  height: 1px;
  width: 100%;
  transform: translateY(-50%);
}

/* corner label text */
.blueprint-corner-label {
  position: absolute;
  font-family: "Courier New", "Consolas", monospace;
  font-size: 12px;
  letter-spacing: 2px;
  color: rgba(100, 180, 255, calc(var(--fx-opacity) * 0.5));
  text-transform: uppercase;
}

.blueprint-corner-label--tl {
  top: 20px;
  left: 24px;
}

.blueprint-corner-label--tr {
  top: 20px;
  right: 24px;
}

.blueprint-corner-label--bl {
  bottom: 20px;
  left: 24px;
}

.blueprint-corner-label--br {
  bottom: 20px;
  right: 24px;
}
```

## Tuning Guide

### intensity Parameter Mapping

The `--fx-opacity` CSS custom property directly controls the overall visibility of the effect:

| intensity | --fx-opacity | Visual effect | Applicable scene |
|-----------|--------------|---------------|------------------|
| 0.1 - 0.2 | very faint | Almost invisible, only faintly perceived | Minimalist / premium brand backgrounds |
| 0.3 - 0.4 | soft | Visible but unobtrusive; ambience layer | Recommended default range |
| 0.5 - 0.6 | medium | Noticeable visual texture | Tech / data themed scenes |
| 0.7 - 0.8 | strong | Ambience effect stands out | Special-effect scenes or dark scenes |
| 0.9 - 1.0 | maximum | Ambience becomes the main visual element | Rarely used; may obscure content |

### Additional Tuning per Effect

#### matrix Tuning

| Tuning item | CSS variable/property | Effect |
|-------------|----------------------|--------|
| Character color | `color` of `.matrix-col` | Change to `#00e5ff` (cyan), `#ff00ff` (magenta), etc. |
| Character size | `font-size` of `.matrix-col` | Increase for readability, decrease for density |
| Column spacing | `--col-x` value | Smaller value = denser columns, larger value = sparser |
| Fall speed | `--speed` value | Smaller value = faster, larger value = slower |
| Glow strength | `blur` and `alpha` of `text-shadow` | Weaken or strengthen the character glow |
| Column count | add/remove `.matrix-col` elements | A denser or sparser rain curtain |

#### space Tuning

| Tuning item | CSS variable/property | Effect |
|-------------|----------------------|--------|
| Star density | number of `box-shadow` entries in `.space-stars-layer` | Add more stars or remove some |
| Rotation speed | `120s` of `space-rotate` | Smaller value = faster rotation, larger value = slower |
| Particle size | `--size` value | Larger value makes particles more prominent |
| Particle drift range | `--drift-x`, `--drift-y` | Larger value widens the particle travel range |
| Particle count | add/remove `.space-particle` elements | More or fewer floating particles |
| Background color | color values in `radial-gradient` | Change to deep red, deep purple, etc. for different starfield tones |
| Twinkle frequency | duration of `space-twinkle-*` | Smaller value = faster twinkling |

#### blueprint Tuning

| Tuning item | CSS variable/property | Effect |
|-------------|----------------------|--------|
| Grid density | `60px` in `background-size` | `40px` = denser, `80px` = sparser |
| Major-grid density | `240px` in `background-size` | `180px` = denser, `320px` = sparser |
| Grid color | `rgba(100, 180, 255, ...)` | Change to green (`100, 255, 180`), white, etc. |
| Background color | `background-color: #1a3a5c` | Change to darker (`#0d1f33`) or lighter (`#2a5a8c`) |
| Node size | `width/height` of `.blueprint-node` | Increase to enlarge intersection markers |
| Diagonal lines | `45deg linear-gradient` | Remove this layer to drop the diagonal guides |
| Corner label text | content of `.blueprint-corner-label` | Change to any annotation text |
