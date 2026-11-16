// script-file-size.spec.mjs — 维护层入口脚本的尺寸上限（checks/tools/probes；2026-11-03 第 14 轮审计，2026-11-17 扩范围）。
//
// 目的不是追求小文件，而是让“新 god script”必须显式登记；例外是已登记的债务，不是豁免先例。
// 反证：新增一个 >500 行的 checks/ 文件不登记 → 红；把已登记债务缩到 ≤500 行 → 也红（提醒删例外）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ROOTS = ['checks', 'tools', 'probes'].map((r) => join(ROOT, r))
const CAP = 550
const EXCEPTIONS = {
  'checks/smoke/client-load.entry.mjs': 'phase-oriented browser E2E（phase map 在文件头；拆分另立轮，triggers 有重议条件）',
  'checks/lib/harness/gates-cases.mjs': '门禁注入案例表（数据表，不是控制流）',
}

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? walk(path) : (name.endsWith('.mjs') ? [path] : [])
})

test('维护层入口：新文件 ≤550 行；超限必须是登记过的债务', () => {
  const seen = new Set()
  for (const root of ROOTS) for (const path of walk(root)) {
    const rel = relative(ROOT, path).split(sep).join('/')
    const lines = readFileSync(path, 'utf8').split('\n').length
    if (lines > CAP) {
      assert.ok(Object.hasOwn(EXCEPTIONS, rel), `${rel} 有 ${lines} 行（>${CAP}）且未登记例外——先拆或登记理由（checks/tools/probes 同一规则）`)
      seen.add(rel)
    }
  }
  for (const rel of Object.keys(EXCEPTIONS)) {
    assert.ok(seen.has(rel), `${rel} 已不超 ${CAP} 行——删掉过期例外，别让债务清单说谎`)
  }
})
