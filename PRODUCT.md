# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Primary:** affluent homeowners in San Miguel de Allende (many English-speaking expats, plus Mexican families) who live with frequent CFE outages, voltage dips and spikes, and want the lights, internet, fridge, water pump and A/C to keep running without thinking about it.
- **Secondary:** commercial and industrial operators across Mexico (shops, offices, facilities) who want backup plus lower demand charges (`/industrial`).
- The visitor's job: understand what the system does, trust that Firefly is local and competent, and ask for a customized proposal (form, CFE-bill upload, or WhatsApp).

## Product Purpose
Firefly Energy by Nordic Electric designs and installs automatic battery backup (hybrid inverter + LiFePO₄ battery), with optional solar. Success = a qualified visitor requests a customized proposal or opens a WhatsApp conversation.

## Positioning
Local installer in San Miguel de Allende with 20 years serving Mexico. Whole-home automatic switchover in under 20 ms; no fuel, no noise, no generator. Systems sized from the customer's own CFE bill. Modular: start small, add batteries or solar later.

## Operating Context
- Bilingual site: English default, Spanish under `/es/`.
- Lead paths: assessment wizard (`/calculator`) with optional CFE-bill upload, site-visit lead form, WhatsApp (+52 415 180 5030).
- Hosting: Astro static site on Cloudflare Workers; merging to `main` deploys. Edge functions `site-lead` and `site-cfe-parse` on Supabase feed the Firefly CRM.

## Capabilities and Constraints
- **Never show prices on the website** (decision 2026-11-01). Every path ends in "we'll prepare your customized proposal".
- **No packages or tiers on the website** (Jon, 2026-11-02): each system is recommended after an assessment. Current residential lineup (matches CRM `public.product`): inverters Firefly 7.2 kW, 12 kW, 12 kW Plus (10 kW dropped from the website 2026-11-03: low sales, off-lineup) (all 120/240 V split-phase); batteries Firefly 5 kWh (outdoor-rated), 15 kWh, 16 kWh (also outdoor-rated). Batteries stack; inverters can be paired; solar can be added any time; generator integration supported. Product cutouts: `site/public/assets/equipment/lineup/`.
- Firefly recruits dealers/installers across Mexico (homepage `#dealers`).
- Warranty: 8 years on inverter and battery, including installation and after-sales support. Panels: 25-yr materials / 30-yr output.
- Battery cycles: 6,000+. Switchover: under 20 ms. Pure sine wave output.
- Brand has no Google Analytics, Google Ads or Meta Pixel account yet (2026-11-02).

## Brand Commitments
- Name: "Firefly Energy" (footer: by Nordic Electric). Logo files in `site/public/assets/brand/`.
- Fonts: Archivo Narrow (display) + Archivo (body). Colors: lime #9ED500, ink #2A2D34, coral #FF6A3D (scarce; #1 action only), gold #FFB81C.
- Voice: friendly, confident, calm resilience. Name CFE plainly, never disparage it. Avoid "crisis/disaster/emergency" and fear-driven urgency.
- Taglines: "Always Connected. Always Prepared." (primary); "Your Power. Your Control. Your Future."
- Jon's 2026-11-02 brief: contemporary, current, real motion, photorealistic; show San Miguel outages with individual houses still lit among dark neighborhoods, then the Firefly equipment in a carport.

## Evidence on Hand
- Real install photos: `site/public/assets/equipment/installs/install-1..5.jpg`, `assets/photos/proof-*.jpg`, `assets/equipment/system-installed.jpg`; hero dusk photo `assets/photos/hero-dusk.jpg`.
- Product renders: `assets/equipment/inverter-12kw.png`, `battery-16kwh.png`.
- "20 years serving Mexico" is confirmed accurate.
- **No real testimonials yet.** The two quotes on the old site were placeholders; do not reuse or invent quotes, customer names, or install counts.

## Product Principles
1. Calm over alarm: outages are normal; Firefly makes them a non-event.
2. Proof is local: real San Miguel installs beat generic claims.
3. One clear next step on every view: the customized proposal (or WhatsApp).
4. One set of numbers, used consistently everywhere.

## Accessibility & Inclusion
WCAG 2.2 AA. Motion respects `prefers-reduced-motion`. Full parity between English and Spanish.
