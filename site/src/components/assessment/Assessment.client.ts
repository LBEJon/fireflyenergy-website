import {
  toEstimateBody,
  consumptionKnown,
  existingSolarKw,
  recommendPanels,
  offsetPct,
  type AssessmentAnswers,
  type CoverageTier,
  type OtherLoad,
} from '../../lib/assessment';
import { fetchEstimate, type EstimateResult, type EstimateTier } from '../../lib/estimateClient';
import { parseCfe, fileToB64 } from '../../lib/cfeUploadClient';
import { submitLead, type LeadPayload } from '../../lib/leadClient';
import { t, type Locale } from '../../lib/i18n';

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Two-door, engine-backed assessment wizard. Framework-free.
 *
 * CORE INVARIANT: a price is NEVER rendered without a successful estimate
 * derived from known consumption. Every uncertain path (no usage, estimate
 * error, needsSiteVisit, lead-submit failure) fails safe to Door B / WhatsApp.
 */
export function initAssessment(root: HTMLElement): void {
  const baseUrl = root.dataset.baseUrl ?? '';
  const locale: Locale = root.dataset.locale === 'es' ? 'es' : 'en';
  const tr = (k: string) => t(locale, k);
  const TOTAL = 5;

  // ---- Answers state ----
  const answers: AssessmentAnswers = {
    language: locale,
    coverageTier: 'comfort',
    addSolarPanels: 0,
    backupHours: 12,
    hasExistingSolar: false,
    appliances: {
      miniSplits: 0,
      refrigerators: 0,
      waterPump: 'none',
      poolPump: false,
      electricOven: false,
      inductionCooktop: false,
      elevator: false,
      otherLoads: [],
    },
  };
  let uiStep = 1;
  let lastResult: EstimateResult | null = null;
  let selectedTier: string | null = null;
  let currency: 'USD' | 'MXN' = 'USD';
  let fxUsdMxn = 1;

  // ---- View elements ----
  const views = {
    doors: root.querySelector<HTMLElement>('[data-view="doors"]'),
    wizard: root.querySelector<HTMLElement>('[data-view="wizard"]'),
    sitevisit: root.querySelector<HTMLElement>('[data-view="sitevisit"]'),
  };
  function showView(name: keyof typeof views) {
    for (const [k, el] of Object.entries(views)) {
      if (el) el.hidden = k !== name;
    }
  }

  // ====================================================================
  // DOOR SELECTION
  // ====================================================================
  root.querySelectorAll<HTMLButtonElement>('[data-door]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.door === 'A') {
        showView('wizard');
        showStep(1);
      } else {
        routeToDoorB(false);
      }
    });
  });
  root.querySelector<HTMLButtonElement>('[data-exit-doora]')?.addEventListener('click', () => showView('doors'));
  root.querySelector<HTMLButtonElement>('[data-exit-doorb]')?.addEventListener('click', () => showView('doors'));

  // ====================================================================
  // WIZARD NAV
  // ====================================================================
  const dots = Array.from(root.querySelectorAll<HTMLElement>('[data-dot]'));
  const stepEls = Array.from(root.querySelectorAll<HTMLElement>('.ff-as__step[data-step]'));
  const backBtn = root.querySelector<HTMLButtonElement>('[data-back]');
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-next]');
  const navEl = root.querySelector<HTMLElement>('[data-nav]');

  function showStep(n: number) {
    uiStep = n;
    for (const el of stepEls) el.hidden = Number(el.dataset.step) !== n;
    dots.forEach((d, i) => {
      const idx = i + 1;
      d.classList.toggle('is-active', idx === n);
      d.classList.toggle('is-done', idx < n);
    });
    if (backBtn) backBtn.hidden = n === 1;
    // The result step (5) drives its own flow; hide the generic Next there.
    if (navEl) navEl.hidden = n === TOTAL;
    syncNext();
    const heading = stepEls
      .find((el) => Number(el.dataset.step) === n)
      ?.querySelector<HTMLElement>('.ff-as__legend, .ff-as__result-title, .ff-as__loading');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: false });
    if (n === 3) prepareSolarStep();
    if (n === TOTAL) runResult();
  }

  // Per-step gate for the Next button. Consumption (1) requires known usage.
  function stepValid(n: number): boolean {
    if (n === 1) return consumptionKnown(answers);
    return true; // 2,3,4 always have safe defaults
  }
  function syncNext() {
    if (nextBtn) nextBtn.disabled = !stepValid(uiStep);
  }

  nextBtn?.addEventListener('click', () => {
    if (!stepValid(uiStep)) return;
    if (uiStep < TOTAL) showStep(uiStep + 1);
  });
  backBtn?.addEventListener('click', () => {
    if (uiStep > 1) showStep(uiStep - 1);
  });

  // ====================================================================
  // STEP 1 — CONSUMPTION
  // ====================================================================
  const fileInput = root.querySelector<HTMLInputElement>('[data-cfe-file]');
  const cfeStatus = root.querySelector<HTMLElement>('[data-cfe-status]');
  const manualWrap = root.querySelector<HTMLElement>('[data-manual]');
  const monthlyInput = root.querySelector<HTMLInputElement>('[data-monthly-kwh]');

  function setCfeStatus(msg: string, show = true) {
    if (!cfeStatus) return;
    cfeStatus.textContent = msg;
    cfeStatus.hidden = !show;
  }
  function revealManual() {
    if (manualWrap) manualWrap.hidden = false;
  }

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    // Clear any prior parsed value; new attempt.
    answers.billKwhPerDay = undefined;
    syncNext();
    if (file.size > MAX_FILE_BYTES) {
      setCfeStatus(tr('assessment.consumption.too_large'));
      revealManual();
      return;
    }
    setCfeStatus(tr('assessment.consumption.reading'));
    try {
      const payload = await fileToB64(file);
      const res = await parseCfe(baseUrl, payload);
      if ('fallback' in res) {
        setCfeStatus(tr('assessment.consumption.parse_failed'));
        revealManual();
        return;
      }
      answers.billKwhPerDay = res.kwhPerDay;
      answers.monthlyKwh = undefined;
      setCfeStatus(
        tr('assessment.consumption.parsed').replace('{kwh}', String(Math.round(res.kwhPerDay))),
      );
    } catch {
      setCfeStatus(tr('assessment.consumption.parse_failed'));
      revealManual();
    }
    syncNext();
  });

  monthlyInput?.addEventListener('input', () => {
    const v = Number(monthlyInput.value);
    answers.monthlyKwh = v > 0 ? v : undefined;
    // Manual entry supersedes any prior (failed) bill parse.
    if (answers.monthlyKwh) answers.billKwhPerDay = undefined;
    syncNext();
  });

  // "I don't know my usage" → straight to Door B. NO price.
  root.querySelector<HTMLButtonElement>('[data-dont-know]')?.addEventListener('click', () => {
    routeToDoorB(true);
  });

  // ====================================================================
  // STEP 2 — EXISTING SOLAR
  // ====================================================================
  const solarDetail = root.querySelector<HTMLElement>('[data-solar-detail]');
  const panelCountInput = root.querySelector<HTMLInputElement>('[data-panel-count]');
  const panelWattsInput = root.querySelector<HTMLInputElement>('[data-panel-watts]');
  const kwpOut = root.querySelector<HTMLElement>('[data-existing-kwp]');

  function updateKwp() {
    const c = Number(panelCountInput?.value ?? 0);
    const w = Number(panelWattsInput?.value ?? 0);
    answers.panelCount = c;
    answers.panelWatts = w;
    const kwp = existingSolarKw(c, w);
    if (kwpOut) {
      kwpOut.textContent = kwp > 0
        ? tr('assessment.solar.computed_kwp').replace('{kwp}', kwp.toFixed(2))
        : '';
    }
  }
  root.querySelectorAll<HTMLButtonElement>('[data-existing-solar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const yes = btn.dataset.existingSolar === 'yes';
      answers.hasExistingSolar = yes;
      root.querySelectorAll<HTMLButtonElement>('[data-existing-solar]')
        .forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
      if (solarDetail) solarDetail.hidden = !yes;
      if (!yes) {
        answers.panelCount = 0;
        answers.panelWatts = 0;
      } else {
        updateKwp();
      }
    });
  });
  panelCountInput?.addEventListener('input', updateKwp);
  panelWattsInput?.addEventListener('input', updateKwp);

  // ====================================================================
  // STEP 3 — APPLIANCES + COVERAGE + ADD SOLAR
  // ====================================================================
  const ap = answers.appliances!;
  const bindNum = (sel: string, key: keyof typeof ap) => {
    root.querySelector<HTMLInputElement>(sel)?.addEventListener('input', (e) => {
      const v = Number((e.target as HTMLInputElement).value);
      (ap as Record<string, unknown>)[key] = v > 0 ? v : 0;
    });
  };
  bindNum('[data-mini-splits]', 'miniSplits');
  bindNum('[data-refrigerators]', 'refrigerators');
  const bindCheck = (sel: string, key: keyof typeof ap) => {
    root.querySelector<HTMLInputElement>(sel)?.addEventListener('change', (e) => {
      (ap as Record<string, unknown>)[key] = (e.target as HTMLInputElement).checked;
    });
  };
  bindCheck('[data-pool-pump]', 'poolPump');
  bindCheck('[data-electric-oven]', 'electricOven');
  bindCheck('[data-induction]', 'inductionCooktop');
  bindCheck('[data-elevator]', 'elevator');
  root.querySelector<HTMLSelectElement>('[data-water-pump]')?.addEventListener('change', (e) => {
    ap.waterPump = (e.target as HTMLSelectElement).value as 'none' | '110' | '220';
  });

  // ---- Custom appliance ("add an appliance that's not listed") ----
  if (!ap.otherLoads) ap.otherLoads = [];
  const addNameInput = root.querySelector<HTMLInputElement>('[data-add-name]');
  const addWattsInput = root.querySelector<HTMLInputElement>('[data-add-watts]');
  const addCriticalInput = root.querySelector<HTMLInputElement>('[data-add-critical]');
  const addApplianceBtn = root.querySelector<HTMLButtonElement>('[data-add-appliance]');
  const addedList = root.querySelector<HTMLElement>('[data-added-list]');

  function syncAddBtn() {
    if (!addApplianceBtn) return;
    const name = addNameInput?.value.trim() ?? '';
    const watts = Number(addWattsInput?.value ?? 0);
    addApplianceBtn.disabled = !(name.length > 0 && watts > 0);
  }
  function renderAddedLoads() {
    if (!addedList) return;
    const loads = ap.otherLoads ?? [];
    addedList.innerHTML = '';
    loads.forEach((load, i) => {
      const li = document.createElement('li');
      li.className = 'ff-as__added-item';
      const label = document.createElement('span');
      label.className = 'ff-as__added-label';
      const critTag = load.critical ? ' · ' + tr('assessment.appliances.add_critical_tag') : '';
      label.textContent = `${load.name} — ${load.watts} W${critTag}`;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'ff-as__added-remove';
      rm.textContent = tr('assessment.appliances.add_remove');
      rm.setAttribute('aria-label', tr('assessment.appliances.add_remove') + ': ' + load.name);
      rm.addEventListener('click', () => {
        (ap.otherLoads ?? []).splice(i, 1);
        renderAddedLoads();
      });
      li.appendChild(label);
      li.appendChild(rm);
      addedList.appendChild(li);
    });
  }
  addNameInput?.addEventListener('input', syncAddBtn);
  addWattsInput?.addEventListener('input', syncAddBtn);
  addApplianceBtn?.addEventListener('click', () => {
    const name = addNameInput?.value.trim() ?? '';
    const watts = Number(addWattsInput?.value ?? 0);
    if (!(name.length > 0 && watts > 0)) return;
    const load: OtherLoad = { name, watts, critical: !!addCriticalInput?.checked };
    (ap.otherLoads ??= []).push(load);
    if (addNameInput) addNameInput.value = '';
    if (addWattsInput) addWattsInput.value = '';
    if (addCriticalInput) addCriticalInput.checked = false;
    syncAddBtn();
    renderAddedLoads();
  });
  renderAddedLoads();

  root.querySelectorAll<HTMLButtonElement>('[data-coverage]').forEach((btn) => {
    btn.addEventListener('click', () => {
      answers.coverageTier = btn.dataset.coverage as CoverageTier;
      root.querySelectorAll<HTMLButtonElement>('[data-coverage]')
        .forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
    });
  });
  // ---- Add-solar: recommendation-anchored stepper ----
  const solarRec = root.querySelector<HTMLElement>('[data-solar-rec]');
  const solarFallback = root.querySelector<HTMLElement>('[data-add-solar-fallback]');
  const recLine = root.querySelector<HTMLElement>('[data-rec-line]');
  const panelVal = root.querySelector<HTMLElement>('[data-panel-val]');
  const offsetLine = root.querySelector<HTMLElement>('[data-offset-line]');
  let solarTouched = false; // once the user adjusts, stop auto-resetting to rec

  // Current consumption (kWh/day) from a parsed bill or manual monthly entry.
  function currentCfeKwhPerDay(): number {
    if (typeof answers.billKwhPerDay === 'number' && answers.billKwhPerDay > 0) {
      return answers.billKwhPerDay;
    }
    if (typeof answers.monthlyKwh === 'number' && answers.monthlyKwh > 0) {
      return answers.monthlyKwh / 30;
    }
    return 0;
  }
  function currentExistingKw(): number {
    return answers.hasExistingSolar
      ? existingSolarKw(answers.panelCount ?? 0, answers.panelWatts ?? 0)
      : 0;
  }

  function renderSolarReadout() {
    const cfe = currentCfeKwhPerDay();
    const existing = currentExistingKw();
    const n = answers.addSolarPanels ?? 0;
    if (panelVal) {
      panelVal.textContent = tr('assessment.addsolar.count').replace('{n}', String(n));
    }
    if (offsetLine) {
      offsetLine.textContent = tr('assessment.solar.offset').replace(
        '{pct}',
        String(offsetPct(n, cfe, existing)),
      );
    }
  }

  // Bounded panel change: 0 allowed; first positive snaps to the 4-panel min.
  function setPanels(n: number) {
    let v = Math.max(0, Math.round(n));
    if (v > 0 && v < 4) v = 4;
    answers.addSolarPanels = v;
    solarTouched = true;
    renderSolarReadout();
  }
  root.querySelector<HTMLButtonElement>('[data-panel-inc]')?.addEventListener('click', () => {
    const cur = answers.addSolarPanels ?? 0;
    setPanels(cur === 0 ? 4 : cur + 1);
  });
  root.querySelector<HTMLButtonElement>('[data-panel-dec]')?.addEventListener('click', () => {
    const cur = answers.addSolarPanels ?? 0;
    setPanels(cur <= 4 ? 0 : cur - 1);
  });
  root.querySelector<HTMLButtonElement>('[data-panel-none]')?.addEventListener('click', () => setPanels(0));

  // Recompute + default-select the recommendation when entering the solar step.
  function prepareSolarStep() {
    const cfe = currentCfeKwhPerDay();
    if (cfe <= 0) {
      // Consumption unknown here (shouldn't happen) → fixed-chip fallback.
      if (solarRec) solarRec.hidden = true;
      if (solarFallback) solarFallback.hidden = false;
      return;
    }
    if (solarFallback) solarFallback.hidden = true;
    if (solarRec) solarRec.hidden = false;
    const rec = recommendPanels(cfe, currentExistingKw());
    if (recLine) {
      recLine.innerHTML = tr('assessment.solar.recommend').replace(
        '{rec}',
        `<strong>${rec}</strong>`,
      );
    }
    // Default-select the recommendation until the user adjusts the stepper.
    if (!solarTouched) answers.addSolarPanels = rec;
    renderSolarReadout();
  }

  // Fallback fixed-chip selection (only used when consumption is unknown).
  root.querySelectorAll<HTMLButtonElement>('[data-add-solar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      answers.addSolarPanels = Number(btn.dataset.addSolar ?? 0);
      solarTouched = true;
      root.querySelectorAll<HTMLButtonElement>('[data-add-solar]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-checked', String(on));
      });
    });
  });

  // ====================================================================
  // STEP 4 — BACKUP GOAL
  // ====================================================================
  root.querySelectorAll<HTMLButtonElement>('[data-backup-hours]').forEach((btn) => {
    btn.addEventListener('click', () => {
      answers.backupHours = Number(btn.dataset.backupHours ?? 12);
      root.querySelectorAll<HTMLButtonElement>('[data-backup-hours]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-checked', String(on));
      });
    });
  });

  // ====================================================================
  // STEP 5 — RESULT
  // ====================================================================
  const loadingEl = root.querySelector<HTMLElement>('[data-result-loading]');
  const resultBlock = root.querySelector<HTMLElement>('[data-result-block]');
  const tiersEl = root.querySelector<HTMLElement>('[data-tiers]');
  const dailyNote = root.querySelector<HTMLElement>('[data-daily-note]');
  const offsetNote = root.querySelector<HTMLElement>('[data-offset-note]');
  const curBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-currency]'));

  async function runResult() {
    if (loadingEl) loadingEl.hidden = false;
    if (resultBlock) resultBlock.hidden = true;

    // Hard gate: no known consumption → never price. Route to Door B.
    if (!consumptionKnown(answers)) {
      routeToDoorB(true);
      return;
    }

    const res = await fetchEstimate(baseUrl, toEstimateBody(answers));
    // Fail safe: any error or a needsSiteVisit verdict → Door B, friendly note.
    if ('error' in res || res.needsSiteVisit || !res.tiers || res.tiers.length === 0) {
      routeToDoorB(true);
      return;
    }

    lastResult = res;
    fxUsdMxn = typeof res.fxUsdMxn === 'number' && res.fxUsdMxn > 0 ? res.fxUsdMxn : 1;
    selectedTier = res.tiers.find((t) => t.highlighted)?.key ?? res.tiers[0].key;

    if (loadingEl) loadingEl.hidden = true;
    if (resultBlock) resultBlock.hidden = false;

    // Daily kWh + existing-solar offset notes.
    if (dailyNote) {
      if (typeof res.dailyKwh === 'number' && res.dailyKwh > 0) {
        dailyNote.textContent = tr('assessment.result.daily_note').replace('{kwh}', String(Math.round(res.dailyKwh)));
        dailyNote.hidden = false;
      } else dailyNote.hidden = true;
    }
    if (offsetNote) {
      const off = res.existingSolarKw ?? 0;
      if (off > 0) {
        offsetNote.textContent = tr('assessment.result.offset_note').replace('{kwp}', off.toFixed(2));
        offsetNote.hidden = false;
      } else offsetNote.hidden = true;
    }

    renderTiers();
  }

  function fmt(usd: number): string {
    const val = currency === 'MXN' ? usd * fxUsdMxn : usd;
    const loc = locale === 'es' ? 'es-MX' : 'en-US';
    return new Intl.NumberFormat(loc, { style: 'currency', currency, maximumFractionDigits: 0 }).format(val);
  }

  function tierChips(cfg: EstimateTier['config']): string {
    const parts = [`${cfg.inverterKw} kW`, `${cfg.batteryKwh} kWh`];
    if (cfg.panels > 0) {
      parts.push(locale === 'es' ? `${cfg.panels} paneles` : `${cfg.panels} panels`);
    }
    let s = parts.join(' · ');
    if (cfg.includeSubpanel) s += ` + ${tr('assessment.result.subpanel_chip')}`;
    return s;
  }

  const TIER_NAME: Record<string, string> = {
    essentials: 'assessment.result.tier_essentials_name',
    critical: 'assessment.result.tier_critical_name',
    recommended: 'assessment.result.tier_recommended_name',
  };
  const TIER_COVER: Record<string, string> = {
    essentials: 'assessment.result.tier_essentials_cover',
    critical: 'assessment.result.tier_critical_cover',
    recommended: 'assessment.result.tier_recommended_cover',
  };

  function renderTiers() {
    if (!tiersEl || !lastResult?.tiers) return;
    tiersEl.innerHTML = '';
    for (const tier of lastResult.tiers) {
      const li = document.createElement('li');
      li.className = 'ff-as__tier' + (tier.highlighted ? ' is-highlight' : '');
      const isSel = tier.key === selectedTier;
      const nameKey = TIER_NAME[tier.key] ?? 'assessment.result.tier_recommended_name';
      const coverKey = TIER_COVER[tier.key] ?? 'assessment.result.tier_recommended_cover';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ff-as__tier-btn';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(isSel));
      btn.innerHTML = `
        ${tier.highlighted ? `<span class="ff-as__tier-badge">${esc(tr('assessment.result.tier_badge'))}</span>` : ''}
        <span class="ff-as__tier-name">${esc(tr(nameKey))}</span>
        <span class="ff-as__tier-cover">${esc(tr(coverKey))}</span>
        <span class="ff-as__tier-chips">${esc(tierChips(tier.config))}</span>
        <span class="ff-as__tier-price">
          <span class="ff-as__tier-from">${esc(tr('assessment.result.price_from'))}</span>
          <span class="ff-as__tier-amount">${esc(fmt(tier.price.preIvaUsd))}</span>
          <span class="ff-as__tier-iva">${esc(tr('assessment.result.price_iva_line').replace('{iva}', fmt(tier.price.ivaUsd)))}</span>
        </span>
        <span class="ff-as__tier-cta">${esc(isSel ? tr('assessment.result.tier_selected') : tr('assessment.result.tier_select'))}</span>
      `;
      btn.addEventListener('click', () => {
        selectedTier = tier.key;
        renderTiers();
      });
      li.appendChild(btn);
      tiersEl.appendChild(li);
    }
  }

  curBtns.forEach((cb) => {
    cb.addEventListener('click', () => {
      currency = (cb.dataset.currency as 'USD' | 'MXN') ?? 'USD';
      curBtns.forEach((b) => {
        const on = b === cb;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-checked', String(on));
      });
      renderTiers();
    });
  });

  // ---- Door A capture form ----
  const captureForm = root.querySelector<HTMLFormElement>('[data-capture]');
  const nameInput = root.querySelector<HTMLInputElement>('[data-name]');
  const contactInput = root.querySelector<HTMLInputElement>('[data-contact]');
  const hpInput = root.querySelector<HTMLInputElement>('[data-hp]');
  const submitBtn = root.querySelector<HTMLButtonElement>('[data-submit]');
  const okState = root.querySelector<HTMLElement>('[data-state-ok]');
  const errState = root.querySelector<HTMLElement>('[data-state-err]');

  function syncSubmit() {
    if (!submitBtn) return;
    const ok = (nameInput?.value.trim().length ?? 0) > 0 && (contactInput?.value.trim().length ?? 0) > 0;
    submitBtn.disabled = !ok;
  }
  nameInput?.addEventListener('input', syncSubmit);
  contactInput?.addEventListener('input', syncSubmit);

  captureForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Honeypot tripped → swallow without submitting (bot, not a person).
    if (hpInput?.value) return;
    if (submitBtn) submitBtn.disabled = true;
    const payload: LeadPayload = {
      name: nameInput?.value.trim() ?? '',
      contact: contactInput?.value.trim() ?? '',
      segment: 'residential',
      locale,
      answers,
      config: { selectedTier, tiers: lastResult?.tiers ?? [] },
      hp: hpInput?.value ?? '',
    };
    const res = await submitLead(baseUrl, payload);
    if (res.ok) {
      if (captureForm) captureForm.hidden = true;
      if (okState) { okState.hidden = false; okState.focus?.(); }
    } else {
      if (errState) errState.hidden = false; // never fake success
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // ====================================================================
  // DOOR B (site visit) — used as door + as fail-safe destination
  // ====================================================================
  function routeToDoorB(withFallbackNote: boolean) {
    showView('sitevisit');
    const note = root.querySelector<HTMLElement>('[data-sitevisit-note]');
    if (note) note.hidden = !withFallbackNote;
  }

  // Bind the Door B form (lives inside SiteVisitLead.astro).
  const svRoot = root.querySelector<HTMLElement>('[data-sitevisit]');
  if (svRoot) {
    const svForm = svRoot.querySelector<HTMLFormElement>('[data-sitevisit-form]');
    const svName = svRoot.querySelector<HTMLInputElement>('[data-sv-name]');
    const svContact = svRoot.querySelector<HTMLInputElement>('[data-sv-contact]');
    const svLocation = svRoot.querySelector<HTMLInputElement>('[data-sv-location]');
    const svMessage = svRoot.querySelector<HTMLTextAreaElement>('[data-sv-message]');
    const svHp = svRoot.querySelector<HTMLInputElement>('[data-sv-hp]');
    const svSubmit = svRoot.querySelector<HTMLButtonElement>('[data-sv-submit]');
    const svOk = svRoot.querySelector<HTMLElement>('[data-sv-state-ok]');
    const svErr = svRoot.querySelector<HTMLElement>('[data-sv-state-err]');

    const svSync = () => {
      if (!svSubmit) return;
      const ok = (svName?.value.trim().length ?? 0) > 0 && (svContact?.value.trim().length ?? 0) > 0;
      svSubmit.disabled = !ok;
    };
    svName?.addEventListener('input', svSync);
    svContact?.addEventListener('input', svSync);

    svForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (svHp?.value) return; // honeypot
      if (svSubmit) svSubmit.disabled = true;
      const payload: LeadPayload = {
        name: svName?.value.trim() ?? '',
        contact: svContact?.value.trim() ?? '',
        segment: 'residential',
        locale,
        answers: {
          ...answers,
          location: svLocation?.value.trim() || undefined,
          note: svMessage?.value.trim() || undefined,
        },
        config: { siteVisitRequested: true },
        hp: svHp?.value ?? '',
      };
      const res = await submitLead(baseUrl, payload);
      if (res.ok) {
        if (svForm) svForm.hidden = true;
        if (svOk) { svOk.hidden = false; svOk.focus?.(); }
      } else {
        if (svErr) svErr.hidden = false; // never fake success → WhatsApp fallback
        if (svSubmit) svSubmit.disabled = false;
      }
    });
  }

  // ---- HTML escaping for innerHTML-built tier cards ----
  function esc(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
