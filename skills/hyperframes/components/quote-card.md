<!-- SPDX-License-Identifier: Apache-2.0. Copyright (c) 2026 Min Li, Zhuoran Lin <zhuoran.lin@z.ai>. Original work of zflow-skills (not derived from upstream). -->

# <quote-card> Quote / Core Definition Card

## Effect Description

The background instantly dims overall, suppressing the visual interference of all other elements. A refined card "bursts through the screen" from the center of the display — entering with a 3D flip effect featuring `rotationX`. The card embeds a large decorative pair of quotation marks, and the quote text carries a golden glow effect (`text-shadow`). The author attribution and optional avatar are arranged on either side, forming a classic quote layout.

Suitable for: famous quotes, core definitions, key theorems, climactic punch lines, and "freeze-frame moments" in videos.

## Applicable Scenarios

- Famous quotes / classic sayings
- Core concept definitions ("What is X?")
- Key theorems / formula displays
- Video climax lines (emotional peaks, turning points)
- Point-making sentences in chapter transitions

## AI Input Interface

```json
{
  "avatar": "einstein.jpg",
  "author": "Albert Einstein",
  "quote": "God does not play dice.",
  "sublabel": "Core view of quantum mechanics"
}
```

| Field      | Required | Description                                          |
| ---------- | -------- | ---------------------------------------------------- |
| `quote`    | Yes      | Quote body text; recommended no more than 40 chars   |
| `author`   | Yes      | Author / source attribution                          |
| `avatar`   | No       | Avatar image path; circular-cropped, placed on the left of the card |
| `sublabel` | No       | Supplementary label, displayed above the quote       |

## Complete Code

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Quote Card Component</title>
<style>
  /* ========== Reset & Stage ========== */
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --card-bg: #12151f;
    --card-border: rgba(200, 164, 92, 0.15);
    --gold: #c8a45c;
    --gold-bright: #e8cc7a;
    --quote-text: #f0ece4;
    --author-text: #8a8578;
    --sublabel-text: #a09b90;
    --overlay-bg: rgba(5, 5, 12, 0.82);
    --avatar-size: 80px;
  }

  body {
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    background: #0a0a0f;
    font-family: "Noto Serif SC", "Source Han Serif SC", "Georgia", serif;
  }

  /* ========== Dim Overlay ========== */
  .quote-overlay {
    position: absolute;
    inset: 0;
    background: var(--overlay-bg);
    z-index: 10;
    opacity: 0;
    /* Vignette */
    background: radial-gradient(
      ellipse at center,
      rgba(5, 5, 12, 0.75) 0%,
      rgba(5, 5, 12, 0.92) 70%,
      rgba(5, 5, 12, 0.98) 100%
    );
  }

  /* ========== Card Container ========== */
  .quote-card {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) perspective(1200px);
    z-index: 20;
    width: 960px;
    max-width: 50vw;
    padding: 64px 72px;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 8px;
    opacity: 0;
    /* Decorative top/bottom accent lines */
    box-shadow:
      0 0 80px rgba(200, 164, 92, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .quote-card::before,
  .quote-card::after {
    content: "";
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 120px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--gold),
      transparent
    );
    opacity: 0.4;
  }
  .quote-card::before { top: 20px; }
  .quote-card::after  { bottom: 20px; }

  /* ========== Decorative Quotation Marks ========== */
  .quote-mark {
    position: absolute;
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 180px;
    line-height: 1;
    color: var(--gold);
    opacity: 0;
    user-select: none;
    pointer-events: none;
  }

  .quote-mark--open {
    top: -20px;
    left: 16px;
  }

  .quote-mark--close {
    bottom: -40px;
    right: 16px;
  }

  /* ========== Sublabel ========== */
  .quote-sublabel {
    font-family: "Noto Sans SC", "Helvetica Neue", sans-serif;
    font-size: 16px;
    font-weight: 500;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--sublabel-text);
    margin-bottom: 20px;
    opacity: 0;
  }

  /* ========== Quote Text ========== */
  .quote-text {
    font-size: 42px;
    font-weight: 600;
    line-height: 1.6;
    color: var(--quote-text);
    /* Golden glow effect */
    text-shadow:
      0 0 20px rgba(200, 164, 92, 0.3),
      0 0 40px rgba(200, 164, 92, 0.1);
    margin-bottom: 36px;
    opacity: 0;
  }

  /* ========== Author Row ========== */
  .quote-author-row {
    display: flex;
    align-items: center;
    gap: 18px;
    opacity: 0;
  }

  .quote-avatar {
    width: var(--avatar-size);
    height: var(--avatar-size);
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--card-border);
    flex-shrink: 0;
    /* Hidden by default; shown only if an avatar URL is provided */
    display: none;
  }

  .quote-avatar--visible {
    display: block;
  }

  .quote-author {
    font-family: "Noto Sans SC", "Helvetica Neue", sans-serif;
    font-size: 20px;
    font-weight: 400;
    color: var(--author-text);
    letter-spacing: 1px;
  }

  /* ========== Golden Particles (decorative) ========== */
  .particle {
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--gold);
    pointer-events: none;
    z-index: 25;
    opacity: 0;
  }
