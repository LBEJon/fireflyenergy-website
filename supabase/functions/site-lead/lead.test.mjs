// node lead.test.mjs
import assert from "node:assert/strict";
import { buildLeadRow } from "./lead.mjs";

// explicit phone + email + whatsapp
let r = buildLeadRow({ name: "Jon", phone: "415 180 5030", email: "J@X.com", whatsapp: true });
assert.equal(r.phone, "524151805030"); // 10-digit MX → +52
assert.equal(r.email, "j@x.com");
assert.equal(r.config.whatsapp_is_same, true);
assert.equal(r.contact_raw, "415 180 5030");

// email only, no phone
r = buildLeadRow({ name: "A", email: "a@b.com" });
assert.equal(r.phone, null);
assert.equal(r.email, "a@b.com");
assert.equal(r.config.whatsapp_is_same, false);

// legacy single contact field still works (back-compat)
assert.equal(buildLeadRow({ name: "A", contact: "a@b.com" }).email, "a@b.com");
assert.equal(buildLeadRow({ name: "A", contact: "4151805030" }).phone, "524151805030");

// config merge preserves caller keys
assert.deepEqual(buildLeadRow({ name: "A", phone: "4151805030", whatsapp: true, config: { siteVisitRequested: true } }).config,
  { siteVisitRequested: true, whatsapp_is_same: true });

// name + no contact → reject; honeypot → spam
assert.throws(() => buildLeadRow({ name: "A" }), /missing_contact/);
assert.throws(() => buildLeadRow({ name: "", email: "a@b.com" }), /missing_contact/);
assert.throws(() => buildLeadRow({ hp: "bot", name: "A", email: "a@b.com" }), /spam/);

console.log("lead.test.mjs OK");
