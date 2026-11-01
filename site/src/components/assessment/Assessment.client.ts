import {
  toEstimateBody,
  consumptionKnown,
  existingSolarKw,
  recommendPanels,
  offsetPct,
  upsertBill,
  billsDailyKwh,
  billsPending,
  MAX_METERS,
  type AssessmentAnswers,
  type BillAnswer,
  type CoverageTier,
  type OtherLoad,
} from '../../lib/assessment';
import { fetchEstimate, type EstimateResult } from '../../lib/estimateClient';
import { uploadCfePages, MAX_BILL_PAGES, type CfePagesResult } from '../../lib/cfeUploadClient';
import { submitLead, type LeadPayload } from '../../lib/leadClient';
import { t, type Locale } from '../../lib/i18n';
import { buildWaSuccessHref } from '../../lib/waLink';

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
  const dailyInput = root.querySelector<HTMLInputElement>('[data-daily-kwh]');

  function setCfeStatus(msg: string, show = true) {
    if (!cfeStatus) return;
    cfeStatus.textContent = msg;
    cfeStatus.hidden = !show;
  }
  function revealManual() {
    if (manualWrap) manualWrap.hidden = false;
  }

  const backInput = root.querySelector<HTMLInputElement>('[data-cfe-back-file]');
  const meterList = root.querySelector<HTMLElement>('[data-meter-list]');
  const backPrompt = root.querySelector<HTMLElement>('[data-back-prompt]');
  const metersPrompt = root.querySelector<HTMLElement>('[data-meters-prompt]');
  const meterAddBtn = root.querySelector<HTMLButtonElement>('[data-meter-add]');

  // One entry per meter, aligned by position with `answers.bills`: the original File objects,
  // kept so "Add the back" can re-upload the WHOLE bill (front + back) in one read.
  const billFiles: File[][] = [];
  // Position of the bill the back prompt is about (replace by position — never by meter key,
  // which may be missing on a front-only read).
  let backIndex = -1;
  let busy = false;

  const bills = (): BillAnswer[] => (answers.bills ??= []);

  // A PDF is uploaded as-is, so it must fit the per-file cap; images are downscaled first.
  const pdfTooLarge = (files: File[]) =>
    files.some((f) => !f.type.startsWith('image/') && f.size > MAX_FILE_BYTES);

  function toBill(res: Extract<CfePagesResult, { ok: true }>): BillAnswer {
    return {
      pagePaths: res.pagePaths,
      kwhPerDay: res.kwhPerDay,
      annualKwh: res.annualKwh,
      meterNo: res.meterNo ?? null,
      serviceNo: res.serviceNo ?? null,
      tariff: res.tariff ?? null,
      kwhTotal: res.kwhTotal,
      periodDays: res.periodDays,
      address: res.address ?? null,
      extraction: res.extraction,
    };
  }

  // Bills the CRM parked but couldn't read. Their card keeps a "daily kWh" field even after
  // the customer types a figure into it (which becomes that bill's kwhPerDay).
  const unreadBills = new WeakSet<BillAnswer>();

  // Everything derived from the bill list: the lead's top-level address (site-lead reads
  // `billAddress`), the summed reading, the meter rows, and the Next gate.
  function syncBills(notice = '') {
    renderMeters();
    syncSummary(notice);
  }

  // Status line, manual-field visibility and the Next gate — without rebuilding the meter rows
  // (so typing in a meter's kWh field keeps focus).
  function syncSummary(notice = '') {
    const list = bills();
    const firstAddr = list.find((b) => b.address)?.address;
    answers.billAddress = firstAddr ?? undefined;
    const total = billsDailyKwh(list);
    const pending = billsPending(list);
    if (total > 0) {
      answers.dailyKwh = undefined;
      if (dailyInput) dailyInput.value = '';
      if (manualWrap) manualWrap.hidden = true;
      // Mixed read + unread meters: never show a partial total as if it were the whole home.
      const line = pending > 0
        ? tr('assessment.consumption.meter_pending')
        : tr('assessment.consumption.parsed').replace('{kwh}', String(Math.round(total)));
      setCfeStatus(notice ? `${notice} ${line}` : line);
    } else {
      revealManual();
      if (notice) setCfeStatus(notice);
    }
    if (meterAddBtn) meterAddBtn.disabled = list.length >= MAX_METERS;
    syncNext();
  }

  function renderMeters() {
    if (!meterList) return;
    const list = bills();
    meterList.innerHTML = '';
    meterList.hidden = list.length === 0;
    list.forEach((b, i) => {
      const li = document.createElement('li');
      li.className = 'ff-as__meter';
      const unread = unreadBills.has(b);
      if (unread) li.classList.add('is-unread');
      const label = document.createElement('span');
      label.className = 'ff-as__meter-label';
      label.textContent = unread
        ? tr('assessment.consumption.meter_unread').replace('{n}', String(i + 1))
        : tr('assessment.consumption.meter_item')
            .replace('{n}', String(i + 1))
            .replace('{kwh}', String(Math.round(billsDailyKwh([b]))));
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'ff-as__meter-remove';
      rm.textContent = tr('assessment.consumption.meter_remove');
      rm.setAttribute('aria-label', `${tr('assessment.consumption.meter_remove')}: ${label.textContent}`);
      rm.addEventListener('click', () => removeMeter(i));
      li.appendChild(label);
      li.appendChild(rm);
      if (unread) {
        const field = document.createElement('label');
        field.className = 'ff-as__meter-kwh';
        const cap = document.createElement('span');
        cap.textContent = tr('assessment.consumption.meter_kwh_label');
        const input = document.createElement('input');
        input.type = 'number';
        input.inputMode = 'decimal';
        input.min = '0';
        input.step = 'any';
        input.dataset.meterKwh = String(i);
        if (typeof b.kwhPerDay === 'number' && b.kwhPerDay > 0) input.value = String(b.kwhPerDay);
        input.addEventListener('input', () => {
          const v = Number(input.value);
          b.kwhPerDay = v > 0 ? v : null; // sent as this meter's kwhPerDay; pages kept
          syncSummary();
        });
        field.appendChild(cap);
        field.appendChild(input);
        li.appendChild(field);
      }
      meterList.appendChild(li);
    });
  }

  function removeMeter(i: number) {
    bills().splice(i, 1);
    billFiles.splice(i, 1);
    if (backIndex === i) {
      backIndex = -1;
      if (backPrompt) backPrompt.hidden = true;
    } else if (backIndex > i) {
      backIndex -= 1;
    }
    if (bills().length === 0) {
      if (metersPrompt) metersPrompt.hidden = true;
      setCfeStatus('', false);
    }
    syncBills();
  }

  // After a meter is settled (read, back added or skipped): offer another meter, if room.
  function askForMoreMeters() {
    if (backPrompt) backPrompt.hidden = true;
    backIndex = -1;
    if (metersPrompt) metersPrompt.hidden = bills().length >= MAX_METERS;
  }

  // A fresh bill (first meter or "Add another meter"): same-meter re-upload replaces it.
  fileInput?.addEventListener('change', async () => {
    const files = Array.from(fileInput.files ?? []);
    fileInput.value = ''; // let the same file be picked again
    if (files.length === 0 || busy) return;
    if (files.length > MAX_BILL_PAGES) {
      setCfeStatus(tr('assessment.consumption.too_many_pages'));
      return;
    }
    if (pdfTooLarge(files)) {
      // With meters already read, the global manual field is ignored — don't offer it.
      if (billsDailyKwh(bills()) > 0) {
        setCfeStatus(tr('assessment.consumption.meter_too_large'));
      } else {
        setCfeStatus(tr('assessment.consumption.too_large'));
        revealManual();
      }
      return;
    }
    busy = true;
    if (backPrompt) backPrompt.hidden = true;
    if (metersPrompt) metersPrompt.hidden = true;
    setCfeStatus(tr('assessment.consumption.reading'));
    const res = await uploadCfePages(files, baseUrl);
    busy = false;

    if (!('ok' in res)) {
      // Unreadable, but if the CRM parked the pages keep them, so staff still get the bill.
      if (res.pagePaths?.length && bills().length < MAX_METERS) {
        const unread: BillAnswer = { pagePaths: res.pagePaths, kwhPerDay: null };
        unreadBills.add(unread);
        bills().push(unread);
        billFiles.push(files);
      }
      // With other meters already read, the manual field stays hidden — just say this one failed.
      const haveReading = billsDailyKwh(bills()) > 0;
      syncBills(tr(haveReading ? 'assessment.consumption.meter_parse_failed' : 'assessment.consumption.parse_failed'));
      if (haveReading) askForMoreMeters();
      return;
    }

    const before = bills().length;
    const bill = toBill(res);
    const { bills: next, replaced } = upsertBill(bills(), bill);
    if (!replaced && next.length === before) {
      setCfeStatus(tr('assessment.consumption.meters_max'));
      return;
    }
    answers.bills = next;
    const idx = next.indexOf(bill);
    if (replaced) billFiles[idx] = files;
    else billFiles.push(files);
    syncBills(replaced ? tr('assessment.consumption.meter_replaced') : '');

    if (!res.hasHistory && res.allImages) {
      backIndex = idx;
      if (backPrompt) backPrompt.hidden = false;
      // The prompt itself opens with "Got it." — don't say it twice.
      if (!replaced) setCfeStatus('', false);
    } else {
      askForMoreMeters();
    }
  });

  // "Add the back": re-read the whole bill (its original pages + the new ones) and replace
  // that bill by position.
  root.querySelector<HTMLButtonElement>('[data-back-add]')?.addEventListener('click', () => {
    if (backIndex >= 0) backInput?.click();
  });
  root.querySelector<HTMLButtonElement>('[data-back-skip]')?.addEventListener('click', () => {
    syncBills(); // bring back the reading line the prompt stood in for
    askForMoreMeters();
  });
  backInput?.addEventListener('change', async () => {
    const extra = Array.from(backInput.files ?? []);
    backInput.value = '';
    const idx = backIndex;
    if (extra.length === 0 || idx < 0 || busy) return;
    const pages = [...(billFiles[idx] ?? []), ...extra];
    if (pages.length > MAX_BILL_PAGES) {
      setCfeStatus(tr('assessment.consumption.too_many_pages'));
      return;
    }
    busy = true;
    setCfeStatus(tr('assessment.consumption.reading'));
    const res = await uploadCfePages(pages, baseUrl);
    busy = false;
    if (backIndex !== idx) {
      // Skipped or removed while reading: drop the result, but don't leave "Reading…" up.
      setCfeStatus('', false);
      syncSummary();
      return;
    }
    if ('ok' in res) {
      bills()[idx] = toBill(res);
      billFiles[idx] = pages;
      syncBills();
    } else {
      syncBills(tr('assessment.consumption.back_failed'));
    }
    askForMoreMeters();
  });

  meterAddBtn?.addEventListener('click', () => {
    if (bills().length < MAX_METERS) fileInput?.click();
  });
  root.querySelector<HTMLButtonElement>('[data-meters-done]')?.addEventListener('click', () => {
    if (metersPrompt) metersPrompt.hidden = true;
  });

  dailyInput?.addEventListener('input', () => {
    const v = Number(dailyInput.value);
    answers.dailyKwh = v > 0 ? v : undefined;
    // Manual entry is the fallback when no meter was read (the field is hidden once one is);
    // the estimate prefers the read meters whenever any exist.
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

  // −/＋ steppers: adjust the sibling number input, clamp at 0, and fire `input`
  // so the bindings above stay in sync. Buttons only: the wizard's step containers are
  // `<div data-step="N">` too, and binding those bumped the manual kWh field on every click.
  root.querySelectorAll<HTMLButtonElement>('button[data-step]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement?.querySelector<HTMLInputElement>('input[type="number"]');
      if (!input) return;
      const next = Math.max(0, (Number(input.value) || 0) + Number(btn.dataset.step));
      input.value = String(next);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });

  // Number fields that default to "0": clear on focus so typing "2" gives 2, not
  // 20; restore "0" on blur if left empty (and resync state).
  root.querySelectorAll<HTMLInputElement>('input[data-zero]').forEach((input) => {
    input.addEventListener('focus', () => { if (input.value === '0') input.value = ''; });
    input.addEventListener('blur', () => {
      if (input.value.trim() === '') {
        input.value = '0';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  });
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
  const recLine = root.querySelector<HTMLElement>('[data-rec-line]');
  const recBtn = root.querySelector<HTMLButtonElement>('[data-panel-rec]');
  const noneBtn = root.querySelector<HTMLButtonElement>('[data-panel-none]');
  const addSolarHeading = root.querySelector<HTMLElement>('[data-addsolar-heading]');
  const addSolarHelp = root.querySelector<HTMLElement>('[data-addsolar-help]');
  const panelVal = root.querySelector<HTMLInputElement>('[data-panel-val]');
  const offsetLine = root.querySelector<HTMLElement>('[data-offset-line]');
  let solarTouched = false; // once the user adjusts, stop auto-resetting to rec
  let lastRec = 0; // most recent recommendation, for the "Use recommended" button

  // Current consumption (kWh/day) from a parsed bill or manual monthly entry.
  function currentCfeKwhPerDay(): number {
    const fromBills = billsDailyKwh(answers.bills);
    if (fromBills > 0) return fromBills;
    if (typeof answers.dailyKwh === 'number' && answers.dailyKwh > 0) {
      return answers.dailyKwh;
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
    // The oversize field shows a number ONLY when oversizing (a custom count that
    // isn't the recommendation or battery-only); otherwise it stays blank.
    const isCustom = n > 0 && n !== lastRec;
    if (panelVal && document.activeElement !== panelVal) panelVal.value = isCustom ? String(n) : '';
    if (offsetLine) {
      offsetLine.textContent = tr('assessment.solar.offset').replace(
        '{pct}',
        String(offsetPct(n, cfe, existing)),
      );
    }
    // Highlight whichever quick-set action matches the current count.
    noneBtn?.classList.toggle('is-active', n === 0);
    recBtn?.classList.toggle('is-active', n > 0 && n === lastRec);
  }

  // Bounded panel change: 0 allowed; first positive snaps to the 4-panel min.
  function setPanels(n: number) {
    let v = Math.max(0, Math.round(n));
    if (v > 0 && v < 4) v = 4;
    answers.addSolarPanels = v;
    solarTouched = true;
    renderSolarReadout();
  }
  noneBtn?.addEventListener('click', () => setPanels(0));
  recBtn?.addEventListener('click', () => setPanels(lastRec));
  // Oversize: typing a number sets the panel count directly. Clamp on commit
  // (blur/Enter); an empty field falls back to the recommendation.
  panelVal?.addEventListener('change', () => {
    const v = panelVal.value.trim();
    setPanels(v === '' ? lastRec : Number(v) || 0);
  });

  // Recompute + default-select the recommendation when entering the solar step.
  function prepareSolarStep() {
    const cfe = currentCfeKwhPerDay();
    if (solarRec) solarRec.hidden = false;
    // If they already have solar (entered existing panels), this step is about
    // *additional* panels — and "none" means keep the panels they already have.
    const hasExisting = currentExistingKw() > 0;
    if (addSolarHeading)
      addSolarHeading.textContent = tr(hasExisting ? 'assessment.addsolar.heading_existing' : 'assessment.addsolar.heading');
    if (addSolarHelp)
      addSolarHelp.textContent = tr(hasExisting ? 'assessment.addsolar.help_existing' : 'assessment.addsolar.help');
    if (noneBtn)
      noneBtn.textContent = tr(hasExisting ? 'assessment.solar.none_existing' : 'assessment.solar.none');
    // No recommendation without consumption (shouldn't happen in Door A): keep the
    // stepper for free entry, hide the rec line + "Use recommended" button.
    lastRec = cfe > 0 ? recommendPanels(cfe, currentExistingKw()) : 0;
    if (recLine) {
      recLine.hidden = lastRec <= 0;
      if (lastRec > 0) {
        recLine.innerHTML = tr('assessment.solar.recommend').replace('{rec}', `<strong>${lastRec}</strong>`);
      }
    }
    if (recBtn) recBtn.hidden = lastRec <= 0;
    // Default-select the recommendation until the user adjusts the stepper.
    if (!solarTouched && lastRec > 0) answers.addSolarPanels = lastRec;
    renderSolarReadout();
  }

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

  function runResult() {
    // No known consumption → we can't size a proposal from inputs alone; route to
    // the site-visit door so an expert can gather what's needed.
    if (!consumptionKnown(answers)) {
      routeToDoorB(true);
      return;
    }

    // Show the capture form immediately — there's no price to wait for. The estimate
    // is best-effort enrichment for the CRM: run it in the background and, if it
    // returns before the lead is submitted, attach the suggested config. A slow or
    // unreachable endpoint never makes the customer wait.
    if (loadingEl) loadingEl.hidden = true;
    if (resultBlock) resultBlock.hidden = false;
    void fetchEstimate(baseUrl, toEstimateBody(answers)).then((res) => {
      if (!('error' in res) && res.tiers && res.tiers.length > 0) {
        lastResult = res;
        selectedTier = res.tiers.find((t) => t.highlighted)?.key ?? res.tiers[0].key;
      }
    });
  }

  // Compose the contact fields into a lead payload's contact parts. The phone is
  // prefixed with the selected country code (e.g. "+52 415 180 5030"). `contact`
  // (phone || email) keeps back-compat with the older single-field edge fn.
  function contactParts(cc: string, phone: string, email: string, whatsapp: boolean) {
    const p = phone.trim();
    const e = email.trim();
    const full = p ? `${cc} ${p}`.trim() : '';
    return { phone: full || undefined, email: e || undefined, whatsapp, contact: full || e };
  }
  // A lead is submittable once we have a name and at least one way to reach them.
  const hasContact = (phone: string, email: string) => !!(phone.trim() || email.trim());

  // ---- Door A capture form ----
  const captureForm = root.querySelector<HTMLFormElement>('[data-capture]');
  const nameInput = root.querySelector<HTMLInputElement>('[data-name]');
  const ccInput = root.querySelector<HTMLSelectElement>('[data-phone-cc]');
  const phoneInput = root.querySelector<HTMLInputElement>('[data-phone]');
  const emailInput = root.querySelector<HTMLInputElement>('[data-email]');
  const whatsappInput = root.querySelector<HTMLInputElement>('[data-whatsapp]');
  const hpInput = root.querySelector<HTMLInputElement>('[data-hp]');
  const submitBtn = root.querySelector<HTMLButtonElement>('[data-submit]');
  const okState = root.querySelector<HTMLElement>('[data-state-ok]');
  const errState = root.querySelector<HTMLElement>('[data-state-err]');
  const waSuccessBtn = root.querySelector<HTMLAnchorElement>('[data-wa-success]');
  const softWa = root.querySelector<HTMLAnchorElement>('[data-soft-wa]');

  function captureValues() {
    return {
      name: nameInput?.value.trim() ?? '',
      ...contactParts(ccInput?.value ?? '+52', phoneInput?.value ?? '', emailInput?.value ?? '', whatsappInput?.checked ?? false),
    };
  }
  function buildCapturePayload(): LeadPayload {
    const v = captureValues();
    return {
      name: v.name,
      contact: v.contact,
      phone: v.phone,
      email: v.email,
      whatsapp: v.whatsapp,
      segment: 'residential',
      locale,
      answers,
      config: { selectedTier, tiers: lastResult?.tiers ?? [] },
      hp: hpInput?.value ?? '',
    };
  }
  function syncSubmit() {
    if (!submitBtn) return;
    const v = captureValues();
    submitBtn.disabled = !(v.name.length > 0 && hasContact(v.phone ?? '', v.email ?? ''));
  }
  nameInput?.addEventListener('input', syncSubmit);
  phoneInput?.addEventListener('input', syncSubmit);
  emailInput?.addEventListener('input', syncSubmit);

  captureForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Honeypot tripped → swallow without submitting (bot, not a person).
    if (hpInput?.value) return;
    if (submitBtn) submitBtn.disabled = true;
    const payload = buildCapturePayload();
    const res = await submitLead(baseUrl, payload);
    if (res.ok) {
      if (waSuccessBtn) {
        waSuccessBtn.href = buildWaSuccessHref(locale, 'assessment.result.wa_message', payload.name);
      }
      if (captureForm) captureForm.hidden = true;
      if (okState) { okState.hidden = false; okState.focus?.(); }
    } else {
      if (errState) errState.hidden = false; // never fake success
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // Soft "message us on WhatsApp" link: don't lose a partially-filled form.
  // Best-effort save (fire-and-forget) of whatever they've entered, then let the
  // link open WhatsApp in its new tab. Only saves if there's a name + contact.
  softWa?.addEventListener('click', () => {
    if (hpInput?.value) return;
    const payload = buildCapturePayload();
    if (payload.name && hasContact(payload.phone ?? '', payload.email ?? '')) {
      void submitLead(baseUrl, payload);
    }
  });

  // ====================================================================
  // DOOR B (site visit) — used as door + as fail-safe destination
  // ====================================================================
  // Set by the Door B binding below; prefills the location from a parsed bill.
  let prefillDoorBLocation: (() => void) | null = null;
  function routeToDoorB(withFallbackNote: boolean) {
    showView('sitevisit');
    const note = root.querySelector<HTMLElement>('[data-sitevisit-note]');
    if (note) note.hidden = !withFallbackNote;
    prefillDoorBLocation?.();
  }

  // Bind the Door B form (lives inside SiteVisitLead.astro).
  const svRoot = root.querySelector<HTMLElement>('[data-sitevisit]');
  if (svRoot) {
    const svForm = svRoot.querySelector<HTMLFormElement>('[data-sitevisit-form]');
    const svName = svRoot.querySelector<HTMLInputElement>('[data-sv-name]');
    const svCc = svRoot.querySelector<HTMLSelectElement>('[data-sv-phone-cc]');
    const svPhone = svRoot.querySelector<HTMLInputElement>('[data-sv-phone]');
    const svEmail = svRoot.querySelector<HTMLInputElement>('[data-sv-email]');
    const svWhatsapp = svRoot.querySelector<HTMLInputElement>('[data-sv-whatsapp]');
    const svLocation = svRoot.querySelector<HTMLInputElement>('[data-sv-location]');
    const svMessage = svRoot.querySelector<HTMLTextAreaElement>('[data-sv-message]');
    const svHp = svRoot.querySelector<HTMLInputElement>('[data-sv-hp]');
    const svSubmit = svRoot.querySelector<HTMLButtonElement>('[data-sv-submit]');
    const svOk = svRoot.querySelector<HTMLElement>('[data-sv-state-ok]');
    const svErr = svRoot.querySelector<HTMLElement>('[data-sv-state-err]');
    const svWaSuccess = svRoot.querySelector<HTMLAnchorElement>('[data-sv-wa-success]');
    const svSoftWa = svRoot.querySelector<HTMLAnchorElement>('[data-sv-soft-wa]');

    function svValues() {
      return {
        name: svName?.value.trim() ?? '',
        ...contactParts(svCc?.value ?? '+52', svPhone?.value ?? '', svEmail?.value ?? '', svWhatsapp?.checked ?? false),
      };
    }
    function buildSvPayload(): LeadPayload {
      const v = svValues();
      return {
        name: v.name,
        contact: v.contact,
        phone: v.phone,
        email: v.email,
        whatsapp: v.whatsapp,
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
    }
    const svSync = () => {
      if (!svSubmit) return;
      const v = svValues();
      svSubmit.disabled = !(v.name.length > 0 && hasContact(v.phone ?? '', v.email ?? ''));
    };
    svName?.addEventListener('input', svSync);
    svPhone?.addEventListener('input', svSync);
    svEmail?.addEventListener('input', svSync);

    // Prefill the location from a parsed CFE bill address when Door B opens, so we
    // don't ask for details we already have. Only fills an empty field (no clobber).
    prefillDoorBLocation = () => {
      const addr = answers.billAddress;
      if (svLocation && !svLocation.value.trim() && addr) {
        const where = [addr.colonia, addr.city].filter(Boolean).join(', ');
        if (where) svLocation.value = where;
      }
    };

    svForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (svHp?.value) return; // honeypot
      if (svSubmit) svSubmit.disabled = true;
      const payload = buildSvPayload();
      const res = await submitLead(baseUrl, payload);
      if (res.ok) {
        if (svWaSuccess) {
          svWaSuccess.href = buildWaSuccessHref(locale, 'assessment.result.wa_message', payload.name);
        }
        if (svForm) svForm.hidden = true;
        if (svOk) { svOk.hidden = false; svOk.focus?.(); }
      } else {
        if (svErr) svErr.hidden = false; // never fake success → WhatsApp fallback
        if (svSubmit) svSubmit.disabled = false;
      }
    });

    // Soft WhatsApp link: best-effort save of the partially-filled form first.
    svSoftWa?.addEventListener('click', () => {
      if (svHp?.value) return;
      const payload = buildSvPayload();
      if (payload.name && hasContact(payload.phone ?? '', payload.email ?? '')) {
        void submitLead(baseUrl, payload);
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