</style>
</head>
<body>

  <!-- Dim overlay with vignette -->
  <div class="quote-overlay"></div>

  <!-- Decorative particles -->
  <div class="particle" style="top: 30%; left: 25%;"></div>
  <div class="particle" style="top: 65%; left: 70%;"></div>
  <div class="particle" style="top: 20%; left: 75%;"></div>
  <div class="particle" style="top: 75%; left: 30%;"></div>
  <div class="particle" style="top: 45%; left: 15%;"></div>
  <div class="particle" style="top: 50%; left: 85%;"></div>

  <!-- Quote Card -->
  <div class="quote-card">
    <!-- Decorative quotation marks -->
    <span class="quote-mark quote-mark--open">&ldquo;</span>
    <span class="quote-mark quote-mark--close">&rdquo;</span>

    <!-- Sublabel (optional) -->
    <div class="quote-sublabel">Core view of quantum mechanics</div>

    <!-- Quote body -->
    <p class="quote-text">God does not play dice.</p>

    <!-- Author attribution -->
    <div class="quote-author-row">
      <img
        class="quote-avatar quote-avatar--visible"
        src="einstein.jpg"
        alt="Albert Einstein"
      />
      <span class="quote-author">&mdash;&nbsp; Albert Einstein</span>
    </div>
  </div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script>
  (function () {
    "use strict";

    /* ---------- References ---------- */
    var overlay   = document.querySelector(".quote-overlay");
    var card      = document.querySelector(".quote-card");
    var markOpen  = document.querySelector(".quote-mark--open");
    var markClose = document.querySelector(".quote-mark--close");
    var sublabel  = document.querySelector(".quote-sublabel");
    var quoteText = document.querySelector(".quote-text");
    var authorRow = document.querySelector(".quote-author-row");
    var particles = document.querySelectorAll(".particle");

    /* ---------- Master Timeline ---------- */
    var tl = gsap.timeline();

    /* 1) Overlay dims the scene */
    tl.from(overlay, {
      opacity: 0,
      duration: 0.5,
      ease: "power2.inOut"
    });

    /* 2) Card enters with 3D flip from above */
    tl.from(card, {
      opacity: 0,
      rotationX: -25,
      y: 60,
      scale: 0.92,
      duration: 0.8,
      ease: "back.out(1.4)"
    }, "-=0.15");

    /* 3) Decorative quotation marks fade in with scale */
    tl.from([markOpen, markClose], {
      opacity: 0,
      scale: 0.5,
      duration: 0.5,
      ease: "power3.out",
      stagger: 0.1
    }, "-=0.45");

    /* 4) Sublabel slides in */
    tl.from(sublabel, {
      opacity: 0,
      y: 12,
      duration: 0.4,
      ease: "power2.out"
    }, "-=0.3");

    /* 5) Quote text reveals with golden glow buildup */
    tl.from(quoteText, {
      opacity: 0,
      y: 20,
      filter: "blur(6px)",
      duration: 0.6,
      ease: "power2.out"
    }, "-=0.25");

    /* 6) Author row */
    tl.from(authorRow, {
      opacity: 0,
      x: -16,
      duration: 0.4,
      ease: "power2.out"
    }, "-=0.2");

    /* 7) Golden particles twinkle */
    particles.forEach(function (p, i) {
      tl.from(p, {
        opacity: 0,
        scale: 0,
        duration: 0.3,
        ease: "power1.out"
      }, "-=0.6 + " + (i * 0.08));
    });

    /* 8) Gentle ambient pulse on the open quotation mark */
    tl.to(markOpen, {
      textShadow: "0 0 30px rgba(200,164,92,0.5), 0 0 60px rgba(200,164,92,0.2)",
      duration: 1.2,
      ease: "sine.inOut",
      yoyo: true,
      repeat: 1
    }, "-=0.2");

  })();
