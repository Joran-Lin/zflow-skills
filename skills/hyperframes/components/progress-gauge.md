<!-- SPDX-License-Identifier: Apache-2.0. Copyright (c) 2026 Min Li, Zhuoran Lin <zhuoran.lin@z.ai>. Original work of zflow-skills (not derived from upstream). -->

# <progress-gauge> Dashboard Progress Gauge

## Effect Description

The gauge's indicator (a ring or horizontal bar) surges rapidly from 0, and the moment it hits the target value it produces a violent rebound oscillation (overshoot + spring bounce). If the danger preset is triggered, the entire gauge is accompanied by a red breathing-light style pulsing flash. The value is displayed in oversized type at the center, jumping in sync with progress.

Two forms:
- **circle** — SVG arc gauge, the arc fills clockwise from the bottom, with a large number displayed at the center
- **bar** — horizontal progress bar, whose width surges from 0 to the target value, with rounded ends and a glow

## Applicable Scenarios

- Voting approval rating, polling data
- Danger level, threat index
- Countdown progress, loading progress
- KPI achievement rate, completion rate
- Scores, score comparison
- Any data presentation that needs a dramatic "surge → rebound" effect

## AI Input Interface

```json
{
  "style": "circle",        // "circle" | "bar"
  "min": 0,                 // minimum value
  "max": 100,               // maximum value
  "current": 85,            // target value (final resting position of the animation)
  "label": "Approval Rating",  // gauge label text
  "alertLevel": "danger"    // "normal" | "danger" — danger enables the red breathing light
}
```

**Parameter description:**
- `style`: determines whether to use the arc or horizontal bar form
- `current` is within the `[min, max]` range, used to compute the progress percentage `(current - min) / (max - min)`
- When `alertLevel` is `"danger"`, the fill color becomes red `#ff3355`, and a breathing-light pulse is overlaid

## Complete Code

### Arc form (circle)

