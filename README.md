# Ambia — Cartoon-in-3D Vertical Shorts Studio

Procedural **2D cartoon characters in a cel-shaded 3D world** built with **Remotion**, **Three.js / React Three Fiber**, **custom screen-space ink outlines**, and a **pure Python NumPy/SciPy procedural audio & mixing pipeline**.

This repository contains:
- The reusable **`cartoon-3d-short`** agent skill ([`.agents/skills/cartoon-3d-short/SKILL.md`](.agents/skills/cartoon-3d-short/SKILL.md)) and starter templates ([`.agents/skills/cartoon-3d-short/templates/`](.agents/skills/cartoon-3d-short/templates/))
- The **`watch`** video analysis skill ([`.agents/skills/watch/SKILL.md`](.agents/skills/watch/SKILL.md))
- The narrative & pacing playbook ([`docs/viral_short_duplication_formula.md`](docs/viral_short_duplication_formula.md)) and Episode #2 script/storyboard ([`docs/episode_2_production_script.md`](docs/episode_2_production_script.md))
- **Two Remotion compositions** (`1080x1920`, `30 fps`, registered in [`src/Root.tsx`](src/Root.tsx)):
  - `SkyscraperShort` — 62.0s / 1860-frame episode *"The 730-Ton Skyscraper Pendulum"* (`src/videos/skyscraper/`)
  - `BridgeShort` — Reference episode (`src/videos/bridge/`)

---

## Agent Quick-Start: How to Build a New Episode

If you are an AI coding agent cloning this repo to produce Episode 3+, read these files first:

1. [`docs/viral_short_duplication_formula.md`](docs/viral_short_duplication_formula.md) — 6-beat story structure, ~195–210 word target, `1–3` word caption pacing, `~2.5s` average shot length, and loop cut rule.
2. [`.agents/skills/cartoon-3d-short/SKILL.md`](.agents/skills/cartoon-3d-short/SKILL.md) — full technical specification for the 2D-in-3D visual style, ink pass, lighting, grading, audio targets, and QA checks.
3. [`src/videos/skyscraper/`](src/videos/skyscraper/) and [`scripts/build_skyscraper_audio.py`](scripts/build_skyscraper_audio.py) — working vertical-slice implementation to clone and adapt for a new composition.

> **Privacy Rule (`.gitignore`):** `.agents/skills/cartoon-3d-short/references/` stores local private reference frames/sheets/reports (`Never upload, publish or send them` per `SKILL.md`) and is excluded from Git tracking alongside `node_modules/`, `.remotion-tmp/`, generated `*.mp4` / `*.wav` / `*.jpg` / `*.npz` outputs, and raw TTS audio.

---

## Repository Layout

```text
.
├── .agents/skills/
│   ├── cartoon-3d-short/       # Core production skill, templates & workflow rules
│   └── watch/                  # Video download, frame extraction & transcript skill
├── audio/                      # Pure NumPy/SciPy DSP, synthesis & mixing kit
│   ├── dsp.py                  # Filters, modal synthesis, panning, IR reverb, BS.1770-4 LUFS
│   ├── instruments.py          # Additive/modal instruments (brass, glock, snare, timpani, pad...)
│   ├── sfx_gen.py              # Procedural SFX (creak, bolt_snap, whoosh, timber_tear, babble...)
│   ├── mix.py / music.py / sfx.py / timeline.py / cues.md
├── docs/
│   ├── viral_short_duplication_formula.md
│   └── episode_2_production_script.md
├── out/
│   └── skyscraper/
│       ├── shots.json          # Shot frame boundaries, flash frames & crossfades for QA
│       └── qa/report.md        # Logged FFmpeg / OpenCV / loudness QA metrics
├── scripts/
│   ├── gen_voice.py            # Edge-TTS narration + word-level timestamps -> voice/words.json
│   ├── build_skyscraper_audio.py # Full 62s music + SFX + voice ducked mix -> -15.0 LUFS
│   ├── bridge-stills.mjs       # Fast multi-frame JPEG still renderer for shot/framing audits
│   ├── render-skyscraper.mjs   # Remotion ANGLE GPU video renderer
│   └── short_qa.py             # Frame-by-frame motion, frozen/black check, LUFS & contact sheets
├── src/
│   ├── index.ts / Root.tsx     # Registers SkyscraperShort and BridgeShort (1080x1920 @ 30fps)
│   ├── videos/skyscraper/      # Episode 2 source (Bridge.tsx, story.ts, world.ts, cast.ts, ink.ts...)
│   └── videos/bridge/          # Reference composition
└── voice/
    └── words.json              # Tracked word-boundary timestamps (211 words, ends at 61.393s)
```

---

## 7-Step Production Workflow

### Step 1 — Write Script & Shot Sheet (`60–65s`, `~200 words`)
Follow [`docs/viral_short_duplication_formula.md`](docs/viral_short_duplication_formula.md):
1. Sabotage hook with a hyper-specific number (`0–3s`)
2. Binary race & extreme geographic stakes (`3–11s`)
3. Young engineer vs. furious "purple" boss (`11–21s`)
4. Rival's "perfect" rigid shortcut & public mockery (`21–35s`)
5. Seasonal shift measured with everyday yardsticks (`35–48s`)
6. Hidden physics stress buildup -> rival disaster at the cutoff (`48–65s`)

### Step 2 — Generate Narration & Word Timings
Update `SCRIPT` in [`scripts/gen_voice.py`](scripts/gen_voice.py) (currently uses `edge_tts` `en-US-GuyNeural` at `rate="+22%"`) and run:

```bash
python scripts/gen_voice.py
```

