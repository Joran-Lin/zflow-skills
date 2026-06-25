<!-- SPDX-License-Identifier: Apache-2.0. Copyright (c) 2026 Min Li, Zhuoran Lin <zhuoran.lin@z.ai>. Original work of zflow-skills (not derived from upstream). -->

# Component Library

Ready-to-use recipes for visualization components common in explainer/educational videos. Each component ships with complete HTML+CSS+GSAP code that can be copied directly into a composition; adjust colors in tandem with the DESIGN.md palette.

## Usage

Before authoring scene HTML, check whether a matching component exists. When matching, you **must**:
1. Read the corresponding component documentation
2. Reuse its HTML structure and CSS layout patterns
3. Reuse the GSAP animation choreography (entrance style, easing functions, timing rhythm)
4. Adjust colors and font sizes per DESIGN.md
5. Adjust parameters to fit the actual content (e.g., number of labels, magnitude of values)

**Do not** copy a component's code and then substantially rework its structure — the core value of a component lies in its HTML structure and animation choreography. Only change colors and parameter values.

## Three Categories

### Structure & Logic — make abstract concepts concrete

| Component | Use cases | Keywords |
|-----------|-----------|----------|
| [schematic-callout](schematic-callout.md) | Break down structures, annotate parts | breakdown, annotation, callout, lead-line, structure, part, anatomy |
| timeline-axis | Historical evolution, technology progression, event sequence | timeline, progression, evolution, history, stage (planned) |
| versus-split | Compare two solutions, two theories | comparison, vs, contrast, difference, pros-and-cons (planned) |

### Flow & Data Dynamics — bring static data to life

| Component | Use cases | Keywords |
|-----------|-----------|----------|
| [progress-gauge](progress-gauge.md) | Progress, ratio, danger level, countdown | progress, percentage, gauge, danger, approval rating, KPI |
| pipeline-flow | Process steps, conversion funnel, data transfer | pipeline, funnel, flow, conversion, steps (planned) |
| balance-scale | Supply and demand, balance of power, trade-off measurement | scale, balance, counterbalance, trade-off (planned) |

### Narrative & Atmosphere — anchor the audiovisual experience

| Component | Use cases | Keywords |
|-----------|-----------|----------|
| [quote-card](quote-card.md) | Famous quotes, core definitions, climax viewpoints | quote, definition, golden line, theorem, key viewpoint |
| avatar-bubble | Character dialogue, lively narration | dialogue, bubble, character, cartoon (planned) |
| [fx-overlay](fx-overlay.md) | Ambient atmosphere enhancement | filter, atmosphere, digital rain, starfield, grid (pure CSS, overlays any scene) |

## Standard Format for Component Templates

Each component document follows a unified structure:

1. **Effect description** — a description of the visual effect
2. **Use cases** — when to choose it, triggering keywords
3. **AI input interface** — configuration parameters in JSON format
4. **Complete code** — HTML+CSS+GSAP code ready to copy
5. **Animation timing notes** — timeline choreography table
6. **Tuning guide** — customization parameters for colors, speed, sizing, etc.

## Color Conventions

Components default to a dark tech palette:
- Dark background: `#07090f` / `#0a0f1a`
- Accent gold: `#c8a45c`
- Primary text: `#e8e6e1`
- Auxiliary colors: `#4a7dff` (blue), `#00e68a` (green), `#ff3355` (red/danger)

All components use CSS custom properties (`--accent`, `--bg`, etc.) to make palette overrides via DESIGN.md straightforward.