```html
<!-- ==================== PROGRESS GAUGE — CIRCLE ==================== -->
<div data-composition-id="gauge-circle" data-width="1920" data-height="1080">
  <style>
    [data-composition-id="gauge-circle"] {
      --bg: #0a0f1a;
      --track: #1a2035;
      --fill-normal: #00e68a;
      --fill-danger: #ff3355;
      --label-color: #e8e6e1;
      --gauge-fill: var(--fill-danger); /* override via JS based on alertLevel */
      width: 1920px;
      height: 1080px;
      background: var(--bg);
      overflow: hidden;
      position: relative;
    }

    .gauge-scene {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      gap: 32px;
    }

    /* SVG arc container */
    .gauge-ring-container {
      position: relative;
      width: 560px;
      height: 560px;
    }

    .gauge-svg {
      width: 560px;
      height: 560px;
      transform: rotate(-90deg); /* make the arc start from the bottom (6 o'clock direction) */
    }

    .gauge-track {
      fill: none;
      stroke: var(--track);
      stroke-width: 28;
      stroke-linecap: round;
    }

    .gauge-fill {
      fill: none;
      stroke: var(--gauge-fill);
      stroke-width: 28;
      stroke-linecap: round;
      /* circumference = 2 * PI * r = 2 * 3.14159 * 240 = 1507.96 */
      stroke-dasharray: 0 1507.96;
      filter: drop-shadow(0 0 18px var(--gauge-fill));
    }

    /* Danger mode breathing-light outer ring */
    .gauge-glow-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 620px;
      height: 620px;
      border-radius: 50%;
      border: 2px solid var(--fill-danger);
      opacity: 0;
      box-shadow: 0 0 40px var(--fill-danger), inset 0 0 40px rgba(255, 51, 85, 0.1);
    }

    /* Center value */
    .gauge-value-wrap {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }

    .gauge-number {
      font-family: "DIN Alternate", "Space Grotesk", "Inter", sans-serif;
      font-size: 130px;
      font-weight: 800;
      color: var(--label-color);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    .gauge-number .gauge-suffix {
      font-size: 52px;
      font-weight: 400;
      color: var(--gauge-fill);
      margin-left: 4px;
    }

    .gauge-sub-value {
      font-family: "Inter", "Space Grotesk", sans-serif;
      font-size: 22px;
      font-weight: 300;
      color: rgba(232, 230, 225, 0.5);
      margin-top: 8px;
    }

    /* Label */
    .gauge-label {
      font-family: "Inter", "Space Grotesk", sans-serif;
      font-size: 28px;
      font-weight: 400;
      color: var(--label-color);
      letter-spacing: 6px;
      text-transform: uppercase;
      opacity: 0.7;
    }

    /* Tick marks */
    .gauge-tick-marks {
      position: absolute;
      top: 0;
      left: 0;
      width: 560px;
      height: 560px;
    }

    .gauge-tick {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 2px;
      height: 12px;
      background: rgba(232, 230, 225, 0.15);
      transform-origin: center 260px;
    }

    .gauge-tick.major {
      height: 20px;
      width: 3px;
      background: rgba(232, 230, 225, 0.3);
    }
  </style>

  <div class="gauge-scene">
    <div class="gauge-ring-container">
      <!-- Tick marks -->
      <div class="gauge-tick-marks" id="gauge-ticks"></div>

      <!-- SVG arc -->
      <svg class="gauge-svg" viewBox="0 0 560 560">
        <circle class="gauge-track" cx="280" cy="280" r="240" />
        <circle class="gauge-fill" id="gauge-fill-arc" cx="280" cy="280" r="240" />
      </svg>

      <!-- Breathing light -->
      <div class="gauge-glow-ring" id="gauge-glow"></div>

      <!-- Center number -->
      <div class="gauge-value-wrap">
        <div class="gauge-number">
          <span id="gauge-counter">0</span><span class="gauge-suffix">%</span>
        </div>
        <div class="gauge-sub-value">of 100</div>
      </div>
    </div>

    <div class="gauge-label" id="gauge-label">Approval Rating</div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <script>
    (function () {
      /* ── Config ── */
      var CFG = {
        style: "circle",
        min: 0,
        max: 100,
        current: 85,
        label: "Approval Rating",
        alertLevel: "danger"
      };

      var isDanger = CFG.alertLevel === "danger";
      var percent = (CFG.current - CFG.min) / (CFG.max - CFG.min);
      var CIRCUMFERENCE = 2 * Math.PI * 240; // ≈ 1507.96

      /* ── Set colors ── */
      var comp = document.querySelector('[data-composition-id="gauge-circle"]');
      comp.style.setProperty("--gauge-fill", isDanger ? "var(--fill-danger)" : "var(--fill-normal)");

      /* ── Generate ticks ── */
      var ticksContainer = document.getElementById("gauge-ticks");
      var TICK_COUNT = 60;
      for (var i = 0; i < TICK_COUNT; i++) {
        var tick = document.createElement("div");
        tick.className = "gauge-tick" + (i % 5 === 0 ? " major" : "");
        tick.style.transform = "translate(-50%, -50%) rotate(" + (i * 6) + "deg)";
        ticksContainer.appendChild(tick);
      }

      /* ── Set label ── */
      document.getElementById("gauge-label").textContent = CFG.label;
      document.getElementById("gauge-counter").textContent = "0";
      document.querySelector(".gauge-sub-value").textContent = "of " + CFG.max;

      /* ── Get elements ── */
      var fillArc = document.getElementById("gauge-fill-arc");
      var counter = document.getElementById("gauge-counter");
      var glow = document.getElementById("gauge-glow");

      /* ── Target dasharray value ── */
      var targetDash = CIRCUMFERENCE * percent;
      var overshootDash = CIRCUMFERENCE * Math.min(percent + 0.08, 1.0); // overshoot 8%

      /* ── Timeline ── */
      var tl = gsap.timeline({ paused: true });
      var DURATION = 4.5; // total duration

      /* Phase 1: arc surge (0s → 1.8s) */
      tl.from(fillArc, {
        attr: { "stroke-dasharray": "0 " + CIRCUMFERENCE },
        duration: 1.8,
        ease: "power4.in"
      }, 0.15);

      /* Phase 2: arc overshoot + rebound oscillation (1.8s → 3.0s) */
      // Surge past target first
      tl.to(fillArc, {
        attr: { "stroke-dasharray": overshootDash + " " + CIRCUMFERENCE },
        duration: 0.15,
        ease: "power2.in"
      }, 1.95);
      // Spring back to target value — first bounce
      tl.to(fillArc, {
        attr: { "stroke-dasharray": targetDash + " " + CIRCUMFERENCE },
        duration: 0.35,
        ease: "elastic.out(1, 0.4)"
      }, 2.1);
      // Secondary micro-tremor (smaller amplitude)
      tl.to(fillArc, {
        attr: { "stroke-dasharray": (targetDash + CIRCUMFERENCE * 0.02) + " " + CIRCUMFERENCE },
        duration: 0.12,
        ease: "power2.out"
      }, 2.55);
      tl.to(fillArc, {
        attr: { "stroke-dasharray": targetDash + " " + CIRCUMFERENCE },
        duration: 0.2,
        ease: "power2.out"
      }, 2.67);

      /* Phase 3: number counter (synced with surge) */
      tl.from({ val: CFG.min }, {
        val: CFG.current,
        duration: 1.8,
        ease: "power4.in",
        onUpdate: function () {
          counter.textContent = Math.round(this.targets()[0].val);
        }
      }, 0.15);

      /* Number overshoot effect — fly slightly above target then spring back */
      var counterProxy = { val: CFG.current };
      tl.to(counterProxy, {
        val: CFG.current + 3,
        duration: 0.12,
        ease: "power2.in",
        onUpdate: function () {
          counter.textContent = Math.round(counterProxy.val);
        }
      }, 1.95);
      tl.to(counterProxy, {
        val: CFG.current,
        duration: 0.4,
        ease: "elastic.out(1, 0.5)",
        onUpdate: function () {
          counter.textContent = Math.round(counterProxy.val);
        }
      }, 2.07);

      /* Phase 4: label entrance */
      tl.from("#gauge-label", {
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out"
      }, 0.3);

      /* Phase 5: tick entrance */
      tl.from(".gauge-tick", {
        opacity: 0,
        scale: 0,
        duration: 0.4,
        stagger: { each: 0.01, from: "start" },
        ease: "power2.out"
      }, 0.05);

      /* Phase 6: danger mode — breathing-light pulse (yoyo repeat) */
      if (isDanger) {
        var breatheCycles = Math.ceil((DURATION - 2.8) / 1.2);
        tl.from(glow, {
          opacity: 0,
          scale: 0.95,
          duration: 0.6,
          ease: "sine.inOut",
          repeat: breatheCycles,
          yoyo: true
        }, 2.8);

        // Arc color flash — brightness pulse
        tl.to(fillArc, {
          attr: { "stroke-width": 32 },
          duration: 0.6,
          ease: "sine.inOut",
          repeat: breatheCycles,
          yoyo: true
        }, 2.8);
      }

      /* ── Register timeline ── */
      window.__timelines = window.__timelines || {};
      window.__timelines["gauge-circle"] = tl;
    })();
  </script>
</div>
```

