// runs the real step1-sign preview() for a request body on stdin (offline; no database)
import fs from 'fs'; import path from 'path'
const FN = process.argv[2]
globalThis.Deno = { env: { get: () => '' }, serve: () => {} }
const src = fs.readFileSync(path.join(FN, 'step1-sign/index.ts'), 'utf8').replace(/^import \{ createClient \} from .*$/m, 'const createClient = () => null')
const tmp = path.join(FN, 'step1-sign', '_prev.ts'); fs.writeFileSync(tmp, src)
let M; try { M = await import(tmp) } finally { fs.unlinkSync(tmp) }
const body = JSON.parse(fs.readFileSync(0, 'utf8') || '{}')
process.stdout.write(JSON.stringify(await M.preview(body)))
