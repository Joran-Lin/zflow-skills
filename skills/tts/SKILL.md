---
name: tts
description: >
  Video voice generation. Reads narration text from content-plan.json,
  self-splits into sentences, generates TTS audio per sentence, inserts
  natural pauses between sentences, concatenates the full audio, and
  computes block-level timestamps.
  Outputs audio.mp3 + block-timing.json.
version: 1.0.0
---

<HARD-RULE>
**No cross-project peek:** When working on project X (`output/X/`), NEVER read files from `output/<other-project>/`. Only read `output/X/**` and this skill's own files. Reading other projects' generated outputs causes style convergence.
</HARD-RULE>

# TTS (Speech Synthesis)

Video voice generation skill. Generates audio sentence by sentence and concatenates it, with support for natural pauses and block-level timestamps.

## Supported TTS Engines

Selected via the `ttsProvider` field in brief.json (or CLI `--provider`), default `edge`:

| Engine | Characteristics | Requires Key |
|--------|----------------|--------------|
| **edge** (default) | Edge TTS, free, no key required, 6 Chinese voices | None |
| **zhipu** | Zhipu GLM-TTS, refined Chinese voices, reuses `ZHIPU_API_KEY` | `ZHIPU_API_KEY` |
| **minimax** | MiniMax, 100+ voices, controllable emotion/intonation, outstanding audio quality | `MINIMAX_API_KEY` |

> All three engines use **per-sentence synchronized generation + concurrency**, and all ultimately output 24kHz mono mp3. The `voice` value varies by engine; see each engine's voice table (run `node skills/tts/scripts/build-pipeline-tts.mjs --help` to view all engines & voices).

**Pre-flight:** Before first use, run `node scripts/check-env.mjs` to ensure Node.js and `ffmpeg/ffprobe` are installed; the `edge` engine also requires the `ws` module; the `zhipu`/`minimax` engines require the corresponding API Key to be written into `.env`.

## Scope

**This skill does:**
- Self-split the narration text into sentences (15-30 characters)
- Generate TTS audio per sentence
- Determine pause duration based on content
- Concatenate the full audio
- Compute block-level timestamps
- Output block-timing.json

**This skill does NOT:**
- Modify the text content
- Generate HTML or video
- Provide word-level timestamps

## Prerequisites