### Horizontal bar form (bar)

```html
<!-- ==================== PROGRESS GAUGE — BAR ==================== -->
<div data-composition-id="gauge-bar" data-width="1920" data-height="1080">
  <style>
    [data-composition-id="gauge-bar"] {
      --bg: #0a0f1a;
      --track: #1a2035;
      --fill-normal: #00e68a;
      --fill-danger: #ff3355;
      --label-color: #e8e6e1;
      --gauge-fill: var(--fill-normal);
      width: 1920px;
      height: 1080px;
      background: var(--bg);
      overflow: hidden;
      position: relative;
    }

    .bar-scene {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      gap: 48px;
      padding: 120px 200px;
      box-sizing: border-box;
    }

    /* Top value area */
    .bar-value-area {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .bar-number {
      font-family: "DIN Alternate", "Space Grotesk", "Inter", sans-serif;
      font-size: 140px;
      font-weight: 800;
      color: var(--label-color);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    .bar-number .bar-suffix {
      font-size: 56px;
      font-weight: 400;
      color: var(--gauge-fill);
      margin-left: 4px;
    }

    .bar-label {
      font-family: "Inter", "Space Grotesk", sans-serif;
      font-size: 28px;
      font-weight: 400;
      color: var(--label-color);
      letter-spacing: 6px;
      text-transform: uppercase;
      opacity: 0.7;
    }

    /* Progress bar area */
    .bar-track-area {
      width: 100%;
      max-width: 1400px;
    }

    .bar-track {
      width: 100%;
      height: 48px;
      background: var(--track);
      border-radius: 24px;
      position: relative;
      overflow: visible;
    }

    .bar-fill {
      height: 100%;
      width: 0%;            /* GSAP animates this */
      background: var(--gauge-fill);
      border-radius: 24px;
      position: relative;
      box-shadow: 0 0 30px var(--gauge-fill), 0 0 60px color-mix(in srgb, var(--gauge-fill) 40%, transparent);
    }

    /* Gradient highlight inside the bar */
    .bar-fill::after {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      width: 120px;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25));
      border-radius: 0 24px 24px 0;
    }

    /* Glowing dot at the end of the bar */
    .bar-fill-dot {
      position: absolute;
      top: 50%;
      right: -8px;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      background: var(--gauge-fill);
      border-radius: 50%;
      box-shadow: 0 0 20px var(--gauge-fill), 0 0 50px var(--gauge-fill);
    }

    /* Ticks */
    .bar-ticks {
      width: 100%;
      max-width: 1400px;
      display: flex;
      justify-content: space-between;
      margin-top: 16px;
      padding: 0 4px;
    }

    .bar-tick-label {
      font-family: "Inter", "Space Grotesk", sans-serif;
      font-size: 18px;
      font-weight: 300;
      color: rgba(232, 230, 225, 0.35);
      font-variant-numeric: tabular-nums;
    }

    /* Danger mode glow background */
    .bar-danger-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 1600px;
      height: 400px;
      background: radial-gradient(ellipse, rgba(255, 51, 85, 0.08), transparent 70%);
      opacity: 0;
      pointer-events: none;
    }

    /* Decorative lines */
    .bar-deco-line {
      position: absolute;
      width: 1400px;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(232, 230, 225, 0.06), transparent);
    }

    .bar-deco-line.top { top: 180px; left: 50%; transform: translateX(-50%); }
    .bar-deco-line.bottom { bottom: 180px; left: 50%; transform: translateX(-50%); }
  </style>

  <div class="bar-scene">
    <!-- Decorative lines -->
    <div class="bar-deco-line top"></div>
    <div class="bar-deco-line bottom"></div>

    <!-- Danger glow -->
    <div class="bar-danger-glow" id="bar-glow"></div>

    <!-- Value -->
    <div class="bar-value-area">
      <div class="bar-number">
        <span id="bar-counter">0</span><span class="bar-suffix">%</span>
      </div>
      <div class="bar-label" id="bar-label">Approval Rating</div>
    </div>

    <!-- Progress bar -->
    <div class="bar-track-area">
      <div class="bar-track">
        <div class="bar-fill" id="bar-fill">
          <div class="bar-fill-dot"></div>
        </div>
      </div>
      <div class="bar-ticks" id="bar-ticks-row"></div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <script>
    (function () {
      /* ── Config ── */
      var CFG = {
        style: "bar",
        min: 0,
        max: 100,
        current: 85,
        label: "Approval Rating",
        alertLevel: "danger"
      };

      var isDanger = CFG.alertLevel === "danger";
      var percent = (CFG.current - CFG.min) / (CFG.max - CFG.min);

      /* ── Set colors ── */
      var comp = document.querySelector('[data-composition-id="gauge-bar"]');
      comp.style.setProperty("--gauge-fill", isDanger ? "var(--fill-danger)" : "var(--fill-normal)");

      /* ── Label and ticks ── */
      document.getElementById("bar-label").textContent = CFG.label;
      document.getElementById("bar-counter").textContent = "0";

      var ticksRow = document.getElementById("bar-ticks-row");
      var TICK_STEP = (CFG.max - CFG.min) / 10;
      for (var v = CFG.min; v <= CFG.max; v += TICK_STEP) {
        var lbl = document.createElement("div");
        lbl.className = "bar-tick-label";
        lbl.textContent = Math.round(v);
        ticksRow.appendChild(lbl);
      }

      /* ── Elements ── */
      var barFill = document.getElementById("bar-fill");
      var counter = document.getElementById("bar-counter");
      var glow = document.getElementById("bar-glow");

      /* ── Target width ── */
      var targetWidth = percent * 100;
      var overshootWidth = Math.min(targetWidth + 6, 100); // overshoot 6%

      /* ── Timeline ── */
      var tl = gsap.timeline({ paused: true });
      var DURATION = 4.5;

      /* Phase 1: progress bar surge (0s → 1.8s) */
      tl.from(barFill, {
        width: "0%",
        duration: 1.8,
        ease: "power4.in"
      }, 0.15);

      /* Phase 2: overshoot + rebound */
      tl.to(barFill, {
        width: overshootWidth + "%",
        duration: 0.12,
        ease: "power2.in"
      }, 1.95);
      tl.to(barFill, {
        width: targetWidth + "%",
        duration: 0.4,
        ease: "elastic.out(1, 0.4)"
      }, 2.07);
      // Micro-tremor
      tl.to(barFill, {
        width: (targetWidth + 1.5) + "%",
        duration: 0.1,
        ease: "power2.out"
      }, 2.55);
      tl.to(barFill, {
        width: targetWidth + "%",
        duration: 0.18,
        ease: "power2.out"
      }, 2.65);

      /* Phase 3: number sync */
      tl.from({ val: CFG.min }, {
        val: CFG.current,
        duration: 1.8,
        ease: "power4.in",
        onUpdate: function () {
          counter.textContent = Math.round(this.targets()[0].val);
        }
      }, 0.15);

      var counterProxy = { val: CFG.current };
      tl.to(counterProxy, {
        val: CFG.current + 3,
        duration: 0.1,
        ease: "power2.in",
        onUpdate: function () {
          counter.textContent = Math.round(counterProxy.val);
        }
      }, 1.95);
      tl.to(counterProxy, {
        val: CFG.current,
        duration: 0.4,
        ease: "elastic.out(1, 0.5)",
        onUpdate: function () {
          counter.textContent = Math.round(counterProxy.val);
        }
      }, 2.05);

      /* Phase 4: label entrance */
      tl.from("#bar-label", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out"
      }, 0.4);

      /* Phase 5: decorative line entrance */
      tl.from(".bar-deco-line", {
        scaleX: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out"
      }, 0.05);

      /* Phase 6: tick entrance */
      tl.from(".bar-tick-label", {
        opacity: 0,
        y: 10,
        duration: 0.3,
        stagger: { each: 0.03, from: "start" },
        ease: "power2.out"
      }, 0.3);

      /* Phase 7: danger mode breathing light */
      if (isDanger) {
        var breatheCycles = Math.ceil((DURATION - 2.8) / 1.2);
        tl.from(glow, {
          opacity: 0,
          duration: 0.6,
          ease: "sine.inOut",
          repeat: breatheCycles,
          yoyo: true
        }, 2.8);

        // Bar height pulse
        tl.to(barFill, {
          height: "54px",
          duration: 0.6,
          ease: "sine.inOut",
          repeat: breatheCycles,
          yoyo: true
        }, 2.8);

        // End glowing dot flash
        tl.to(".bar-fill-dot", {
          boxShadow: "0 0 30px var(--fill-danger), 0 0 80px var(--fill-danger)",
          duration: 0.6,
          ease: "sine.inOut",
          repeat: breatheCycles,
          yoyo: true
        }, 2.8);
      }

      /* ── Register timeline ── */
      window.__timelines = window.__timelines || {};
      window.__timelines["gauge-bar"] = tl;
    })();
  </script>
</div>
```

