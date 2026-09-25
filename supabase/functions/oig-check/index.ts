// oig-check — server-side OIG LEIE exclusion check.
// The browser cannot fetch the government CSV (no CORS), and the old
// exclusions.oig.hhs.gov/api/search.json endpoint is dead. This function pulls
// the full current LEIE database (UPDATED.csv, ~15MB, refreshed monthly),
// matches on LASTNAME + FIRSTNAME, and returns JSON the hub already understands:
//   { clear:boolean, date:'YYYY-MM-DD', matches:[{firstname,lastname,midname,dob,state,excltype,excldate}] }
// CORS + OPTIONS from day one (browser-called).

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const LEIE_URL = "https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv";

// Cache the raw lines across warm invocations; refresh once per day.
let CACHE: { day: string; lines: string[] } | null = null;

function today(): string { return new Date().toISOString().slice(0, 10); }

async function loadLines(): Promise<string[]> {
  const day = today();
  if (CACHE && CACHE.day === day) return CACHE.lines;
  const res = await fetch(LEIE_URL, { headers: { "User-Agent": "caring-companions-hub/oig-check" } });
  if (!res.ok) throw new Error(`OIG database download failed (${res.status})`);
  const text = await res.text();
  const lines = text.split("\n");
  CACHE = { day, lines };
  return lines;
}

// Parse one RFC-4180-ish CSV row (double-quoted fields, "" escapes a quote).
function parseRow(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else if (ch === "\r") { /* skip */ }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function fmtDate(s: string): string {
  s = (s || "").trim();
  if (!/^\d{8}$/.test(s) || s === "00000000") return "—";
  return s.slice(0, 4) + "-" + s.slice(4, 6) + "-" + s.slice(6, 8);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (o: unknown, status = 200) =>
    new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    let first = "", last = "";
    if (req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      first = b.first ?? b.firstname ?? "";
      last = b.last ?? b.lastname ?? "";
    } else {
      const u = new URL(req.url);
      first = u.searchParams.get("first") ?? u.searchParams.get("firstname") ?? "";
      last = u.searchParams.get("last") ?? u.searchParams.get("lastname") ?? "";
    }
    first = String(first).trim().toUpperCase();
    last = String(last).trim().toUpperCase();
    if (!first || !last) return json({ error: "Both first and last name are required." }, 400);

    const lines = await loadLines();
    // Fast pre-filter: LASTNAME is the first quoted field, so the line starts with "LAST",
    const prefix = '"' + last + '",';
    const matches = lines
      .filter((ln) => ln.slice(0, prefix.length).toUpperCase() === prefix)
      .map(parseRow)
      .filter((f) => (f[1] || "").trim().toUpperCase() === first)
      .map((f) => ({
        lastname: f[0] || "",
        firstname: f[1] || "",
        midname: f[2] || "",
        dob: fmtDate(f[8] || ""),
        state: f[11] || "",
        excltype: f[13] || "",
        excldate: fmtDate(f[14] || ""),
      }));

    return json({ clear: matches.length === 0, date: today(), matches, source: "LEIE UPDATED.csv" });
  } catch (e) {
    return json({ error: (e && (e as Error).message) || String(e) }, 502);
  }
});
