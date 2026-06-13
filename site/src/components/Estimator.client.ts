import { sizeSystem, type EstimatorAnswers, type SystemConfig } from '../lib/sizing';
import { priceRange, type PricingData, type PriceRangeResult } from '../lib/pricing';
import type { LeadPayload } from '../lib/leadClient';

export interface EstimatorDeps {
  /** Live pricing map, or null to fall back to placeholder pricing. */
  pricing: PricingData | null;
  /** Lead submitter (injected so the store stays DOM-free and testable). */
  leadClient: (payload: LeadPayload) => Promise<{ ok: boolean }>;
}

export interface EstimatorResult {
  config: SystemConfig;
  price: PriceRangeResult;
}

export interface SubmitInput {
  name: string;
  contact: string;
  locale: string;
  /** Honeypot value — non-empty means a bot filled the hidden field. */
  hp?: string;
}

export interface EstimatorStore {
  /** Current step, clamped to 1..4. */
  step: number;
  /** Recorded answers; complete once all three are set. */
  answers: Partial<EstimatorAnswers>;
  setAnswer<K extends keyof EstimatorAnswers>(key: K, value: EstimatorAnswers[K]): void;
  /** All three answers recorded → result is computable. */
  isComplete(): boolean;
  next(): void;
  back(): void;
  getResult(): EstimatorResult;
  canSubmit(input: { name: string; contact: string }): boolean;
  submit(input: SubmitInput): Promise<{ ok: boolean }>;
}

const MIN_STEP = 1;
const MAX_STEP = 4;

/**
 * Framework-free, dependency-injected estimator store. Holds step + answers,
 * derives the recommended system config and installed price range, and submits
 * a residential lead. DOM-free so it can be unit-tested and bound to any UI.
 */
export function createEstimator(deps: EstimatorDeps): EstimatorStore {
  const store: EstimatorStore = {
    step: MIN_STEP,
    answers: {},

    setAnswer(key, value) {
      this.answers[key] = value;
    },

    isComplete() {
      return (
        this.answers.home != null &&
        this.answers.backup != null &&
        this.answers.solar != null
      );
    },

    next() {
      this.step = Math.min(MAX_STEP, this.step + 1);
    },

    back() {
      this.step = Math.max(MIN_STEP, this.step - 1);
    },

    getResult() {
      if (!this.isComplete()) {
        throw new Error('getResult() requires all three answers to be set');
      }
      const answers = this.answers as EstimatorAnswers;
      const config = sizeSystem(answers);
      const price = priceRange(config, deps.pricing);
      return { config, price };
    },

    canSubmit(input) {
      return input.name.trim().length > 0 && input.contact.trim().length > 0;
    },

    async submit(input) {
      if (!this.canSubmit(input) || !this.isComplete()) {
        return { ok: false };
      }
      const answers = this.answers as EstimatorAnswers;
      const config = sizeSystem(answers);
      const payload: LeadPayload = {
        name: input.name.trim(),
        contact: input.contact.trim(),
        segment: 'residential',
        answers,
        config,
        locale: input.locale,
        hp: input.hp,
      };
      return deps.leadClient(payload);
    },
  };

  return store;
}
