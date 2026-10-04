// Prints the exact words the bg-review server sends (from the Staffing repo's _shared/bg-review.ts), for bgrv_look.py.
const S = process.env.BG_LIB || new URL('../../../Staffing-Coordinator-Hub/supabase/functions/_shared/bg-review.ts', import.meta.url).pathname
const B = await import(S)
const out = { step1: B.step1Words('Ava', 'fcsr', '2026-10-12'), step1oig: B.step1Words('Oli', 'oig', '2026-10-12'),
  final: { decision: B.finalWords('Ava', 'fcsr', 'decision', true), waiver: B.finalWords('Ava', 'fcsr', 'waiver', false), edl: B.finalWords('Eve', 'edl', 'edl', false), oig: B.finalWords('Oli', 'oig', 'oig', false) } }
console.log(JSON.stringify(out))
