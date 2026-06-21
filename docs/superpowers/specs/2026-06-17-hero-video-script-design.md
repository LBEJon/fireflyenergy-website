# Firefly Hero Video — "Power That Never Blinks"

**Date:** 2026-06-17
**Type:** Design spec / production script (video lead-in for the FireflyEnergy.mx homepage hero)
**Status:** Draft for review → keyframes in progress

---

## 1. Concept

A ~22-second photoreal cinematic lead-in that animates the *backstory* of the existing
homepage hero image and lands exactly on that frame, so the handoff to the live site is
seamless.

The existing hero (`image-masters/hero-dusk-master-2688x1520.png`) shows dusk over San
Miguel de Allende — the Parroquia silhouetted top-left, and **one warm home glowing while
the hillside around it sits dark**. That image is the **end state of the story**: it is what
the neighborhood looks like *after* the grid failed and this one house didn't blink.

The video tells how it got there:

> Golden hour over San Miguel — the whole valley alive with light. The grid fails. Block by
> block, the city falls dark... except a scattered handful of homes that never flinch. We
> find one. We move toward it through the dark — every window warm, life uninterrupted — into
> the garage, where the Firefly system breathes a calm lime pulse. The quiet engine that never
> blinked. Pull back to the glowing house in the dark. The site takes over.

**Throughline:** the grid is fragile; Firefly homes simply don't notice. The drama is the
*contrast* and the *seamless, automatic switchover* — not generators, not chaos.

---

## 2. Production approach

- **Style:** photoreal, editorial, architectural-digest grade — matches the existing masters.
- **Build:** chained multi-shot sequence. Generate matched still **keyframes first**, then
  Seedance 2.0 image-to-video per shot using `--start-image` / `--end-image`. The end frame of
  one shot is the start frame of the next for continuity.
- **Runtime:** ~22–24s, one-shot story (not a true loop). Ends parked on the hero composition;
  the static site hero + HTML overlay take over from there.
- **Tagline / copy:** lives as **HTML overlay** over a muted video (per site performance +
  editability). Video is rendered clean — **no text, no logos baked in** (brand rule).
- **Aspect:** 16:9 primary (desktop hero). Produce a 4:5 / 9:16 mobile crop pass after the
  16:9 master is approved (mirrors how `hero-dusk-mobile` was handled).

### Model choices — REVISED after look tests (2026-06-17)
- **GPT Image 2 is deprecated for the cityscape** — it reads cartoonish/over-rendered HDR.
- **Look master = Soul Cinematic** (`soul_cinematic`) for the golden-hour ambiance + cinematic grade.
- **Landmark fidelity + depth = Nano Banana Pro** (`nano_banana_2`), image-to-image, fed (a) the
  Soul Cinematic plate for composition/ambiance and (b) a **real photo of the centro** as an
  identity reference, so the Parroquia silhouette and the laurel-tree Jardín render accurately.
  Real references in `video-keyframes/refs/` (Wikimedia Commons): `ref-parroquia2.jpg` (Parroquia
  facade + bell tower + Jardín in one frame) is the key one.
- **Geometry-locked relighting (e.g. blackout twin) = Nano Banana Pro** image-to-image from the
  locked plate — it preserves composition far better than GPT Image 2 (which recomposed).
- **Video:** Seedance 2.0, image-to-video, `--duration` 4–12 per shot. NOTE: Soul Location does
  NOT accept `--image`; Soul Cinematic and Nano Banana do.

### LOCKED look-master (Shot 1 establishing plate)
`video-keyframes/KF-1-depth-v2.jpg` — elevated Balcones/Ojo de Agua rim vantage, string-lit stone
terrace foreground, town cascading into the bowl, **accurate Parroquia + Jardín** small and naturally
distant in the mid-distance, atmospheric haze, mountains + Presa Allende on the far horizon, golden
hour. Approved by Jon 2026-06-17. All other keyframes derive from this frame's look + geometry.