## Animation Timing Description

### General timeline structure (total duration 4.5s)

```
Timeline (s)  0.0        0.15              1.8  1.95  2.1  2.55  2.67       2.8        4.5
              │          │                  │    │     │    │     │          │           │
Ticks/lines   ███ entrance (from, stagger)
Label         ····→███ entrance                                             ·····→
Arc/bar       ····→ ████████████████████████ surge→↩ spring back  tremor1  tremor2    ·····→
Number        ····→ 0 →→→→→→→ 85          88→↩ 85    ·····→          ·····→
Breath light  ················································ → pulse start (yoyo) → pulse continues
```

### Surge phase (0.15s → 1.8s)

- Arc `strokeDasharray` surges from 0 to the target value / bar `width` surges from 0% to the target %
- The number increments in sync from min to current
- Easing: `power4.in` — slow then fast, simulating the sensation of accelerating surge

### Overshoot rebound phase (1.8s → 2.8s)

1. **Impact** (1.95s, 0.12s): the arc/bar flies to a position 6-8% above target, the number flies to +3
2. **Spring rebound** (2.1s, 0.35-0.4s): springs back to the target value using `elastic.out(1, 0.4)` — produces 2-3 visible oscillations
3. **Micro-tremor** (2.55s): one more extremely small amplitude jitter (2%), reinforcing the physical feel of "settling"

