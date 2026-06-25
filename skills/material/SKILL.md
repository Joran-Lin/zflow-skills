---
name: material
description: >
  Collect visual materials (images + videos) from Pexels/Pixabay. Extracts search terms
  from the narration text in content-plan.json and gathers them into a flat material pool.
  Takes precedence over image-gen; falls back to AI image generation only when nothing is found.
version: 1.0.0
---

<HARD-RULE>
**No cross-project peek:** When working on project X (`output/X/`), NEVER read files from `output/<other-project>/`. Only read `output/X/**` and this skill's own files. Reading other projects' generated outputs causes style convergence.
</HARD-RULE>

# Material Collection

Search and download image/video materials from Pexels and Pixabay, output as a flat material pool.

## When to use

- After content-plan, before hyperframes
- Or after hyperframes generates material-requests.json (supplementary collection)
- Takes precedence over image-gen; falls back to AI image generation only when nothing is found

## Pipeline position

Material collection happens in two rounds:

```
/content-plan → content-plan.json (narration text)
     ↓
[Round 1] /material → materials.json (broad search from narration) ← this skill
     ↓
/tts → audio.mp3 + block-timing.json (can run in parallel)
     ↓
/hyperframes → freely pick assets from the pool
     ↓
     └→ material-requests.json (if asset supplementation is needed)
            ↓
     [Round 2] /material → supplement materials.json ← this skill
            ↓
     /image-gen → only handles fallback cases
```

## Workflow

### Step 1: Read narration + brief, generate search config

Read the `narration` field of `content-plan.json` and `brief.json`.

1. Read through the entire narration to understand the content theme and narrative arc
2. Identify visual-theme segments in the text (divided naturally by content)
3. Generate 2-3 sets of English search terms for each segment (2-4 words each)
4. Determine orientation: derive from `aspectRatio` in `brief.json`

**Search-term generation rules:**
- Extract **concrete visual nouns** from the text: people, objects, scenes, natural phenomena
- Skip purely abstract concepts ("metabolism", "cognitive function") → translate to concrete visuals ("brain scan", "neural network glowing")
- 2-4 English words per set, primarily noun phrases
- Add visual descriptors to improve quality: close-up, cinematic, dark background, aerial
- Try different angles for the same theme: close-up, wide shot, environmental

**style determination rules:**

| Content characteristic | style value | Search behavior |
|---------|----------|---------|
| People, objects, scenes, natural phenomena, real-life situations | `realistic` (default) | photos + videos |
| Icons, conceptual diagrams, process illustrations, abstract graphics | `illustration` | illustrations/vector |

Generate `materials-config.json`:

```json
{
  "projectDir": "output/<project>",
  "orientation": "portrait",
  "queries": [
    {
      "searchTerms": ["childhood summer nostalgic warm light", "clock time passing cinematic", "hourglass sand flowing close up"],
      "types": ["image", "video"],
      "style": "realistic"
    },
    {
      "searchTerms": ["child running happy sunset golden", "elderly person contemplation peaceful"],
      "types": ["image", "video"],
      "style": "realistic"
    }
  ]
}
```

Note: `queries` is a flat list, not bound to scenes. Each set of search terms collects materials independently.

### Step 2: Run the collection script

```bash
node skills/material/scripts/collect-materials.mjs --config materials-config.json
```

The script automatically:
- Searches Pexels + Pixabay in parallel (images + videos)
- Deduplicates
- Downloads to `materials/images/` and `materials/videos/`
- Validates video integrity
- Outputs `materials.json`

### Step 3: Review results

Read `materials.json` and check material quantity and quality. Report to the user.

## Output format

`materials.json` — a flat material pool, not bound to scenes:

```json
{
  "materials": [
    {
      "type": "image",
      "source": "pexels",
      "path": "materials/images/pexels-img-12345.jpg",
      "width": 3024,
      "height": 4032,
      "alt": "Pour over coffee brewing"
    },
    {
      "type": "video",
      "source": "pexels",
      "path": "materials/videos/pexels-vid-67890.mp4",
      "width": 3840,
      "height": 2160,
      "duration": 15,
      "alt": ""
    }
  ]
}
```

hyperframes reads this material pool and freely chooses which materials to use and where, based on the alt descriptions and its own scene design.

## API Keys

Configure in the `.env` file:
```
PEXELS_API_KEY=your_pexels_key
PIXABAY_API_KEY=your_pixabay_key
```

## Completion prompt

After material collection is complete, inform the user:

**After round 1:**
```
✅ Material collection done! materials.json is ready.

Next:
  /hyperframes — generates the HTML composition (needs materials.json + block-timing.json)

💡 If voice generation (/tts) is not yet complete, finish it before entering /hyperframes
💡 Material collection and voice generation can run in parallel; enter /hyperframes only after BOTH are done
```

**After round 2 supplement:**
```
✅ Material supplementation done! materials.json updated.

Next:
  If AI image generation is needed → /image-gen
  If ready → /render to render the output video
```

## Dependencies

- **Node.js 18+** (native fetch, no additional npm dependencies)
- **ffprobe** (bundled with ffmpeg, used for video integrity validation)

## Limitations

- Pexels: 200 requests/hour, free API
- Pixabay: 100 requests/60 seconds, results must be cached for 24 hours
- Video materials on both platforms are mostly landscape; portrait resources are limited
- Pixabay `largeImageURL` max 1280px; Full HD requires applying for full API access