</script>
</body>
</html>
```

## Animation Timing Notes

```
0.00s  ┃ overlay fades in                          (0.5s, power2.inOut)
0.35s  ┃ card 3D flip entrance: rotationX + scale   (0.8s, back.out 1.4)
0.50s  ┃ quotation marks scale-in                   (0.5s, power3.out, stagger 0.1)
0.70s  ┃ sublabel slide up                          (0.4s, power2.out)
0.85s  ┃ quote text reveal (blur → sharp)           (0.6s, power2.out)
1.05s  ┃ author row slide from left                 (0.4s, power2.out)
1.15s  ┃ golden particles twinkle in                (stagger 0.08s each)
1.30s  ┃ quotation mark glow pulse (yoyo)           (1.2s, sine.inOut x2)
```

Total entrance duration is about **1.5 seconds**, after which the glow pulse continues to provide 2.4 seconds of breathing rhythm. The entire sequence is crisp and clean, well-suited for "freeze-frame moments" in videos.

## Tuning Guide

### Colors

| Variable        | Default               | Tuning Suggestions                                   |
| --------------- | --------------------- | ---------------------------------------------------- |
| `--card-bg`     | `#12151f`             | Deep blue base; can be switched to `#1a1520` (warm purple tint), etc. |
| `--gold`        | `#c8a45c`             | Primary color for quotation marks/glow; for silver scenes use `#b0b8c8` |
| `--quote-text`  | `#f0ece4`             | Body text color; ensure contrast ratio vs. card-bg is >= 4.5:1 |
| `--author-text` | `#8a8578`             | Attribution color, deliberately lowered to create hierarchy |
| `--overlay-bg`  | `rgba(5,5,12,0.82)`   | Dimming intensity; 0.7 is lighter, 0.95 is heavier   |

### Sizes

| Parameter       | Default | Tuning Suggestions                                   |
| --------------- | ------- | ---------------------------------------------------- |
| Card width      | 960px   | Increase to 1100px for long text; reduce to 700px for short sentences |
| Quotation mark font size | 180px   | Larger card, larger marks; ratio is about 18-22% of card width |
| Quote font size | 42px    | On-screen main text; can be pushed to 48px for 24-26 chars or fewer |
| `--avatar-size` | 80px    | Irrelevant without an avatar; use 64-96px when an avatar is present |

### Animation

| Parameter       | Default        | Effect                                               |
| --------------- | -------------- | ---------------------------------------------------- |
| `rotationX`     | -25            | Entrance flip angle; -15 is more subtle, -45 is more dramatic |
| `scale`         | 0.92           | Starting scale; 0.85 feels farther, 0.95 feels closer |
| `back.out(1.4)` | back.out(1.4)  | Overshoot amount; 1.2 is restrained, 1.7 has a strong bounce feel |
| `filter: blur`  | 6px            | Blur amount for the quote reveal; 3px is lighter, 12px is more dreamlike |
| Particle count  | 6              | 0 disables; 3-8 is recommended                       |

### No-Avatar Mode

When the `avatar` field is not provided, remove the `<img>` element or drop the `quote-avatar--visible` class; the author row will automatically left-align with no spacing offset.

### No-Sublabel Mode

When `sublabel` is not provided, remove the `.quote-sublabel` element and delete the corresponding `sublabel`-related `from` call in the GSAP timeline.
