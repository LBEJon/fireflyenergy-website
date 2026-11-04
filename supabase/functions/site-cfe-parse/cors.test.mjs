// node cors.test.mjs
import assert from "node:assert/strict";
import { corsFor } from "./cors.mjs";

const ALLOWED = ["https://fireflyenergy.mx", "https://www.fireflyenergy.mx"];
const ok = (o) => corsFor(o, ALLOWED)["Access-Control-Allow-Origin"] === o;

// production + legacy Pages previews
assert.ok(ok("https://fireflyenergy.mx"));
assert.ok(ok("https://www.fireflyenergy.mx"));
assert.ok(ok("https://abc123.pages.dev"));
// this site's Worker previews (alias + version URLs) and the worker itself
assert.ok(ok("https://redesign-fireflyenergy-website.jondenne.workers.dev"));
assert.ok(ok("https://47768c97-fireflyenergy-website.jondenne.workers.dev"));
assert.ok(ok("https://fireflyenergy-website.jondenne.workers.dev"));
// look-alikes and strangers stay blocked
assert.ok(!ok("https://redesign-fireflyenergy-website.jondenne.workers.dev.evil.com"));
assert.ok(!ok("https://other-app.jondenne.workers.dev"));
assert.ok(!ok("https://fireflyenergy-website.someoneelse.workers.dev"));
assert.ok(!ok("http://redesign-fireflyenergy-website.jondenne.workers.dev"));
assert.ok(!ok("https://evil.com"));
assert.ok(!ok(null));
assert.equal(corsFor("https://evil.com", ALLOWED)["Access-Control-Allow-Origin"], "null");
console.log("cors ok");
