---
name: video-brief
description: >
  Video creation requirements collection. Collects target audience, video specs,
  visual style, voice preferences, and other details through interactive Q&A,
  then produces a structured brief.json for the downstream pipeline.
  Does not run the pipeline automatically — only outputs brief.json.
version: 1.0.0
---

<HARD-RULE>
**No cross-project peek:** When working on project X (`output/X/`), NEVER read files from `output/<other-project>/`. Only read `output/X/**` and this skill's own files. Reading other projects' generated outputs causes style convergence.
</HARD-RULE>

# Video Brief

A prerequisite skill for collecting video creation requirements. It gathers user preferences through multi-round interactive Q&A and produces a `brief.json` configuration file.

## Scope

**This skill does:**
- Interactively collect video creation requirements
- Generate a structured `brief.json` file
- Provide complete configuration for the downstream `/content-plan` step

**This skill does NOT:**
- Execute the video generation pipeline
- Generate scripts, audio, or video
- Call any API

## Workflow

When the user invokes `/video-brief`, use the `AskUserQuestion` tool to collect information step by step **in the following order**. At most 3 questions per round (limited by the tool).

---

### Round 1: Content and Audience

**Q1 — Video Content** (required)
> Please provide the video text (paste the full text directly), or give a path to a .txt / .md file, or just state a topic (e.g. "making money", "time management") and it will be auto-expanded into a full narration later.

**Q2 — Target Audience** (single choice, default: general)
| Option | Description |
|------|------|
| General (default) | General-purpose content for all ages and backgrounds |
| Young adults (18-35) | For younger audiences, can be more lively and edgy |
| Professionals | For working professionals, more formal and concise |
| Children | For children; needs to be more lively, high-contrast, large fonts |
| Technical | For developers/engineers, more hardcore and professional |

**Q3 — Content Language** (single choice, default: Chinese)
| Option | Description |
|------|------|
| Chinese (default) | Simplified Chinese |
| English | English |
| Chinese-English bilingual | Chinese-dominant, with key terms in English |

---

### Round 2: Video Specs

**Q4 — Aspect Ratio** (single choice, default: portrait 9:16)
| Option | Description |
|------|------|
| Portrait 9:16 (recommended) | Short-video platforms (Douyin, Kuaishou, Reels) |
| Landscape 16:9 | Standard video (Bilibili, YouTube) |
| Square 1:1 | Social media posts (Weibo, Instagram) |

**Q5 — Resolution** (single choice, default: 1080p)
| Option | Description |
|------|------|
| 720p | Fast preview, smaller file |
| 1080p (recommended) | Standard Full HD |
| 1440p | 2K HD |
| 4K | Ultra HD, slower to render |

**Q6 — Frame Rate** (single choice, default: 30fps)
| Option | Description |
|------|------|
| 24fps | Cinematic feel, slower pace |
| 30fps (recommended) | Balances smoothness and performance |
| 60fps | Ultra-smooth, for sports / fast-paced content |

---

### Round 3: Visual Style

**Q7 — Visual Style** (single choice, default: Soft Signal)
| Option | Description |
|------|------|
| Swiss Pulse | Clinical precision — for SaaS / data / developer tools |
| Velvet Standard | High-end classic — for luxury / enterprise / talks |
| Deconstructed | Industrial and raw — for tech launches / security / hardcore |
| Maximalist Type | Loud and dynamic — for major launches / events |
| Data Drift | Futuristic immersion — for AI / ML / frontier tech |
| Soft Signal (default) | Warm and friendly — for wellness / personal stories / branding |
| Folk Frequency | Cultural and colorful — for consumer apps / food / community |
| Shadow Cut | Dark cinematic — for dramatic reveals / investigative reports |


Visual style EN mapping table (`visualStyle` field value):
| EN name | EN name |
|--------|--------|
| Swiss Pulse | Swiss Pulse |
| Velvet Standard | Velvet Standard |
| Deconstructed | Deconstructed |
| Maximalist Type | Maximalist Type |
| Data Drift | Data Drift |
| Soft Signal | Soft Signal |
| Folk Frequency | Folk Frequency |
| Shadow Cut | Shadow Cut |

---

### Round 4: TTS Engine, Voice, and Speed

**Q8 — TTS Engine** (single choice, default: edge)
| Option | Description | Required Key |
|------|------|-----------|
| edge (default, free) | Edge TTS — free, no key needed, 6 Chinese voices, adequate quality | None |
| zhipu | Zhipu GLM-TTS — refined and natural Chinese voices, reuses ZHIPU_API_KEY | ZHIPU_API_KEY |
| minimax | MiniMax — 100+ voices, controllable emotion / intonation, outstanding quality | MINIMAX_API_KEY |

> The engine chosen here **locks** the voices available in Q9 — Q9 must show only this engine's voice table and accept only values from it. Do not select an engine whose key is not configured (it will fail with an auth error in /tts).

