# Plan Review Log: FireflyEnergy.mx lead-capture workflow
Act 1 (grill) complete — plan locked with the user. MAX_ROUNDS=5.

## Round 1 — Codex — BLOCKED (usage limit)
Codex review could not run. The ChatGPT account hit its Codex usage limit:
`"You've hit your usage limit. Upgrade to Plus to continue using Codex, or try again at Jul 13th, 2026 7:26 PM."`
(A parallel session reviewing the firefly-crm-brex accounting plan likely consumed the remaining quota;
its output also briefly clobbered the shared `/tmp/codex-verdict.txt` before this was diagnosed.)
Three attempts (threads 019ec83d, 019ec83e, 019ec83f) all returned `turn.failed` with the usage-limit error.
Cross-model Act 2 cannot proceed until the limit resets or the account is upgraded. NOT faking convergence.

## Fallback — Superpowers single-model self-critique (user-chosen)
With Codex blocked, Jon chose to fall back to Superpowers. Claude ran an adversarial self-review of
PLAN.md and folded fixes in. Material findings addressed:
1. **Double-processing race** (webhook vs reconcile) → atomic claim (`status='processing'` conditional
   UPDATE … RETURNING); only the claimer proceeds; reconcile re-claims stale `processing` rows.
2. **Notify-once gap** → `notified_at IS NULL` guard + set `notified_at` immediately on send.
3. **Public-function abuse** → 32 KB body cap, field-length caps, per-IP throttle (≤5/min), honeypot.
4. **CORS wildcard** → anchored `^https://[a-z0-9-]+\.pages\.dev$` (no substring match).
5. **Header-less invocation** of `verify_jwt=false` fn → flagged to verify; publishable-key fallback.
6. **Durability vs `EdgeRuntime.waitUntil`** → reconcile is the guarantee; n8n call best-effort only.
7. **Stuck-lead blind spot** → daily error-digest workflow (step 5).
8. **status enum→text+CHECK**; **REVOKE ALL FROM anon, authenticated**; concrete email/phone
   normalization (normalize both sides in the dedup query).
Residual risks (duplicate-contact across two simultaneous new leads; Twilio sandbox-vs-prod sender;
header-less invocation) documented in PLAN.md → Risks. Plan ready for Jon's sign-off → writing-plans.
