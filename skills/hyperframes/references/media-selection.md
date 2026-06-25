<!-- Derived from heygen-com/hyperframes (Apache-2.0), commit e59089bf. Modified by zflow-skills (Min Li, Zhuoran Lin). -->

# Media Selection Guide

Choose the right visual medium based on **two dimensions**: the overall visual style of the composition AND the content nature of each scene.

## Dimension 1: Visual Style Sets the Default Medium

The composition's visual style (from design.md or user direction) determines the **dominant medium family**. Individual scenes can deviate, but the default should match the style:

| Visual style | Default medium | Why |
|---|---|---|
| Cartoon / animation / illustration | **Vector + CSS/SVG** | Flat art, drawn aesthetic, character illustration |
| Cinematic / documentary / live-action | **Video + Image** | Real-world footage, photographic feel |
| Data / analytical / technical | **CSS/SVG + text** | Charts, diagrams, precision visuals |
| Editorial / magazine | **Image + text** | Photography-forward, typographic layouts |
| Abstract / artistic | **CSS/SVG + generative** | Code-drawn patterns, gradients, geometric shapes |

If the user asks for "动画效果" or "卡通风格", the entire composition defaults to vector/CSS-drawn. Stock footage in a cartoon composition looks like a clip-art accident.

## Dimension 2: Per-Scene Content Nature

Within the style's medium family, pick the specific medium per scene based on what the content is doing:

| Content nature | Best medium | Why |
|---|---|---|
| Time passing, motion, life happening | **Video** | Conveys flow and immersion |
| Frozen memory, specific moment, nostalgia | **Image** | "Snapshot" feel, visual anchor |
| Abstract concept (brain, process, idea) | **Vector / icon** | Conceptual clarity |
| Data, numbers, comparisons, percentages | **CSS / SVG** | Frame-precise, animatable with GSAP |
| Emotional immersion ("being there") | **Video** | Living atmosphere |
| Analytical clarity (logic, reasoning) | **CSS / SVG / text** | No distraction from the argument |
| Cartoon narrative / character animation | **Vector / SVG** | Consistent drawn aesthetic |

## Rules

### 1. Content nature is a signal, not a rule

The table in Dimension 2 shows tendencies, not hard assignments. A data scene *usually* wants CSS/SVG, but if a stock video of a ticking clock makes the point better than a code-drawn gauge, use the video. A flashback *often* suits still images, but video montage works too. Use the matrix as a starting point, then let the specific content and available materials guide the final choice.

### 2. Never mix media types in parallel-positioned elements

Three cards in a row where two are images and one is video is inconsistent. Parallel elements with the same visual role must use the same medium.

**WRONG:** Image | Image | Video (side by side, same layout role)
**RIGHT:** Video background + text overlay, or 3 images in a grid, or 3 CSS-drawn cards

### 3. Video is versatile — not just background

Video is the most expensive asset in materials.json. Use it with intention and give it visual weight:

- **Scene background** — full-frame video with dark gradient overlay for readability. But don't default to crushing it at 15% opacity — let the footage breathe. Start at 40-60% visibility, then apply a gradient overlay only where text sits.
- **Primary subject** — video AS the focal point (e.g., a trader reacting, a process unfolding). Text plays a supporting role around it.
- **Transition bridge** — a short video clip that carries the viewer between scenes (e.g., market open bell → trading floor → closing bell).
- **Split-frame partner** — video on one side, text/data on the other, each given equal visual weight.

**Anti-pattern:** Treating every video as a barely-visible background wash. If the viewer can't tell it's video, use an image instead — it's cheaper and sharper.

#### The action test: video vs image

Before assigning a video to a scene, apply this test: **does the content involve an action, process, or change that a still frame cannot convey?**

### 4. When materials.json has both videos and images

- **Read the materials list first** — know what's available before designing
- Prefer **video for scenes that benefit from motion** (backgrounds, subjects, transitions)
- Prefer **images for focused content** (cards, comparisons, specific subjects)
- Use **CSS/SVG for data** — never replace a chart with a stock photo

### 5. Explicit video evaluation per scene

When `materials.json` contains video assets, every scene in the expanded-prompt MUST explicitly state its video decision:

- **Using video?** Name the video file, state its role (background, subject, transition bridge, split-frame partner), and describe how it's treated visually (opacity level, overlay strategy, framing).
- **Skipping video?** State why — e.g. "no matching video for this topic", "data-heavy scene, CSS/SVG serves better", "video would compete with the focal point".

This prevents the common failure mode: videos exist in materials.json but are never evaluated, leaving downloaded clips unused. An explicit "no" is fine; a silent skip is the bug.

### 6. CSS/SVG for anything frame-precise

Gauges, progress bars, counters, charts, diagrams — these must respond to GSAP frame by frame. Always use code-drawn graphics for data visualization.

### 7. Minimalism is valid

Not every scene needs stock media. A well-designed text scene with CSS decoratives (glows, ghost text, hairline rules, accent shapes) can beat a generic stock photo. If no material in materials.json clearly matches the scene, use CSS-only design rather than forcing a weak match.

### 8. Cartoon/animated styles change everything

When the visual style is cartoon/illustration:
- **Vector illustrations replace photos and video** — use SVG drawings, icon illustrations, character art
- **CSS animation replaces stock footage motion** — bouncing, morphing, sliding vector elements
- **Data scenes still use CSS/SVG** — but with rounded, playful styling (filled shapes, bright colors, bounce easing)
- **Backgrounds are CSS gradients/patterns** — not stock footage

## Anti-patterns

- **Using only one medium for the entire composition** — unless the style demands it (cartoon = all vector), a 90s video with zero variation feels flat. Mix media where it makes sense.
- **Ghosting video into invisibility** — 10-20% opacity video backgrounds are indistinguishable from gradients. If the footage doesn't read as video, use an image instead
- **Ignoring available materials** — materials.json exists for a reason; use it
- **Data with stock photos when CSS/SVG would be clearer** — "20% vs 2%" needs gauges/charts, not photos of children. But if you have a great stock video that makes the data visceral, that's also valid.
- **Stock footage in a cartoon composition** — breaks the visual language entirely
- **Forcing all media types** — not every composition needs video + image + CSS in equal measure. Let content decide the ratio.
