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

// validBillFilePath — only the CRM's own minted key shape is forwarded.
{
  const { validBillFilePath } = await import("./lead.mjs");
  const good = "site-lead/2f1c9a4e-1b2d-4c3f-8a9b-0123456789ab.pdf";
  assert.equal(validBillFilePath(good), good);
  assert.equal(validBillFilePath(good.replace(".pdf", ".jpg")), good.replace(".pdf", ".jpg"));
  // wrong prefix (another bucket path), traversal, wrong ext, non-uuid, non-string
  assert.equal(validBillFilePath("cfe-bills/someone-elses.pdf"), undefined);
  assert.equal(validBillFilePath("site-lead/../cfe-bills/x.pdf"), undefined);
  assert.equal(validBillFilePath("site-lead/2f1c9a4e-1b2d-4c3f-8a9b-0123456789ab.exe"), undefined);
  assert.equal(validBillFilePath("site-lead/not-a-uuid.pdf"), undefined);
  assert.equal(validBillFilePath(undefined), undefined);
  assert.equal(validBillFilePath({ toString: () => good }), undefined);
}

// ---- buildCfeBills / validBillPagePath ----
import { buildCfeBills, validBillPagePath } from "./lead.mjs";
const U1 = "0b8f3c1e-5a2d-4e7b-9c1a-2f3e4d5c6b7a";
const U2 = "1c9a4d2f-6b3e-4f8c-8d2b-3a4f5e6d7c8b";
assert.equal(validBillPagePath(`site-lead/${U1}/1.pdf`), `site-lead/${U1}/1.pdf`);
assert.equal(validBillPagePath(`site-lead/${U1}/4.webp`), `site-lead/${U1}/4.webp`);
assert.equal(validBillPagePath(`site-lead/${U1}/5.pdf`), undefined);
assert.equal(validBillPagePath(`site-lead/${U1}/0.pdf`), undefined);
assert.equal(validBillPagePath(`site-lead/${U1}/1.gif`), undefined);
assert.equal(validBillPagePath(`site-lead/${U1.toUpperCase()}/1.pdf`), undefined);
assert.equal(validBillPagePath("site-lead/../etc/1.pdf"), undefined);
assert.equal(validBillPagePath(42), undefined);

// two bills => two entries
let bills = buildCfeBills({
  bills: [
    { pagePaths: [`site-lead/${U1}/1.jpg`, `site-lead/${U1}/2.jpg`], kwhPerDay: 12.5, annualKwh: 4500, meterNo: "M1", serviceNo: "S1", tariff: "PDBT", kwhTotal: 750, periodDays: 60 },
    { pagePaths: [`site-lead/${U2}/1.pdf`], kwhPerDay: 30, tariff: "GDBT" },
  ],
});
assert.equal(bills.length, 2);
assert.deepEqual(bills[0].page_paths, [`site-lead/${U1}/1.jpg`, `site-lead/${U1}/2.jpg`]);
assert.equal(bills[0].file_path, `site-lead/${U1}/1.jpg`);
assert.equal(bills[0].avg_daily_kwh, 12.5);
assert.equal(bills[0].annual_kwh, 4500);
assert.equal(bills[0].current_period_kwh, 750);
assert.equal(bills[0].billing_days, 60);
assert.equal(bills[0].meter_no, "M1");
assert.equal(bills[0].service_no, "S1");
assert.equal(bills[0].extraction.tariff, "PDBT");
assert.equal(bills[1].tariff, "GDBT");

// forged path in bill 2 => keeps figures, empty page_paths
bills = buildCfeBills({
  bills: [
    { pagePaths: [`site-lead/${U1}/1.jpg`], kwhPerDay: 10 },
    { pagePaths: ["site-lead/../../secret.pdf", `site-lead/${U2}/9.pdf`], kwhPerDay: 20 },
  ],
});
assert.equal(bills.length, 2);
assert.deepEqual(bills[1].page_paths, []);
assert.equal(bills[1].file_path, undefined);
assert.equal(bills[1].avg_daily_kwh, 20);

// 7 bills => 6
bills = buildCfeBills({ bills: Array.from({ length: 7 }, () => ({ pagePaths: [], kwhPerDay: 5 })) });
assert.equal(bills.length, 6);

// legacy single-bill answers => one entry (old and shim path shapes)
bills = buildCfeBills({
  billFilePath: `site-lead/${U1}.pdf`, billKwhPerDay: 9, billKwhTotal: 540, billPeriodDays: 60, billTariff: "PDBT",
  billAddress: { city: "Querétaro", postal_code: "76000" },
});
assert.equal(bills.length, 1);
assert.deepEqual(bills[0].page_paths, [`site-lead/${U1}.pdf`]);
assert.equal(bills[0].avg_daily_kwh, 9);
assert.equal(bills[0].extraction.city, "Querétaro");
assert.equal(buildCfeBills({ billFilePath: `site-lead/${U1}/1.png` })[0].page_paths[0], `site-lead/${U1}/1.png`);

// nothing => undefined
assert.equal(buildCfeBills({}), undefined);
assert.equal(buildCfeBills({ billFilePath: "evil" }), undefined);
