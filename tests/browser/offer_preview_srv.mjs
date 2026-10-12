// runs the real offer-sign handler for one request body on stdin (offline; the preview needs no database)
import fs from 'fs'; import path from 'path'
const FN = process.argv[2]
let handler = null; globalThis.Deno = { env: { get: () => '' }, serve: (h) => { handler = h } }
const src = fs.readFileSync(path.join(FN, 'offer-sign/index.ts'), 'utf8').replace(/^import \{ createClient \} from .*$/m, 'const createClient = () => ({ from: () => { throw new Error("no database in the preview") } })')
const tmp = path.join(FN, 'offer-sign', '_prev.ts'); fs.writeFileSync(tmp, src)
try { await import(tmp) } finally { fs.unlinkSync(tmp) }
const r = await handler(new Request('http://x', { method: 'POST', body: fs.readFileSync(0, 'utf8') || '{}' }))
process.stdout.write(await r.text())
