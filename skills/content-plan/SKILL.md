---
name: content-plan
description: >
  Video narration generation. If the user only provides a topic, it is first
  auto-expanded into a full text; the skill then performs oral-style
  rewriting, sentence optimization, and audience adaptation to produce a
  narration text suited for video voice-over.
version: 1.0.0
---

<HARD-RULE>
**No cross-project peek:** When working on project X (`output/X/`), NEVER read files from `output/<other-project>/`. Only read `output/X/**` and this skill's own files. Reading other projects' generated outputs causes style convergence.
</HARD-RULE>

# Content Plan

Video narration rewriting skill. Transforms the source text into an oral-style text suited for video voice-over.

## Scope

**This skill does:**
- Oral-style rewriting (written style → spoken style)
- Sentence optimization (splitting long sentences into short ones)
- Hook design (golden first 3 seconds)
- Outro design (ending strategy)
- Audience adaptation
- Preserve core formulas and facts

**This skill does NOT:**
- Design the visual plan (handled by /hyperframes)
- Plan the scene structure (decided autonomously by /hyperframes)
- Annotate emotion, pacing, or visual cues (inferred by downstream models)

## Input

Confirm the following files exist before executing:
- `brief.json` — video requirement config (target audience, style, language, sourceType, etc.)
- `brief.json.sourceText` — the user's original text content (fulltext mode) or topic keywords (topic mode)

**If `sourceType = topic`, the user does not need to provide full text** — this skill auto-expands based on topic + audience.

## Workflow

### Phase 1: Analyze the source text

Read brief.json and the source text, then analyze:

1. **Determine the input type**: check `brief.json.sourceType`
   - `fulltext` (default) — the user provided full text, proceed to the rewriting flow
   - `topic` — the user only provided a topic, proceed to the expansion flow (see Phase 1B)

2. Text length, topic, complexity
3. Whether it contains math formulas, technical terms, or data
4. The structure of the source text (paragraphs, headings, etc.)
5. targetAudience, visualStyle, and language in brief.json

### Phase 1B: Topic expansion (only when sourceType = topic)

When the user only provides a topic (e.g. "making money", "time management", "AI trends"), you must first expand it into a complete narration draft before entering Phase 2 rewriting.

**Expansion principles:**

1. **Understand the topic** — extract the topic keywords from brief.json's sourceText, and determine the angle based on targetAudience and language
2. **Determine the content structure** — design 3-5 core arguments/paragraphs around the topic, forming a complete narrative arc:
   - Hook: introduce the topic with a question, a striking fact, or a pain point
   - Body: each argument is its own paragraph, supported by data or a concrete analogy
   - Outro: summarize and elevate, or a call to action
3. **Target duration** — short video (9:16) targets 60-120 seconds, mid-length video (16:9) targets 120-300 seconds. Estimate word count at ~4 chars/second
4. **Content quality** — the expanded content must carry real informational weight, not empty "everyone must work hard" platitudes. Each argument must have:
   - Concrete facts/data/cases
   - A logically clear cause-and-effect chain
   - Actionable insights or a fresh perspective
5. **Audience adaptation** — the same topic means completely different things to different audiences:
   - "Making money" + general audience → practical personal-finance tips
   - "Making money" + young people → side hustles / investment basics
   - "Making money" + professionals → career advancement / income structure
   - "Making money" + technical audience → tech monetization / open-source commercialization

**After expansion is complete, treat the expanded text as the source text and enter the normal Phase 2 rewriting flow.** Do not oral-style the expansion itself — that is Phase 2's job.

### Phase 2: Rewriting

#### Hook (first 3 sentences or fewer)
- An attention-grabbing opening: question, bold assertion, striking fact, or story intro
- No more than 3 sentences, transitioning naturally into the body

#### Oral-style rewriting
- Written style → spoken style (e.g. "therefore" → "so", "nevertheless" → "but")
- Split long, hard sentences into short ones of 15-30 chars
- Ensure each sentence can be read in a single breath

#### Reduction and analogy
- Identify abstract concepts and design concrete analogies
- Embed analogies naturally into the text; do not label them separately

#### Audience adaptation
| Audience | Language style |
|----------|---------------|
| General | Accessible, vivid |
| Young people (18-35) | Relaxed, internet-fluent |
| Professionals | Formal, concise |
| Children | Minimal, personified |
| Technical audience | Technical terms may be kept |

#### Outro (last 3 sentences or fewer)
- Summary recap / call to action / open question / emotional elevation
- No more than 3 sentences, a clean close

#### Preservation constraints
- Math formulas must be preserved verbatim
- Core facts and data (years, percentages, definitions) must not be modified
- When the target audience is a technical audience, technical terms are kept

#### Viewpoint fidelity (hard constraint)

The goal of rewriting is to "say it differently," not to "mean something different." Each original viewpoint must satisfy the following after rewriting:

1. **Logical self-sufficiency**: the rewritten expression must not require the reader to "fill in" context to understand what the viewpoint is saying. If the original says "B because of A," the rewrite cannot keep only B and drop A's causal logic.
2. **Viewpoint mapping**: every key argument/conclusion in the original must have a corresponding complete expression in the narration. A conclusion that requires premise support must not be reduced to an isolated assertion.
3. **Reduce dimension, not quality**: oral-style ≠ vague. "Proportion theory" may become "the proportion of your life that time takes up", but must not become "it's just a proportion thing" — a statement that says nothing.
4. **No spinning**: if removing a rewritten sentence does not affect comprehension, that sentence is spinning — either add substance or delete it.

**Self-check method**: compare the source and the rewrite paragraph by paragraph, and for each original viewpoint ask:
- After rewriting, can the reader understand what this viewpoint is saying?
- Are the reasons/premises supporting this viewpoint still present?
- Is the rewritten wording vaguer than the original? If so, rewrite it.

### Phase 3: Output

```json
{
  "narration": "你有没有发现，小时候一个暑假感觉有一辈子那么长，但现在一整年嗖地就没了？这不是错觉，背后有三个科学原因。第一个原因，叫比例理论。对一个5岁的孩子来说，一年是他人生的20%。但对一个50岁的人来说，一年只是2%。同样的时间，在你生命里的权重完全不同。……"
}
```

Only one field: `narration` — the complete rewritten narration text.

**Logical paragraphing (hard constraint):** In the narration, different viewpoints/paragraphs must be separated by a blank line (`\n\n`). The blank line is a logical boundary marker: TTS uses it for block splitting, and hyperframes uses it as a reference for scene division.

Paragraphing rules:
- Each **independent argument** (e.g. "reason one", "reason two", different subsections) must be separated by a blank line
- Sentences within the same argument must **not** have a blank line between them; keep them coherent
- A blank line is required between hook and body, and between body and outro
- If the source has an explicit point-by-point/paragraph structure, the narration must reflect the same paragraphing

Example:
```
你有没有发现，小时候一个暑假感觉有一辈子那么长，但现在一整年嗖地就没了？这不是错觉，背后有三个科学原因。

第一个原因，叫比例理论。对一个5岁的孩子来说，一年是他人生的20%。但对一个50岁的人来说，一年只是2%。同样的时间，在你生命里的权重完全不同。

第二个原因，是大脑的自动巡航模式。当你对生活越来越熟悉，大脑就不再刻意记录新体验，时间感自然就模糊了。
```

**Punctuation constraint (TTS-compatible):** Quotes in the narration must consistently use `「」` (Chinese corner brackets). Do **not** use `""` (Chinese curly quotes) or `""` (English curly quotes), because they are misinterpreted when passed on the shell command line, causing errors. The same applies to other special symbols: avoid `$` `` ` `` `\` and other characters that have special meaning in the shell.

**Punctuation must match the language (hard constraint):** When the narration is in English (or any language written in the Latin script — German, French, Spanish, etc.), all punctuation must be **half-width ASCII**: `;` (not `；`), `,` (not `，`), `:` (not `：`), `.` (not `。`), `?` (not `？`), `!` (not `！`), `(` `)` (not `（` `）`). Full-width Chinese punctuation is shaped for CJK grids and looks broken inside Latin text. When the narration is in Chinese, use full-width CJK punctuation as usual. Read the `language` field in `brief.json` and match whichever script the text is written in.

Write content-plan.json to the current working directory (or the directory containing brief.json).

When done, prompt the user:

```
content-plan.json generated. Next, you can run these in parallel:
/tts — generate voice and timestamps
/material — collect materials
```

## Troubleshooting

- **Source text too short (<50 chars) and sourceType = fulltext**: expand the content appropriately, but do not add information the user did not provide
- **sourceType = topic (topic mode)**: this is normal — enter Phase 1B topic expansion, complete the content first, then rewrite
- **Source text too long (>2000 chars)**: trim to the core content, keeping the key information
- **Source text is already oral-style**: just check the sentence patterns and pacing; no major rewrite needed
- **Contains many formulas**: ensure each formula is clearly readable and not split across two sentences
- **Viewpoints are vague / say nothing**: check whether the source's causal chain or premises were cut. The rewrite should preserve the complete argument logic, not keep only the conclusion while dropping the "why"
- **The rewrite is harder to understand than the original**: this means the dimension was reduced too much. Oral-style makes the expression more natural, not the content more hollow

## Related Skills

- [video-brief](../video-brief/SKILL.md) — upstream requirement gathering
- [hyperframes](../hyperframes/SKILL.md) — HTML composition (reads narration text + block-timing)
- [tts](../tts/SKILL.md) — TTS voice generation (reads narration text, splits sentences itself)
- [material](../material/SKILL.md) — material collection (reads narration text)
