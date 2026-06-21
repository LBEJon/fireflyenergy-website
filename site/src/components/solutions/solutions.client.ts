import { priceFor, formatPrice, type TierKey } from '../../lib/solutionsPricing';

/**
 * Client behavior for the Solutions tier row. Framework-free, mirrors the
 * assessment init pattern.
 *
 * State: { solar: 'off' | 'on', currency: 'MXN' | 'USD' }.
 * DEFAULT = MXN + without-solar (we sell in Mexico). Reads the build-baked
 * `fxUsdMxn` and the tier price table from the DOM, wires the four toggle
 * buttons (active styling + aria), and re-renders every `[data-price]` span via
 * the shared `priceFor` / `formatPrice` helpers so prices stay consistent with
 * the static table.
 */
export function initSolutionsTiers(root: HTMLElement): void {
  const fxUsdMxn = Number(root.dataset.fx ?? '0') || 1;

  let solar: 'off' | 'on' = 'off';
  let currency: 'USD' | 'MXN' = 'MXN';

  const priceEls = Array.from(root.querySelectorAll<HTMLElement>('[data-price][data-tier]'));
  const solarNoteEls = Array.from(root.querySelectorAll<HTMLElement>('[data-solar-note]'));
  const solarBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-solar]'));
  const currencyBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-currency]'));

  function render() {
    for (const el of priceEls) {
      const tier = el.dataset.tier as TierKey;
      const usd = priceFor(tier, solar === 'on');
      el.textContent = formatPrice(usd, currency, fxUsdMxn);
    }
    // The "shown with 6 panels" note only makes sense in the With-solar state.
    for (const el of solarNoteEls) {
      el.hidden = solar !== 'on';
    }
  }

  function setActive(btns: HTMLButtonElement[], active: HTMLButtonElement) {
    for (const b of btns) {
      const on = b === active;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', String(on));
    }
  }

  solarBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      solar = btn.dataset.solar === 'on' ? 'on' : 'off';
      setActive(solarBtns, btn);
      render();
    });
  });

  currencyBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      currency = btn.dataset.currency === 'USD' ? 'USD' : 'MXN';
      setActive(currencyBtns, btn);
      render();
    });
  });

  // Initial paint = MXN + without-solar (defaults already set in markup).
  render();
}
