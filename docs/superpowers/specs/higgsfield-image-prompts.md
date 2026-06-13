# FireflyEnergy.mx — Higgsfield Image Prompts (for review before generating)

Brand: warm, premium, trustworthy. Golden/blue-hour light. NEVER show generator/fuel imagery. Equipment is wall-mounted in a **covered** space (garage/utility closet/covered patio) — never shown outdoors exposed to weather. Photoreal, editorial, architectural-digest quality. 3:2 or 16:9 landscape unless noted.

**Brand-mark rule (UPDATED):** Any logo, wordmark, or text that appears in an image must be **Firefly's** logo/wordmark or Firefly text — and nothing else. **No third-party / OEM brand names, logos, or model numbers anywhere.** Where equipment is shown, it should read as a clean, unbranded-or-Firefly-branded unit; we composite the official Firefly logo on afterward when needed rather than letting the model invent a brand.

**Reference assets (use as image-to-image / reference inputs where noted):**
- Equipment renders: `~/Library/Mobile Documents/com~apple~CloudDocs/Firefly/Equipment Images/` — `12kw/`, `12kw plus/`, `7.2kw/` (inverters), `Batteries/16KWh-IP65/`, `Batteries/5KWh-IP-65/`.
- Logo files (2026): `~/Library/Mobile Documents/com~apple~CloudDocs/Firefly/Logo Files (2026)/` — `firefly-logo.svg`, `firefly-logo-white.svg`, `firefly-icon.svg`, transparent PNGs.

Default model: **GPT Image 2** (photoreal + clean) for scenes; **Nano Banana 2/Pro** (reference/character image work) for the equipment-in-context shot so it stays faithful to the real Firefly units. Use Seedance 2.0 only if we decide on the ambient hero video later.

---

## 1. Residential hero — "San Miguel at dusk" (`hero-dusk.jpg`) — HERO, most important
**Prompt:** "Golden-hour exterior of an upscale San Miguel de Allende home — warm terracotta and cream stone facade, traditional Mexican colonial architecture with a flat roof and a cantera stone doorway, soft string lights and warm interior lights glowing through windows at dusk, deep blue twilight sky with the first stars, a few warm bougainvillea accents. The home looks calm, lived-in, and luminous — the only lit, serene house on the street. Cinematic, photoreal, architectural photography, shallow depth of field, warm color grade, no people, no text, no logos." 
**Aspect:** 16:9 (also request a 4:5 crop for mobile).

## 2. Proof gallery — three home styles (each `proof-colonial.jpg`, `proof-hacienda.jpg`, `proof-modern.jpg`)
**2a. Colonial / centro:** "Warm dusk photo of a classic San Miguel de Allende colonial townhouse facade in centro — rich ochre and rose walls, wooden balcony, cantera trim, glowing interior lights, cobblestone street, blue-hour sky. Photoreal, editorial, no people, no text."
**2b. Hacienda / countryside:** "Golden-hour photo of a Mexican hacienda-style country home — long covered portico with arches, warm adobe walls, terracotta roof tiles, mature trees, soft warm interior glow, expansive sky. Serene, affluent, photoreal, no people, no text."
**2c. Mexican modern / Barragán-inspired:** "Dusk photo of a mid-century Mexican-modern home inspired by Luis Barragán — bold flat planes of warm pink and earth-toned stucco, dramatic geometry, a calm reflecting pool, warm concealed lighting, deep blue sky. Minimal, architectural, photoreal, no people, no text."

## 3. Equipment in context — REAL Firefly equipment (`equip-incontext.jpg`)
**Method:** image-to-image / reference using the actual Firefly renders so the units stay faithful. References: the **12 kW inverter** (`Equipment Images/12kw/12KW - Front.png`) and the **16 kWh battery** (`Equipment Images/Batteries/16KWh-IP65/`). Composite the official **Firefly logo** (`Logo Files (2026)/firefly-logo-white.svg` on the dark unit) onto the equipment.
**Prompt:** "Place these exact Firefly inverter and battery units, wall-mounted side by side, in a clean modern home utility space — a tidy garage or utility closet, soft daylight from a doorway, neat conduit, polished concrete floor. Keep the equipment's real form and proportions; the only branding visible is the Firefly logo. Tucked-away, premium, reassuring. Photoreal, no people, no third-party brands, no model numbers."
*(Because this uses our real renders, the equipment stays accurate — the earlier 'no logos' note is replaced by 'Firefly logo only'.)*

## 4. Industrial hero — blue-hour BESS facility (`industrial-hero.jpg`)
**Prompt:** "Blue-hour exterior of a modern Mexican industrial facility — a row of sleek containerized battery energy storage units (matte charcoal, subtle lime-green accent lighting, no visible branding) beside a clean warehouse, a few solar panels on the roof, dramatic twilight sky, crisp professional lighting. Powerful, dependable, high-tech but warm. Photoreal, architectural/industrial photography, no people, no text, no logos." 
**Aspect:** 16:9.

## 5. (Optional) Industrial scale/operations accent (`industrial-scale.jpg`)
**Prompt:** "Wide blue-hour shot of solar panels and containerized battery storage at a Mexican agricultural or manufacturing site, mountains in the distance, warm sky — conveying scale from megawatt-class clean energy. Photoreal, no people, no text, no logos."

---

## Notes / safeguards baked into every prompt
- **Firefly brand only:** the only logo/wordmark/text permitted in any image is Firefly's. No third-party or OEM brand names, logos, or model numbers — ever.
- Equipment always **covered/indoor**, never weather-exposed (matches the install-framing content rule).
- No fuel cans, generators, or smoke anywhere.
- Warm, calm, affluent, energy-independence tone — never fear/disaster imagery.
- Equipment-in-context (#3) is generated from our **real** Firefly renders (image-to-image) so the units are accurate, with the Firefly logo composited on.

**Generation order if approved:** #1 hero first (most visible), then #4 industrial hero, then the three #2 proof homes, then optional #3/#5. We review each and regenerate any that miss before wiring them in.
