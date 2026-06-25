---
name: render
description: >
  Video rendering and output. Reads brief.json config, invokes the hyperframes CLI to render the video,
  merges audio, and validates output integrity. The final step of the pipeline.
version: 1.0.0
---

<HARD-RULE>
**No cross-project peek:** When working on project X (`output/X/`), NEVER read files from `output/<other-project>/`. Only read `output/X/**` and this skill's own files. Reading other projects' generated outputs causes style convergence.
</HARD-RULE>

# Render — Video Rendering Output

The final step of the pipeline. Renders the HTML composition into video, merges audio, and validates the output.

## Prerequisites

- `/check` has passed (layout validation has no errors)
- `/image-gen` is complete (if there are imageSlots)
- `brief.json` exists (provides fps, resolution, and render-quality parameters)
- The composition directory contains `index.html`

## Workflow

### Step 1: Read Configuration

1. Read `brief.json` and extract the render parameters:
   - `fps` (default 30)
   - `width` / `height`
   - `renderQuality` (draft / standard / high)
2. Locate the composition directory: `output/<project>/composition/`
3. Confirm `index.html` exists

### Step 2: Render the Video

```bash
hyperframes render \
  output/<project>/composition/ \
  --output output/<project>/output-no-audio.mp4 \
  --fps <fps> \
  --quality <renderQuality>
```

**Quality parameter mapping:**

| brief.json renderQuality | CLI --quality | Description |
|--------------------------|---------------|-------------|
| draft | draft | Fast preview |
| standard | standard | Standard quality |
| high | high | Highest quality |

**Optional flags:**
- `--gpu` — Enable GPU acceleration (if available)

### Step 3: Merge Audio

Hyperframes' built-in audio processing has a bug, so the rendered video may have no sound. **You must manually merge the audio with ffmpeg:**

```bash
# Check whether audio.mp3 exists in the composition directory
# If present → merge the audio
# If absent (visual-only preview mode) → skip this step

ffmpeg -i output/<project>/output-no-audio.mp4 \
  -i output/<project>/composition/audio.mp3 \
  -c:v copy -c:a aac -b:a 192k -shortest -y \
  output/<project>/output.mp4
```

After merging, delete the silent temporary file:
```bash
del output\<project>\output-no-audio.mp4    # Windows
rm output/<project>/output-no-audio.mp4      # macOS/Linux
```

**If there is no audio.mp3** (visual-only mode, no voiceover):
```bash
# Just rename it
ren output\<project>\output-no-audio.mp4 output.mp4    # Windows
mv output/<project>/output-no-audio.mp4 output/<project>/output.mp4  # macOS/Linux
```

### Step 4: Validate the Output

Use ffprobe to inspect the final video:

```bash
# Inspect video info (duration, resolution, audio track)
ffprobe -v quiet -show_entries format=duration,size -show_entries stream=codec_type,width,height -of json output/<project>/output.mp4
```

**Validation checks:**

| Check | Expected |
|-------|----------|
| Video duration | Close to totalDuration from block-timing.json (±2s) |
| Video resolution | Matches width × height from brief.json |
| Audio track present | If audio.mp3 exists, the output video should contain an audio track |
| File size | > 0, within a reasonable range (draft < standard < high) |

### Step 5: Completion Report

Present the final result to the user:

```
✅ Video render complete!

📁 File: output/<project>/output.mp4
📏 Resolution: 1080×1920
⏱ Duration: 45.2s
🎵 Audio: merged
📦 File size: 12.3 MB
🎨 Render quality: standard

Open the file directly to preview, or upload it to a short-video platform to publish.
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `command not found: node` | Run `/start` first to check the environment |
| Rendering hangs | Check whether Chrome/Chromium is installed (run `npm run setup:check`), try `--quality draft` |
| Output video has no audio | Confirm audio.mp3 exists in the composition directory, then manually run the ffmpeg merge command |
| Video duration differs too much from expected | Check whether totalDuration from block-timing.json matches data-duration in the HTML |
| Rendering reports out of memory | Try `--quality draft` or close other programs |
| ffmpeg merge errors | Confirm ffprobe is available and the audio format is mp3 |

## Related Skills

- [check](../check/SKILL.md) — Layout validation (must pass before rendering)
- [image-gen](../image-gen/SKILL.md) — AI image generation (the last step before rendering)
- [hyperframes](../hyperframes/SKILL.md) — HTML composition generation