Outputs `voice/voice_raw.mp3`, 48 kHz mono `voice/voice.wav`, and `voice/words.json` (`[{"w", "s", "e"}, ...]`) so every cut, camera shake, SFX hit, and gag locks to exact spoken words.

### Step 3 — Implement Visual Scene, Cast & Camera Timeline
Clone [`src/videos/skyscraper/`](src/videos/skyscraper/) (or use a skill template) and register the new composition in [`src/Root.tsx`](src/Root.tsx):
- [`story.ts`](src/videos/skyscraper/story.ts): `FPS = 30`, `TOTAL = 1860`, `SHOTS`, `XFADE`, `FLASH_AT`, `CAMS`, `KICKS`, `DOF`, `FOREGROUND`
- [`world.ts`](src/videos/skyscraper/world.ts): Procedural Three.js environments, lighting, rigged 3D props, and per-frame state machine
- [`cast.ts`](src/videos/skyscraper/cast.ts): Flat 2D painted bean-head/stick-limb character cards, expressions, and foreground 2D FX
- [`toon.ts`](src/videos/skyscraper/toon.ts) / [`paint.ts`](src/videos/skyscraper/paint.ts): Canvas-painted 2D character sprites & diegetic props (headlines, calendars, blueprints)
- [`Bridge.tsx`](src/videos/skyscraper/Bridge.tsx) / [`ink.ts`](src/videos/skyscraper/ink.ts): React Three Fiber wrapper + screen-space ink outline pass (`InkPass`, `NOINK` layer) + thin-lens DoF + grading

Verify TypeScript before rendering:

```bash
npm run typecheck
```

### Step 4 — Render Sample Stills & Audit Framing Early
Before doing a full 1860-frame render, render sample keyframes with [`scripts/bridge-stills.mjs`](scripts/bridge-stills.mjs) to inspect framing, Z-fighting, character placement inside the narrow 9:16 portrait frustum, and ink outlines:

```bash
npm run stills
```

### Step 5 — Synthesize & Mix Audio (`-15.0 LUFS`, `<= -1.2 dBTP`)
Run [`scripts/build_skyscraper_audio.py`](scripts/build_skyscraper_audio.py), which builds synchronized stems using [`audio/dsp.py`](audio/dsp.py), [`audio/instruments.py`](audio/instruments.py), and [`audio/sfx_gen.py`](audio/sfx_gen.py) and applies ducking and look-ahead limiting:

```bash
python scripts/build_skyscraper_audio.py
```

Outputs `out/skyscraper/mix.wav` (`62.000s`, 48 kHz stereo 24-bit) plus `stem_voice.wav`, `stem_music.wav`, and `stem_sfx.wav`.

### Step 6 — Render Full Video & Mux Audio
Render H.264 frames via Remotion + ANGLE GPU acceleration (`scale = 1` -> `1080x1920`, or `1.3333` -> `1440x2560` 2K vertical), then mux with `out/skyscraper/mix.wav`:

```bash
node scripts/render-skyscraper.mjs out/skyscraper/video.mp4 1 2
ffmpeg -y -i out/skyscraper/video.mp4 -i out/skyscraper/mix.wav -c:v copy -c:a aac -ar 48000 -shortest out/skyscraper/final.mp4
```

> **Note:** Check [`scripts/render-skyscraper.mjs`](scripts/render-skyscraper.mjs) (`browserExecutable`, currently `C:/Program Files/Google/Chrome/Application/chrome.exe`) and [`scripts/gen_voice.py`](scripts/gen_voice.py) (currently writes to `g:/ambia/voice/...`) if moving this project to another directory or OS.

### Step 7 — Run Automated Video + Audio QA
Define shot boundaries, flash frames, and crossfades in `out/skyscraper/shots.json`, then run [`scripts/short_qa.py`](scripts/short_qa.py):

```bash
python scripts/short_qa.py out/skyscraper/final.mp4 out/skyscraper/qa out/skyscraper/shots.json
```

Inspect the generated contact sheets (`out/skyscraper/qa/sheet_*.jpg`) and [`out/skyscraper/qa/report.md`](out/skyscraper/qa/report.md) for:
- Exact resolution/fps/frame count (`1080x1920`, `30 fps`, `1860 frames`)
- Loudness (`-15.0 LUFS`, true peak `<= -1.0 dBTP`)
- Zero unexpected silences, black spans, or frozen/held frame spans

---

## Implementation Notes & Gotchas Discovered

- **Windows temp isolation & PATH:** If Node, Python 3.12, or Chrome are installed per-user on Windows, prepend them to `$env:Path` and set `$env:REMOTION_TMP = "g:/ambia/.remotion-tmp"` before invoking Remotion so Chromium bundle/temp artifacts stay off `C:` AppData.
- **No external network asset fetches during render:** Procedural shaders/geometry avoid Chromium `404` stalls inside headless Remotion renders (`loadKit()` in [`world.ts`](src/videos/skyscraper/world.ts)).
- **Clean `<EffectComposer>` unmount & TS typing:** Ensure `InkPass` disposes cleanly on unmount and use React fragments (`<></>`) instead of `null` inside `<EffectComposer>` children in `Bridge.tsx` so `tsc --noEmit` (`strict: true`) passes cleanly.
- **Prevent Z-fighting on architectural cutaways:** Keep interior slabs (`atriumFloor`, `cope`) and surrounding transparent glass bounds separated cleanly along `Y` rather than sharing coplanar bounds.
- **9:16 portrait camera margins:** Pull aerial and two-shot cameras further back (or widen FOV carefully) than widescreen intuition suggests—foreground props and dual characters clip easily on horizontal edges at `9:16`.