### Danger mode (2.8s → end)

- Breathing-light outer ring / background glow: `opacity` oscillates between 0-1, `sine.inOut` easing, one cycle per 0.6s
- Arc thickness / bar height pulse in sync
- The end glowing dot's shadow range expands
- Repeat count is computed from total duration: `Math.ceil((DURATION - 2.8) / 1.2)`, where 1.2s = one full yoyo cycle

## Tuning Guide

### Changing the surge speed

```js
// Slow surge (3s) — more like a countdown
tl.from(fillArc, { attr: { "stroke-dasharray": "0 " + CIRCUMFERENCE }, duration: 3.0, ease: "power3.in" }, 0.15);

// Ultra-fast surge (0.8s) — stronger impact
tl.from(fillArc, { attr: { "stroke-dasharray": "0 " + CIRCUMFERENCE }, duration: 0.8, ease: "power4.in" }, 0.15);
```

### Adjusting the overshoot magnitude

```js
// Larger overshoot (15%)
var overshootDash = CIRCUMFERENCE * Math.min(percent + 0.15, 1.0);

// No overshoot — arrive directly
// Remove the overshoot phase tween and keep only phase 1
```

### Changing colors

```js
// Just modify the CSS variables
comp.style.setProperty("--gauge-fill", "#f59e0b");  // amber
comp.style.setProperty("--gauge-fill", "#8b5cf6");  // purple
comp.style.setProperty("--gauge-fill", "#06b6d4");  // cyan
```