**Q9 — Voice** (single choice, default depends on Q8's engine)

Voices are **locked to the engine chosen in Q8**. This is a hard rule, not a suggestion:
1. Read `ttsProvider` from Q8's answer FIRST.
2. Show the user **only** the voice table for that engine — do NOT show voices from other engines, and do NOT defer to "next round".
3. Accept a value **only** from the matching table. If the user asks for a voice that belongs to a different engine, tell them it requires switching Q8's engine.

**If Q8 = `edge`** (default → xiaoxiao):

| Option | Edge Voice ID | Description |
|------|---------------|------|
| xiaoxiao (recommended) | zh-CN-XiaoxiaoNeural | Xiaoxiao — natural and friendly, fits most scenarios |
| xiaoyi | zh-CN-XiaoyiNeural | Xiaoyi — lively female voice, for young audiences |
| yunjian | zh-CN-YunjianNeural | Yunjian — passionate male voice, for major launches |
| yunxi | zh-CN-YunxiNeural | Yunxi — energetic male voice, for tech / business |
| yunyang | zh-CN-YunyangNeural | Yunyang — professional male voice, for workplace / formal |
| yunxia | zh-CN-YunxiaNeural | Yunxia — cute male voice, for light / playful content |

**If Q8 = `zhipu`** (Zhipu GLM-TTS, default → tongtong):

| Option | Description |
|------|------|
| tongtong (recommended) | Tongtong — default voice |
| chuichui | Chui-chui |
| xiaochen | Xiao-chen |
| jam | Dongdong Animal Circle Jam |
| kazi | Dongdong Animal Circle Kazi |
| douji | Dongdong Animal Circle Douji |
| luodo | Dongdong Animal Circle Luoduo |

**If Q8 = `minimax`** (default → male-qn-qingse; any system / cloned voice id may also be filled in):

| Option | Description |
|------|------|
| male-qn-qingse (recommended) | Young youthful male |
| female-shaonv | Young female |
| audiobook_male_1 | Audiobook male |
| audiobook_female_1 | Audiobook female |
| female-chengshu | Mature female |
| presenter_female / presenter_male | Presenter female / male |
| boyan_front | Boy voice |

> Full list: https://platform.minimaxi.com/faq/system-voice-id

**Q10 — Speaking Speed** (single choice, default: normal 1.0x)
| Option | Description |
|------|------|
| Slow 0.75x | For tutorials and explanatory content |
| Normal 1.0x (recommended) | Standard speed |
| Fast 1.25x | For fast-paced, information-dense content |
| Very fast 1.5x | Extremely fast, for short videos |
---

### Round 5: Render Quality

**Q11 — Render Quality** (single choice, default: standard)
| Option | Description |
|------|------|
| draft (fast preview) | Low quality, only for a quick effect check |
| standard (recommended) | Standard quality, suitable for daily use |
| high (high quality) | Highest quality, for official releases |

---

### Collection Complete: Generate brief.json

After all rounds, summarize the user's choices and write them into `brief.json`:

1. Compute `width` and `height` from aspect ratio + resolution:

| Ratio | Resolution | width | height |
|------|--------|-------|--------|
| 9:16 | 720p | 720 | 1280 |
| 9:16 | 1080p | 1080 | 1920 |
| 9:16 | 1440p | 1440 | 2560 |
| 9:16 | 4K | 2160 | 3840 |
| 16:9 | 720p | 1280 | 720 |
| 16:9 | 1080p | 1920 | 1080 |
| 16:9 | 1440p | 2560 | 1440 |
| 16:9 | 4K | 3840 | 2160 |
| 1:1 | 720p | 720 | 720 |
| 1:1 | 1080p | 1080 | 1080 |
| 1:1 | 1440p | 1440 | 1440 |
| 1:1 | 4K | 2160 | 2160 |

2. Write `brief.json` to the project root (or a user-specified output-dir)

**Full brief.json format:**

```json
{
  "sourceText": "the user's video text content or topic...",
  "sourceType": "fulltext",
  "targetAudience": "general",
  "aspectRatio": "9:16",
  "resolution": "1080p",
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "visualStyle": "Data Drift",
  "visualStyleCN": "Data Drift",
  "ttsProvider": "edge",
  "voice": "yunxi",
  "speed": 1.0,
  "renderQuality": "standard",
  "language": "zh"
}
```

**Field enum values:**

| Field | Allowed values |
|------|--------|
| `sourceType` | `fulltext`, `topic` |
| `targetAudience` | `general`, `young-adult`, `professional`, `children`, `technical` |
| `aspectRatio` | `9:16`, `16:9`, `1:1` |
| `resolution` | `720p`, `1080p`, `1440p`, `4K` |
| `fps` | `24`, `30`, `60` |
| `visualStyle` | `Swiss Pulse`, `Velvet Standard`, `Deconstructed`, `Maximalist Type`, `Data Drift`, `Soft Signal`, `Folk Frequency`, `Shadow Cut`, `custom:Playground` |
| `ttsProvider` | `edge`, `zhipu`, `minimax` (default `edge`; legacy brief.json without it stays fully compatible) |
| `voice` | Value depends on `ttsProvider`; see each engine's voice table |
| `speed` | `0.75`, `1.0`, `1.25`, `1.5` |
| `renderQuality` | `draft`, `standard`, `high` |
| `language` | `zh`, `en`, `zh-en` |

3. Confirm the brief.json contents with the user and show a key-config summary

---

### Completion Prompt

After generating brief.json, tell the user:

```
brief.json generated. Next, run the pipeline in order:

1. /content-plan — content planning
2. /tts — voice generation
3. /hyperframes — generate the HTML composition (autonomously designs visuals, outputs material-requests.json)
4. /material — material collection
5. /hyperframes — regenerate the composition (fold in the materials)
6. /check — validate the layout
7. /image-gen — generate AI images (if there are imageSlots)
8. render the video
```

## Troubleshooting

- **User skips all questions**: Generate brief.json with all defaults; only sourceText is required.
- **The text the user gave is a file path**: Read the .txt / .md file contents, put them into the sourceText field, and set sourceType to `fulltext`.
- **The user only gave a topic (e.g. "making money", "time management")**: Set sourceType to `topic`; `/content-plan` will auto-expand it into a full narration later.
- **sourceText is missing**: Prompt the user that they must provide the video text or topic.

## Related Skills

- [content-plan](../content-plan/SKILL.md) — Content planning (reads brief.json)
- [hyperframes](../hyperframes/SKILL.md) — HTML composition design (affected by visualStyle)
- [tts](../tts/SKILL.md) — Voice generation
