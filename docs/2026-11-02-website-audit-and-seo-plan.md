# Firefly website — audit, redesign, tracking and SEO plan

**Date:** 2026-11-02 · **Branch:** `feat/redesign-2026` · **Preview:** https://redesign-fireflyenergy-website.jondenne.workers.dev (live site unchanged: https://fireflyenergy.mx)

## 1. Summary

- The new homepage (English + Spanish) is built and running on the private preview link. Scroll through it: San Miguel at night, the grid fails neighborhood by neighborhood, a few homes stay lit, and the camera pushes into one Firefly home and its installed system.
- Google Analytics, Google Ads and Meta Pixel tracking are built in. They stay switched off until you create the accounts and send the IDs (steps in section 4).
- SEO basics are fixed on the new homepage. The bigger SEO wins sit outside the code: a Google Business Profile, customer reviews and Search Console (section 5).
- Still to do after you approve the look: carry the design to the Industrial, Calculator and FAQ pages, then drop in the Higgsfield flyover video (Project 2).

## 2. Audit of the current site

### What works
- Real install photos from San Miguel homes. These are the most persuasive asset on the site.
- Clear lead paths: the assessment with CFE-bill upload, plus WhatsApp.
- Bilingual, with correct `hreflang`, a sitemap, and structured data already in place.
- No prices on the site, consistent with the 2026-11-01 decision.

### What hurts trust
| Issue | Where | Fix in redesign |
|---|---|---|
| Contradictory numbers: "20 yrs" vs "19 yrs", "<20ms" vs "<19ms", "96% automatic" vs "100% automatic" | Hero chips vs stats strip vs "always watching" box | One set of numbers, used everywhere (PRODUCT.md) |
| Placeholder testimonials shown as real customers | "Real installs" section | Removed. Add real quotes once collected |
| The power-flow diagram is a screenshot with its own logo inside the page | "How it works" | Replaced with an animated pure-sine waveform: CFE → battery → solar → CFE |

### What hurts conversion
- **Coral is everywhere.** Every tier card has a coral button, so nothing stands out. The new design uses coral only for the main action.
- **Template look.** A stat strip, six identical icon cards, three pricing-style cards: it reads like a generic solar template. The new page tells one story instead: night → outage → your house stays on → how → what stays on → proof → next step.
- **The hero doesn't show the product's promise.** It's a still photo with a headline. The new hero shows the promise happening as you scroll.

### Technical / SEO
| Issue | Impact | Status |
|---|---|---|
| No tracking of any kind (no GA4, no Ads tag, no Pixel) | Can't measure visits, leads or ad spend | **Built**, off until IDs are added |
| No social share image (`og:image`) | Links shared on WhatsApp/Facebook show no picture | **Fixed** (all pages) |
| Page titles are slogans ("Power that never blinks") with no search terms | Weak ranking for "battery backup San Miguel" | **Fixed** on homepage (EN/ES) |
| No `robots.txt` served | Crawlers have no sitemap pointer | **Fixed** |
| Fonts loaded through a CSS `@import` chain | Slower first render | **Fixed**: preconnect + direct link |
| `Product` schema without price or reviews | Google flags it as invalid | **Fixed**: now `Service` + `LocalBusiness`/`Electrician` with logo and image |
| Install photos are 230–480 KB JPEGs | Slow on mobile data | **Fixed**: 33–110 KB WebP |

## 3. The new homepage

| Section | What the visitor gets |
|---|---|
| Night hero (scroll) | Sees San Miguel go dark while their home stays on; a live "CFE grid / Your home" readout flips from On to Offline / On battery; ends inside the carport with the equipment |
| Twenty milliseconds | The four moments of an outage, drawn as one unbroken pure sine wave |
| Choose what stays on | Essentials / Comfort / Whole home switch: household items light up or go dark, with runtime hours. No prices |
| Already working in San Miguel homes | Real install photos plus four facts: 20 years, 8-year warranty incl. install + support, 6,000+ cycles, grows with you |
| From your CFE bill to a quiet carport | Three steps, ending in "Start with my CFE bill" |
| Business band | Links to the commercial & industrial page |
| Good questions | Four short FAQs plus a link to the full FAQ |
| Always connected. Always prepared. | Final call to action plus WhatsApp |

**Brand note:** the vault's brand guide says "avoid darkness imagery". This page uses darkness on purpose, as you asked. It's framed calmly: the lit home is the hero, and there's no storm, alarm or emergency language.

**Motion & accessibility:** visitors who turn off animations in their phone or computer settings get a still version. All text meets contrast standards. The page works with a keyboard and has a skip-to-content link.

## 4. Google & Meta tracking: what you need to do

The code is ready. You need three free accounts, then send me the IDs and I'll switch tracking on.

