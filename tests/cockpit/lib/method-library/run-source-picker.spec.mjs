// 负例留证 2026-11-12：BUG-100（同名目录被当 final 版本文件）
// run source picker：清单读失败 ≠ 无 final；回执/版本只认 file（BUG-099/109/100 消费面）。
// 负例留证 2026-11-12：BUG-099——`finalFiles ?? []` 把 null 当空；BUG-109——delivered.json 只查 name。
// 还原法 = 删除 null 分支 / 回执判定去掉 type==='file'。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { loadRtl, makeTranslator } from '../../client-dom-helpers.mjs'
import { zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { useRunSourcePicker } from '../../../../packages/deep-research-pack/src/client/method-library/useRunSourcePicker.ts'
import { latestFinalVersion } from '../../../../packages/deep-research-pack/src/lib/method-library/method-library-source.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

test('BUG-100/109 latestFinalVersion：同名目录不算版本文件', () => {
  assert.equal(latestFinalVersion([{ name: 'v2.md', type: 'directory' }, { name: 'v1.md', type: 'file' }]), 'v1.md')
  assert.equal(latestFinalVersion([{ name: 'v2.md', type: 'file' }]), 'v2.md')
})

test('BUG-099/109 接线：清单 null 走读取失败；回执/验收只认普通文件', () => {
  const source = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/method-library/useRunSourcePicker.ts'), 'utf8')
  assert.match(source, /finalFiles === null \|\| runFiles === null/, '清单 null 必须走读取失败')
  assert.match(source, /file\.type === 'file' && file\.name === 'delivered\.json'/, 'delivered.json 必须校验 file')
  assert.match(source, /file\.type === 'file' && file\.name === 'acceptance\.md'/, 'acceptance.md 必须校验 file')
})

// 负例留证 2026-11-23：BUG-398——reset 只 abort 不清 controller ref：旧读取 resolve 后
// `sourceReadControllerRef.current !== controller` 守卫放行，把 idle/清空态覆写成 cancelled。
// 红配方：resetRunPicker 只 abort 不置 null（或删掉 catch 里的代际守卫）→ 本例红。
test('BUG-398 reset 后在途读取结算不得回写状态：loadRunNames 与 selectRunSource 都保持复位态', async () => {
  const rtl = await loadRtl()
  let picker = null
  const resolvers = []
  function Harness() {
    picker = useRunSourcePicker({
      sessionId: 's1',
      t: makeTranslator(zh),
      listDir: () => new Promise((resolve) => resolvers.push(resolve)),
      readPreview: async () => ({ kind: 'absent' }),
      readLibrary: async () => ({ kind: 'absent', path: '' }),
    })
    return null
  }
  rtl.render(createElement(Harness))
  try {
    rtl.act(() => { picker.loadRunNames() })
    rtl.act(() => { picker.reset() })
    await rtl.act(async () => {
      for (const resolve of resolvers.splice(0)) resolve([])
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    assert.equal(picker.runState, 'idle', 'reset 后在途列表读取不得覆写为 cancelled')
    assert.deepEqual(picker.runNames, [])

    rtl.act(() => { picker.selectRunSource('drt_a') })
    rtl.act(() => { picker.reset() })
    await rtl.act(async () => {
      for (const resolve of resolvers.splice(0)) resolve([])
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    assert.equal(picker.selectedRunSource, null, 'reset 后在途预览读取不得回写 cancelled 候选')
    assert.equal(picker.selectedRunLoading, false)
  } finally {
    rtl.cleanup()
  }
})

// 负例留证 2026-11-23：BUG-398——reject 分支同样不得越代回写；正常路径仍须落 ready（负控）。
test('BUG-398 负控：未 reset 时列表读取正常落 ready；reject 只落 error 一次', async () => {
  const rtl = await loadRtl()
  let picker = null
  let calls = 0
  let rejectSecond = null
  function Harness() {
    picker = useRunSourcePicker({
      sessionId: 's1',
      t: makeTranslator(zh),
      // 第一次立即空列表（落 ready）；第二次挂起，由用例显式 reject（落 error）。
      listDir: () => {
        calls += 1
        if (calls <= 2) return Promise.resolve([])
        return new Promise((_resolve, reject) => { rejectSecond = reject })
      },
      readPreview: async () => ({ kind: 'absent' }),
      readLibrary: async () => ({ kind: 'absent', path: '' }),
    })
    return null
  }
  rtl.render(createElement(Harness))
  try {
    rtl.act(() => { picker.loadRunNames() })
    await rtl.act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)) })
    assert.equal(picker.runState, 'ready')
    rtl.act(() => { picker.loadRunNames() })
    await rtl.act(async () => {
      rejectSecond?.(new Error('boom'))
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    assert.equal(picker.runState, 'error')
  } finally {
    rtl.cleanup()
  }
})