### Adjusting the danger pulse frequency

```js
// Faster pulse (0.4s cycle, stronger tension)
var breatheCycles = Math.ceil((DURATION - 2.8) / 0.8);
tl.from(glow, { opacity: 0, duration: 0.4, ease: "sine.inOut", repeat: breatheCycles, yoyo: true }, 2.8);

// Slower pulse (1.2s cycle, oppressive feel)
var breatheCycles = Math.ceil((DURATION - 2.8) / 2.4);
tl.from(glow, { opacity: 0, duration: 1.2, ease: "sine.inOut", repeat: breatheCycles, yoyo: true }, 2.8);
```

### Number formatting

```js
// Show one decimal place
onUpdate: function () {
  counter.textContent = this.targets()[0].val.toFixed(1);
}

// Show the raw value (not a percentage)
// Modify the suffix element: <span class="gauge-suffix"></span> or <span class="gauge-suffix">k</span>
```

### Embedding as a sub-composition

Wrap the code in a `<template>` and remove the size attributes from the outer `data-composition-id`:

```html
<template id="gauge-circle-template">
  <div data-composition-id="gauge-circle">
    <!-- Styles and scripts as above, but data-width / data-height are not needed -->
  </div>
</template>

<!-- Reference within the parent composition -->
<div
  id="el-gauge"
  data-composition-id="gauge-circle"
  data-composition-src="compositions/gauge-circle.html"
  data-start="0"
  data-duration="4.5"
  data-track-index="1"
></div>
```

### Adapting to different resolutions

The component uses `px` to define absolute dimensions to match 1920x1080. To adapt for portrait (1080x1920):

- circle: reduce `.gauge-ring-container` to `420px x 420px`, number `100px`
- bar: adjust `padding: 160px 80px`, progress bar width `max-width: 800px`, number `100px`