### Step 1: Google Analytics 4 (about 5 minutes)
1. Go to https://analytics.google.com and sign in with the Google account you want to own the data (ideally a Firefly business account, not a personal one).
2. Click **Start measuring**. Account name: `Firefly Energy`. Click **Next**.
3. Property name: `fireflyenergy.mx`. Time zone: **Mexico – Mexico City**. Currency: **Mexican Peso**. Click **Next**, answer the business questions, click **Create**.
4. Choose platform **Web**. Website URL: `fireflyenergy.mx`. Stream name: `Website`. Click **Create stream**.
5. Copy the **Measurement ID** at the top right. It looks like `G-XXXXXXXXXX`. Send it to me.

### Step 2: Google Search Console (about 5 minutes)
1. Go to https://search.google.com/search-console and click **Add property** → **URL prefix** → `https://fireflyenergy.mx/`.
2. Choose verification method **Google Analytics** (works once Step 1 is live), then click **Verify**.
3. Open **Sitemaps** in the left menu, enter `sitemap-index.xml`, and click **Submit**.

### Step 3: Google Ads (only when you're ready to advertise)
1. Go to https://ads.google.com → **Start now**. Switch to **Expert mode** at the bottom ("Switch to Expert Mode"), then **Create an account without a campaign**. Country: Mexico, currency: MXN.
2. Go to **Goals → Conversions → New conversion action → Website**, enter `fireflyenergy.mx`, and choose **Add a conversion action manually**. Category: **Submit lead form**. Name: `Lead`. Value: **Don't use a value**. Count: **One**.
3. Choose **Use Google tag** and copy two things: the tag ID (`AW-XXXXXXXXX`) and the conversion label (the part after the `/`). Send both to me.

### Step 4: Meta Pixel (for Facebook / Instagram ads)
1. Go to https://business.facebook.com/events_manager2 → **Connect data sources** → **Web** → **Meta Pixel** → name it `Firefly website` → **Create pixel**.
2. Choose **Install code manually** and copy the **Pixel ID** (15–16 digits). Send it to me.

### What gets tracked once live
| Event | Fires when | Google | Meta |
|---|---|---|---|
| `begin_assessment` | Someone clicks any "Get my proposal / Size my system" button | GA4 event | custom event |
| `generate_lead` | A proposal request is submitted successfully | GA4 event + Ads conversion | `Lead` |
| `contact_whatsapp` / `contact_phone` / `contact_email` | WhatsApp, phone or email link clicked | GA4 event | `Contact` |

No names, phone numbers or emails are ever sent to Google or Meta. The privacy page should get one line saying the site uses analytics and advertising cookies; I can write it.

## 5. SEO plan

### Keywords to own (English / Spanish)
| Intent | English | Spanish |
|---|---|---|
| Core local | battery backup San Miguel de Allende · home battery backup Mexico | respaldo de energía San Miguel de Allende · baterías para casa |
| Solar | solar installer San Miguel de Allende · solar panels SMA | paneles solares San Miguel de Allende · energía solar Guanajuato |
| Problem | power outages San Miguel de Allende · CFE outage backup | apagones San Miguel de Allende · se va la luz qué hacer |
| Product | LiFePO4 home battery Mexico · hybrid inverter installation | inversor híbrido instalación · batería de litio para casa |
| Business | battery storage for business Mexico · reduce CFE demand charges | almacenamiento de energía para empresas · cargos por demanda CFE |

### Highest-impact actions, in order
1. **Google Business Profile** (https://business.google.com). For a local installer, this matters more than anything on the site itself. Category: *Solar energy contractor*, secondary *Electrician*. Add the service area (San Miguel de Allende, Querétaro, Guanajuato), hours, WhatsApp number, and the install photos.
2. **Reviews.** Ask every finished customer for a Google review (I can make a short QR card and WhatsApp message). Reviews also give us the real testimonials the site is missing.
3. **Search Console + sitemap** (Step 2 above).
4. **Roll the new design and SEO titles across every page:** Industrial, Calculator, FAQ, EN and ES.
5. **Add pages people search for:**
   - "Power outages in San Miguel de Allende: what to do" (EN/ES guide; answers a real question and ranks for problem searches)
   - "Battery backup vs. generator" (comparison)
   - "Solar + battery in San Miguel" (service page)
   - One short page per real install, with photos (local proof; good for long-tail searches)
6. **FAQ rich results:** the FAQ page already has FAQ schema; keep answers short and specific.

### Ads readiness
- **Google Search ads:** start with the core-local and problem keywords above, limited to San Miguel de Allende + 30 km, plus Querétaro. Send clicks to the homepage (EN or ES by keyword language) and measure with the `Lead` conversion.
- **Meta ads:** the night-hero visual and the Higgsfield flyover are the creative. Run to homeowners in San Miguel and Querétaro, then retarget site visitors with the Pixel.
- Don't spend on ads until GA4, the Ads conversion and the Pixel are live. Without them we can't tell what works.

## 6. Next steps

1. **You:** review the preview link on your phone and computer and tell me what to change.
2. **You:** create the accounts in section 4 and send me the IDs.
3. **Me, after approval:** apply the design to Industrial, Calculator and FAQ (EN/ES), write DESIGN.md, run a final quality review, then merge to `main` to go live.
4. **Project 2 (new conversation with Higgsfield):** generate the photoreal San Miguel blackout → carport flyover and replace the coded hero animation with it.
