import { readFileSync, writeFileSync } from 'fs'
import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const cssPath = require.resolve('@mdi/font/css/materialdesignicons.css')
const css = readFileSync(cssPath, 'utf8')

const map = {}
// Match rules like: .mdi-account::before { content: "\F0004"; }
const re = /\.mdi-([\w-]+)::before\s*\{\s*content:\s*["']\\([0-9a-fA-F]+)["']/g
let m
while ((m = re.exec(css)) !== null) {
  map[`mdi-${m[1]}`] = String.fromCodePoint(parseInt(m[2], 16))
}

const outPath = resolve(__dirname, '../src/helpers/mdi-icons.json')
// Match Prettier's JSON output so `npm run build` never dirties the tree.
writeFileSync(outPath, `${JSON.stringify(map, null, 2)}\n`)
console.log(`[gen-mdi-icons] Wrote ${Object.keys(map).length} icons → src/helpers/mdi-icons.json`)