- `ffmpeg` installed and on PATH (including ffprobe)
- `ws` npm package (`npm install`, already included in the project root's package.json)

## Inputs

- `content-plan.json` — the rewritten narration text (`narration` field)
- `brief.json` — requirement config (provides parameters such as voice, speed)

## Workflow

### Phase 1: Read Configuration

1. Read the `narration` field from `content-plan.json`
2. Read `brief.json` (if it exists)
3. Confirm the TTS parameters:
   - `ttsProvider`: read from brief.json (default `edge`, options `edge` / `zhipu` / `minimax`)
   - `voice`: read from brief.json, **interpreted according to the chosen engine** (edge default `yunxi`, zhipu default `tongtong`, minimax default `male-qn-qingse`)
   - `speed`: read from brief.json (default 1.0)
   - `output-dir`: output directory (default output)
4. If the engine is `zhipu` / `minimax`, confirm the corresponding API Key is ready; otherwise give a clear message and abort

> **Phases 2–5 are fully automated by the orchestrator script.** Run it once to produce `audio.mp3` + `blocks/*.mp3` + `block-timing.json` in a single pass. The phases below describe what the script does internally (so you understand the contract), not steps to run by hand.

```bash
# Run the full pipeline for a project:
node skills/tts/scripts/build-pipeline-tts.mjs --project <output-dir>
```

- Reads `content-plan.json` (narration) and `brief.json` (`ttsProvider`/`voice`/`speed`) from `<output-dir>`.
- Override briefly at the CLI: `--provider edge|zhipu|minimax`, `--voice <id>`, `--speed <n>`.
- `<output-dir>` defaults to `output`. List all engines & voices with `--help`.

### Phase 2: Sentence Splitting (automatic)

Split the full narration into 15-30 character sentences according to natural semantics:

**Splitting rules:**
- Prefer to split at commas, periods, question marks, and exclamation marks
- 15-30 characters per sentence, with complete semantics
- Ensure each sentence can be read in a single breath
- Break long sentences at commas; short sentences can be merged (no more than 30 characters)

**Logical boundary rules (hard constraint):**
- Blank lines (`\n\n`) in the narration are logical segment markers, representing boundaries between different arguments/paragraphs
- **A blank line is a hard boundary for block splitting**: a single block must never span a blank line, i.e. the end of argument A and the beginning of argument B must never appear in the same block
- Sentences immediately before or after a blank line must not be merged into the same block even if they are under 15 characters
- The blank line itself does not generate a block, but it produces a longer pause during concatenation (see the pause rules in Phase 3)

**On splitting within the same argument**: The blank line is a hard boundary, but it is not the only splitting criterion. Within the same argument (the text between two blank lines), the text is still split into multiple blocks by the 15-30 character rule. A single argument may produce 3-5 blocks, each 15-30 characters. The role of the blank line is to **prevent cross-argument merging**, not to turn the entire argument into a single block.

**Sentence splitting priority**: logical boundary > character range > punctuation position

The orchestrator script assigns each sentence a blockId (`blk-001`, `blk-002`, …) automatically.

### Phase 3: Generate Audio Per Sentence (automatic)

For each block, the orchestrator script does all of the following internally — you do not run these steps by hand:
1. Synthesizes each block via the selected engine (per-sentence, concurrent up to the engine's `concurrency`).
2. Saves each block to `<output-dir>/blocks/<blockId>.mp3` (24kHz mono mp3).
3. Probes each block's duration with `ffprobe`.

**Pause rules** (the script inserts these automatically, determined by content):

| Content characteristic | Inter-sentence pause | Notes |
|------------------------|----------------------|-------|
| Contains data/formulas/core facts | 1.0s | Give the audience time to digest |
| Enumeration, fast-paced information | 0.3s | Compact feel |
| General narration | 0.6s | Standard pause |

**Special intervals**:
- Blank lines (logical paragraph boundaries) in the narration → 1.5s of silence (major topic transitions, e.g. from reason 1 to reason 2, from hook to body)
- Inter-sentence within the same argument → 0.6s of general narration as per the table above
- Before the first sentence → no silence

### Phase 4: Concatenate Audio (automatic)

Use ffmpeg to concatenate all audio segments and silent intervals into the complete audio.mp3:

The orchestrator script generates the per-pause silence segments (24kHz mono mp3, matching engine output) and concatenates `silence + block` in order via ffmpeg `concat`, producing `<output-dir>/audio.mp3`. This is fully internal — you do not run ffmpeg by hand.

### Phase 5: Generate block-timing.json (automatic)

The script accumulates each block's `silenceBefore` + `audioDuration` into precise start/end times and writes `block-timing.json`:

```json
{
  "mode": "tts",
  "blocks": [
    {
      "blockId": "blk-001",
      "text": "你有没有发现，小时候一个暑假感觉有一辈子那么长，",
      "startTime": 0.0,
      "endTime": 2.1,
      "audioFile": "blocks/blk-001.mp3",
      "audioDuration": 2.1
    },
    {
      "blockId": "blk-002",
      "text": "但现在一整年嗖地就没了？",
      "startTime": 3.1,
      "endTime": 5.0,
      "audioFile": "blocks/blk-002.mp3",
      "audioDuration": 1.9,
      "silenceBefore": 1.0
    }
  ],
  "totalDuration": 45.2
}
```

## Output Files

| File | Description |
|------|-------------|
| `audio.mp3` | The fully concatenated audio file |
| `blocks/*.mp3` | Individual audio segment for each block |
| `block-timing.json` | Precise start and end times of each block |

## Completion Message

After TTS generation is complete, inform the user:

```
✅ TTS generation done! audio.mp3 + block-timing.json are ready.

Next:
  /hyperframes — generate the HTML composition (needs block-timing.json + materials.json)

💡 If material collection (/material) is not yet complete, finish it before entering /hyperframes
💡 Material collection and voice generation can run in parallel; enter /hyperframes only after BOTH are done
```

## Troubleshooting

- **Missing dependency**: Run `npm install` in the project root (the `edge` engine depends on the `ws` module)
- **ffmpeg concatenation failure**: Ensure all mp3 files have a consistent format (same sample rate, same channel) — all engines uniformly output 24kHz mono mp3, so this should not normally be an issue
- **edge engine 429 / connection failure**: Temporary rate-limiting or network jitter from the Microsoft service; the script has built-in backoff retry; on repeated failures, switch to `zhipu`/`minimax`
- **zhipu engine auth failure (401/403)**: Check the `ZHIPU_API_KEY` in `.env` (also used for image generation); if invalid, obtain a new one at https://open.bigmodel.cn
- **minimax engine auth failure (1004)**: Check the `MINIMAX_API_KEY` in `.env`; rate-limiting/TPM (1002/1039) has built-in exponential backoff retry
- **Illegal character limit exceeded**: Zhipu/minimax impose a proportional limit (<=10%) on control characters and the like; content-plan already normalizes the text format, so this should not normally be triggered

## Related Skills

- [content-plan](../content-plan/SKILL.md) — narration text rewriting
- [hyperframes](../hyperframes/SKILL.md) — HTML composition (consumes block-timing.json)
- [video-brief](../video-brief/SKILL.md) — requirement collection (provides voice/speed parameters)
