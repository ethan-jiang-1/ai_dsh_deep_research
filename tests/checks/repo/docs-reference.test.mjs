// docs-reference.test.mjs — docs/reference 生成物确定性、新鲜度与 commands.md 双向校验（keyless 纯 fs）。
//
// 反证（红先行）：在临时副本中破坏生成物正文或删除 commands.md 一条脚本行 → 判据必红；
// 补齐/重生成 → 绿。真实仓库合同由本测试与 verify 门禁双守。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  cockpitRegistryProblems,
  commandsDocProblems,
  gatesLedgerProblems,
  packageCatalogProblems,
  renderCockpitRegistry,
  renderGatesLedger,
  renderPackageCatalog,
} from '../../../checks/lib/repo/docs-reference.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const ctxSrc = readFileSync(join(ROOT, 'checks', 'verify', 'context.mjs'), 'utf8')
const gatesArray = (ctxSrc.match(/const gates = \[([^\]]+)\]/)?.[1] ?? '')
  .split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean)

test('三份参考生成物连续两次渲染逐字节一致（确定性，无时间戳噪声）', () => {
  assert.equal(renderPackageCatalog(ROOT), renderPackageCatalog(ROOT))
  assert.equal(renderCockpitRegistry(ROOT), renderCockpitRegistry(ROOT))
  assert.equal(renderGatesLedger(ROOT), renderGatesLedger(ROOT))
})

test('真仓合同：三份参考生成物与 commands.md 均与源码/package.json 同步', () => {
  assert.deepEqual(packageCatalogProblems(ROOT), [])
  assert.deepEqual(cockpitRegistryProblems(ROOT), [])
  assert.deepEqual(gatesLedgerProblems(ROOT, gatesArray), [])
  assert.deepEqual(commandsDocProblems(ROOT), [])
})

test('commands.md 双向校验反证：漏脚本 / 多出幽灵脚本均判红', () => {
  const dir = mkdtempSync(join(tmpdir(), 'docs-ref-cmd-'))
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { verify: 'x', test: 'y' } }))
    mkdirSync(join(dir, 'docs', 'reference'), { recursive: true })
    const doc = join(dir, 'docs', 'reference', 'commands.md')
    writeFileSync(doc, '| 命令 | 说明 |\n|---|---|\n| `pnpm verify` | ok |\n| `pnpm test` | ok |\n')
    assert.deepEqual(commandsDocProblems(dir), [])

    writeFileSync(doc, '| 命令 | 说明 |\n|---|---|\n| `pnpm verify` | ok |\n')
    assert.ok(commandsDocProblems(dir).some((p) => p.includes('pnpm test')), '漏脚本必须判红')

    writeFileSync(doc, '| 命令 | 说明 |\n|---|---|\n| `pnpm verify` | ok |\n| `pnpm test` | ok |\n| `pnpm ghost` | bad |\n')
    assert.ok(commandsDocProblems(dir).some((p) => p.includes('pnpm ghost')), '多出幽灵脚本必须判红')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
