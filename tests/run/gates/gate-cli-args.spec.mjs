// gate CLI 位置参数解析（BUG-406）：带值选项（`--sessions <dir>`）的值绝不能漏进 positional
// `bundleArg`；缺值必须 clean fail-loud（exit 2），不是未捕获 TypeError。
//
// 为什么住 tests/run/gates：判据对象是 run 门禁的 CLI 壳；纯解析走共享 helper（checks/lib/shared/
// cli-entry），壳的接线用源码断言钉住（tests/ 层禁子进程）。
//
// 负例留证 2026-11-24：BUG-406——node-gate / evidence-audit 用
// `argv.find((a) => !a.startsWith('--') && a !== sessionsRoot)` 找 bundle：`--sessions` 传相对路径时
// （`resolve()` 后与 raw argv 不等）相对值被当成 bundleArg，真 bundle 被忽略——门 R 明明 RED 却
// 以 exit 0 假绿；`--sessions` 缺值时 `resolve(undefined)` 抛 TypeError。
// 红配方：把两壳改回 `argv.find(...)` 解析，或删掉缺值 exit 2。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cliArgsOf } from '../../../checks/lib/shared/cli-entry.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const shellOf = (name) => readFileSync(join(ROOT, 'checks', 'run-gates', name), 'utf8')

test('BUG-406 cliArgsOf：--sessions 的值不吃 positional（相对/绝对都一样）', () => {
  for (const value of ['tmp/sess', '/abs/sess', 'sessions']) {
    const parsed = cliArgsOf(['--sessions', value, 'tmp/drt_red', '--no-write'], { valueFlags: ['--sessions'] })
    assert.equal(parsed.error, null)
    assert.deepEqual(parsed.positionals, ['tmp/drt_red'])
    assert.equal(parsed.values.get('--sessions'), value)
  }
})

test('BUG-406 cliArgsOf：位置参数在选项前也照常分离；纯 flag 不收值', () => {
  const parsed = cliArgsOf(['tmp/drt_red', '--write', '--sessions', 'sess'], { valueFlags: ['--sessions'] })
  assert.deepEqual(parsed.positionals, ['tmp/drt_red'])
  assert.equal(parsed.values.get('--sessions'), 'sess')
})

test('BUG-406 cliArgsOf：--sessions 缺值 / 值被下一个选项顶掉 → 结构化错误（不是 TypeError）', () => {
  const missing = cliArgsOf(['tmp/drt_red', '--sessions'], { valueFlags: ['--sessions'] })
  assert.match(String(missing.error), /--sessions/)
  assert.deepEqual(missing.positionals, [])
  const swallowed = cliArgsOf(['--sessions', '--write', 'tmp/drt_red'], { valueFlags: ['--sessions'] })
  assert.match(String(swallowed.error), /--sessions/)
})

test('BUG-406 接线：node-gate / evidence-audit / verdict-audit 都用共享解析，缺值 exit 2', () => {
  for (const name of ['node-gate.mjs', 'evidence-audit.mjs', 'verdict-audit.mjs']) {
    const src = shellOf(name)
    assert.match(src, /cliArgsOf/, `${name} 未接入共享解析`)
    assert.doesNotMatch(src, /argv\.find\(\(a\) => !a\.startsWith\('--'\)/, `${name} 仍用 argv.find 找 positional`)
    assert.doesNotMatch(src, /resolve\(argv\[sessionsIdx \+ 1\]\)\+?/, `${name} 仍直接 resolve 未校验的 --sessions 值`)
    assert.match(src, /process\.exit\(2\)/, `${name} 缺值必须 exit 2`)
  }
})