### Landmark accuracy requirement (Jon, non-negotiable)
The **Parroquia** (rose-pink neo-Gothic spire) and the **Jardín** (laurel-tree central plaza at the
church facade) must read accurately — they're San Miguel's unmistakable symbols. Neighborhoods take
liberty but must keep the correct rim height/angle and a believable distance from the centro
(home sits ~1–2 km across + above the bowl, not perched on top).

### Brand rules (carry over, non-negotiable)
- Warm golden/blue-hour light. **Never** show generator/fuel imagery.
- Equipment only ever wall-mounted in a covered space — never outdoors.
- Any visible logo/text must be Firefly's only — no OEM brands/model numbers. We composite the
  official logo afterward (so: generate clean, overlay logo in post/HTML).

---

## 3. Shot breakdown

| # | Title | ~sec | Camera / action | Start keyframe | End keyframe |
|---|-------|------|-----------------|----------------|--------------|
| 1 | Golden-hour city | 5 | Slow aerial push + slight descent over SMA at golden hour. Whole hillside warm, Parroquia glowing, thousands of windows lit. | **KF-1** all-lit | KF-1b (subtle dusk deepening) |
| 2 | The blackout wave | 6 | Same vantage holds. A flicker pulses; neighborhoods drop to black in ripples across the valley. Resolves to: one house still warm. *The switchover beat.* | KF-1b | **KF-2 = hero-dusk master** |
| 3 | The one that stays | 5 | Continue descent, selecting the glowing house; push in toward its warm windows, dark neighbors around it. | KF-2 (wide) | **KF-3** tighter push-in on the house |
| 4 | The quiet engine | 5 | Move through to the garage/utility wall. Firefly inverter + battery; the round display + status LEDs **breathe soft lime** (#9ED500) at the cutover. Calm, no alarm. | KF-4a equipment (display dim/standby) | **KF-4b = equipment master** (lime display lit) |
| 5 | Hero hold | 3–4 | Pull back out to the warm house in the dark — settle into the **exact hero composition**. Hold for handoff. | KF-3/KF-4b | **KF-5 = hero-dusk master** (= KF-2) |

**Why this is reliable:** the hardest beat (a city's lights going out in waves) is handled as a
Seedance image-to-video between two frames of the *same scene* — all-lit (KF-1b) → hero-dusk
master (KF-2). The model only has to interpolate the lighting transition, not invent geometry.

---

## 4. Keyframes — generation prompts

All 16:9, photoreal, no people, no text, no logos.

### Geography lock (corrected 2026-06-17)
San Miguel is a **bowl**. The Parroquia sits near the **low center**. The realistic vantage is an
**elevated home on the eastern rim (Balcones / Ojo de Agua)** looking **west-southwest down across
the bowl**: foreground hillside home → town cascading into the bowl → **Parroquia spires rising
from the center-distance** → far rim of hills + Presa Allende + dusk sky. The original
`hero-dusk-master` used a back-hillside sightline with the Parroquia off to the side — **deprecated
for this work.** New keyframes use the corrected bowl geography.

- **KF-1 — "All-lit San Miguel at golden hour" (bowl geography)** — **APPROVED**, generated.
  File: `video-keyframes/KF-1-v2-bowl-geography.png` (GPT Image 2, 16:9, 2k). Foreground cantera-stone
  rim home with string-lit terrace (left), Parroquia centered in the bowl, town fully lit, reservoir +
  golden band → deep blue sky. This is the **Shot 1 establishing frame** and the geometry master for the
  blackout morph.

- **KF-2 / KF-5 — "Dusk blackout twin (one house lit)"** — generating, image-to-image **from KF-1 v2**
  (identical framing, grid failed: bowl dark, only the foreground home + a scattered few stay warm).
  File: `video-keyframes/KF-2-dusk-blackout.png`. Serves as the **Shot 2 morph target** AND the **Shot 5
  end frame**, and is a **candidate to replace the current site hero** (which carries the old sightline).

- **KF-3 — "Push-in on the hero home"** *(generate or crop)*
  Either a tighter crop of the hero master, or image-to-image from it:
  > "Closer cinematic view of the one glowing San Miguel home — warm interior lights and string
  > lights through windows, calm and lived-in, surrounded by dark neighboring rooftops at dusk,
  > shallow depth of field. Photoreal, no people, no text, no logos."

- **KF-4a / KF-4b — "The quiet engine"** — base **EXISTS:** `equipment-installed-sma-master.png`.
  KF-4a (optional): same image with the round display dim/standby. KF-4b = the master (display
  lit lime). The cutover pulse is created in the Seedance motion + post glow, referencing the
  real 12 kW inverter and 16 kWh battery renders for fidelity.

---

## 5. Copy / overlay (HTML, timed to shots)

Rendered as live HTML text over the muted video; final beat hands to the static hero.

| Shot | On-screen copy |
|------|----------------|
| 1 | *(no text — let the world breathe)* — kicker `SAN MIGUEL DE ALLENDE` may fade in |
| 2 | "When the grid goes dark…" → "…some homes never notice." |
| 3 | **"Power that never blinks."** (the headline lands here) |
| 4 | "Automatic battery backup. The instant the grid fails, Firefly takes over — seamless, silent, immediate." · sub: "Lights. Internet. Refrigerator. Water. On — without you lifting a finger." |
| 5 | **Firefly logo** + "Designed for the way you live." + CTAs (`Get my estimate` / `How it works`) + chips (`<20ms switchover`, `Solar-ready`, `20 yrs serving Mexico`) — i.e. the existing static hero. |

Type: Archivo. Accent lime `#9ED500`, charcoal `#2A2D34`, coral `#FF6A3D` CTA.

---

## 6. Asset list

**Have (in repo / iCloud):**
- `image-masters/hero-dusk-master-2688x1520.png` — anchor end state + style ref (KF-2/5).
- `image-masters/equipment-installed-sma-master.png` — Shot 4 (KF-4b).
- Equipment renders: `~/Library/Mobile Documents/com~apple~CloudDocs/Firefly/Equipment Images/`
  (`12kw/12KW - Front.png`, `Batteries/16KWh-IP65/`) — fidelity refs for any equipment variant.
- Firefly logos (2026) — composited in post / HTML overlay only.
- Brand palette + Archivo.

**Generate this session:**
- **KF-1 / KF-1b** (all-lit golden-hour hero vantage) — the one critical new still.
- **KF-3** (push-in on the home) — optional; may crop from master instead.

**Nice-to-have from Jon (sharpens fidelity, not blocking):**
- Any real **sample-station / installed-system photos** beyond the master — alternate garage
  layouts for variety.
- A clean **Parroquia / SMA skyline plate** if we ever want to regenerate the city wider.

---

## 7. Assembly / post

1. Generate KF-1/1b (and KF-3 if not cropping).
2. Seedance 2.0 per shot (image-to-video, start/end frames), 16:9, `--duration` per table.
3. Assemble 5 clips in an editor; crossfade/match-cut on the shared frames. Add ambient music
   (low, cinematic, building to the switchover; calm resolve). No baked text/logo.
4. Color-match all clips to the hero master's warm/blue grade.
5. Export muted MP4 + WebM (web hero), plus a poster frame = hero master. Mobile crop pass.
6. Wire into `Hero.astro` as a muted autoplay/loop-to-hold background; HTML overlay carries copy.

## 8. Higgsfield CLI (reference)

```bash
# KF-1 all-lit, from the hero master (image-to-image)
higgsfield generate create gpt_image_2 --prompt "<KF-1 prompt>" \
  --image "docs/superpowers/specs/image-masters/hero-dusk-master-2688x1520.png" \
  --aspect_ratio 16:9 --resolution 2k --wait

# Shot 2 blackout (image-to-video between two scene frames)
higgsfield generate create seedance_2_0 --prompt "city lights go dark in waves, one home stays warmly lit, cinematic" \
  --start-image <KF-1b> --end-image "docs/superpowers/specs/image-masters/hero-dusk-master-2688x1520.png" \
  --duration 6 --aspect_ratio 16:9 --wait
```
