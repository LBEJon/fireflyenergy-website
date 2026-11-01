// node supabase/functions/site-cfe-parse/proxy.test.mjs
import assert from "node:assert/strict";
import { MAX_BODY_BYTES, bodyTooLarge, crmFailureBody } from "./proxy.mjs";

// body guard: 4 × 12 MB + 64 KB
assert.equal(MAX_BODY_BYTES, 4 * 12 * 1024 * 1024 + 64 * 1024);
assert.equal(bodyTooLarge(String(MAX_BODY_BYTES)), false);
assert.equal(bodyTooLarge(String(MAX_BODY_BYTES + 1)), true);
assert.equal(bodyTooLarge("1024"), false);
assert.equal(bodyTooLarge(null), false); // absent header: per-page checks still apply
assert.equal(bodyTooLarge(""), false);
assert.equal(bodyTooLarge("abc"), false);

// CRM 429 => busy; anything else => plain manual fallback
assert.deepEqual(crmFailureBody(429), { fallback: "manual", reason: "busy" });
assert.deepEqual(crmFailureBody(500), { fallback: "manual" });
assert.deepEqual(crmFailureBody(401), { fallback: "manual" });
assert.deepEqual(crmFailureBody(400), { fallback: "manual" });

console.log("proxy.test.mjs OK");
