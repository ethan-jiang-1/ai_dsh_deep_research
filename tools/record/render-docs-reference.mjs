// render-docs-reference.mjs — 生成并校验 docs/reference/*.generated.md 三份参考物。
// 用法：node tools/record/render-docs-reference.mjs [--check]
// --check：重算并与盘上逐字节比对；漂移或 commands.md 失配 exit 1，不写盘。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  commandsDocProblems,
  renderCockpitRegistry,
  renderGatesLedger,
  renderPackageCatalog,
} from '../../checks/lib/repo/docs-reference.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const TARGETS = [
  { rel: 'docs/reference/package-catalog.generated.md', render: renderPackageCatalog },
  { rel: 'docs/reference/cockpit-registry.generated.md', render: renderCockpitRegistry },
  { rel: 'docs/reference/gates-ledger.generated.md', render: renderGatesLedger },
]

const checkOnly = process.argv.includes('--check')
let drifted = false

for (const { rel, render } of TARGETS) {
  const out = join(ROOT, rel)
  const rendered = render(ROOT)
  if (checkOnly) {
    const current = existsSync(out) ? readFileSync(out, 'utf8') : null
    if (current !== rendered) {
      console.error(`docs-reference: 漂移 ${rel}——重跑 pnpm docs:gen`)
      drifted = true
    }
  } else {
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, rendered)
    console.log(`wrote ${rel}`)
  }
}

if (checkOnly) {
  const cmdProblems = commandsDocProblems(ROOT)
  for (const p of cmdProblems) {
    console.error(`docs-reference: ${p}`)
    drifted = true
  }
  if (drifted) process.exit(1)
  console.log('docs-reference: up to date')
}
