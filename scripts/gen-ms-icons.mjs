import { readFileSync, writeFileSync } from 'fs'
import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// Material Symbols renders by ligature: the icon name IS the glyph content, so
// unlike MDI we only need the names, not a name → codepoint map. The metadata
// package is the names list alone (~100 KB), not the multi-megabyte font.
const metaPath = require.resolve('@material-symbols/metadata/versions.json')
const names = Object.keys(JSON.parse(readFileSync(metaPath, 'utf8'))).sort()

const outPath = resolve(__dirname, '../src/helpers/ms-icons.json')
// Match Prettier's JSON output so `npm run build` never dirties the tree.
writeFileSync(outPath, `${JSON.stringify(names, null, 2)}\n`)
console.log(`[gen-ms-icons] Wrote ${names.length} icons → src/helpers/ms-icons.json`)
