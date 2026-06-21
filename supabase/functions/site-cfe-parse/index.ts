// site-cfe-parse — Supabase Edge Function (Deno). PUBLIC, stateless CFE-bill reader.
//
// POST { mime, dataB64 } -> sends the bill to the Anthropic Messages API with a FORCED
// tool-call ("read_cfe_usage") so the model returns structured JSON -> computes daily
// usage (kWh per day) and returns { kwhPerDay, kwhTotal, periodDays, tariff }.
//
// Public counterpart to the CRM's extract-cfe-bill: no auth, no Storage, no DB. The
// website calculator calls this directly with a base64 upload. Fails safe — any error
// returns { fallback: "manual" } so the site drops the user to manual kWh entry and the
// flow never blocks. Inert by design: if ANTHROPIC_API_KEY is unset it returns fallback.
import { corsFor } from "./cors.mjs";
import { kwhPerDayFrom } from "./usage.mjs";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://fireflyenergy.mx,https://www.fireflyenergy.mx")
  .split(",").map((s) => s.trim()).filter(Boolean);

const MODEL = Deno.env.get("CFE_BILL_MODEL") || "claude-sonnet-4-6";
const MAX_B64_BYTES = 12 * 1024 * 1024; // ~8 MB file -> ~10.7 MB base64; 12 MB headroom

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json", ...cors },
  });
}

const READ_CFE_USAGE_TOOL = {
  name: "read_cfe_usage",
  description: "Read the consumption figures from this CFE (Comisión Federal de Electricidad) electricity bill / recibo.",
  input_schema: {
    type: "object",
    properties: {
      tariff: { type: "string", description: "Tarifa code exactly as printed, e.g. 01, 1C, DAC, PDBT, GDMTH" },
      bill_class: { type: "string", enum: ["residential", "commercial"], description: "residential for 01/1A-1F/DAC; commercial for PDBT/GDMTH/GDMTO/etc." },
      billing_days: { type: "number", description: "Días of the billing period (~60 for residential bimonthly, ~30 for commercial monthly)" },
      current_period_kwh: { type: "number", description: "kWh consumed THIS billing period (total for the whole period, not per day)" },
      address_line: { type: "string", description: "Street + number of the service address (calle y número), from the Domicilio block" },
      address2: { type: "string", description: "Secondary line (interior, depto, building) if present; else omit" },
      colonia: { type: "string", description: "Colonia / neighborhood from the Domicilio block" },
      city: { type: "string", description: "City / municipio from the Domicilio block" },
      state: { type: "string", description: "State / entidad federativa (e.g. Guanajuato)" },
      postal_code: { type: "string", description: "Código postal (CP)" },
    },
    required: ["current_period_kwh"],
  },
} as const;

function mediaBlock(mime: string, b64: string) {
  if (mime === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } };
  }
  const m = ["image/png", "image/webp", "image/gif", "image/jpeg"].includes(mime) ? mime : "image/jpeg";
  return { type: "image", source: { type: "base64", media_type: m, data: b64 } };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsFor(req.headers.get("origin"), ALLOWED_ORIGINS);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ fallback: "manual" }, 405, cors);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ fallback: "manual" }, 200, cors); // not configured → manual entry

  let mime: string, dataB64: string;
  try {
    const body = await req.json();
    mime = String(body?.mime ?? "");
    dataB64 = String(body?.dataB64 ?? "");
  } catch {
    return json({ fallback: "manual" }, 400, cors);
  }
  if (!dataB64 || dataB64.length > MAX_B64_BYTES) return json({ fallback: "manual" }, 400, cors);

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        tools: [READ_CFE_USAGE_TOOL],
        tool_choice: { type: "tool", name: "read_cfe_usage" },
        messages: [{
          role: "user",
          content: [
            mediaBlock(mime, dataB64),
            { type: "text", text: "Read this CFE electricity bill into the read_cfe_usage tool. current_period_kwh is the kWh for the WHOLE current billing period (residential bills are bimonthly ~60 days). Copy the tarifa exactly and set bill_class from it (residential: 01/1A-1F/DAC; commercial: PDBT/GDMTH/GDMTO/etc.). Read billing_days from the period if printed. Also read the service address (Domicilio block) into address_line (street + number), address2 (interior/depto, else omit), colonia, city (municipio), state (entidad federativa), and postal_code (CP). Omit any field that is not printed." },
          ],
        }],
      }),
    });
    if (!resp.ok) return json({ fallback: "manual" }, 200, cors);
    const payload = await resp.json();
    const toolUse = (payload?.content ?? []).find(
      (b: { type: string; name?: string }) => b.type === "tool_use" && b.name === "read_cfe_usage",
    );
    const out = kwhPerDayFrom(toolUse?.input);
    if (!out) return json({ fallback: "manual" }, 200, cors);
    return json(out, 200, cors);
  } catch {
    return json({ fallback: "manual" }, 200, cors);
  }
});
