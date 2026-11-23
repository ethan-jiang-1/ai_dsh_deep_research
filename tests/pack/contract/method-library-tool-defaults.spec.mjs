// method-library-tool（host 半）的默认操作回归：`method_library_set_default` 的核对与回执
// 不得用插件名常量冒充方法名（BUG-396）。
//
// 为什么必须直测 tool 的 execute：BUG-396 的症状是「先改盘、再必抛错」——磁盘已经切了默认，
// 工具却回读核对失败。只有把 execute 跑在临时 cwd 上并断言「盘上默认 == 请求名 == 回执名」
// 才能同时抓住三处（核对条件、返回值、默认列表）。
//
// 负例留证 2026-11-23：BUG-396——旧实现两处用模块级 `name`（= 'method-library-tool'）：
//   ① `defaults[0] !== name` 使任何合法 set 都在写盘之后抛「回读未通过」；
//   ② 回执 `name: name` 把方法名报成插件名。
// 红配方：把 execute 里的 `requestedName`/`target` 改回模块级 `name` → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../../../packages/deep-research-pack/src/method-library-tool.ts'
import { foldLibrary } from '../../../packages/deep-research-pack/src/lib/method-library/library-fold.ts'

const LIBRARY = [
  '## 方案比较（2026-11-20，用户）',
  '- 找来源: 官方',
  '- 怎么核实: 双源',
  '- 报告怎么写: 对比表',
  '- 不承诺: 不做排名',
  '',
  '## 事实核查（2026-11-21，用户）',
  '- 找来源: 一手',
  '- 怎么核实: 逐字',
  '- 报告怎么写: 引用',
  '- 不承诺: 不覆盖全域',
  '',
].join('\n')

/** 注册三个工具并取出 defineTool 定义的 apply 结果（不启动真 ctx）。 */
function toolDefs() {
  const defs = new Map()
  const ctx = {
    sessionProjections: { register() {}, stateOf: () => state },
    tools: { register: (def) => { defs.set(def.name, def) } },
  }
  apply(ctx)
  return defs
}

/** 假会话投影状态：claim 与 args 精确匹配才放行（与真实 hasMethodLibraryClaim 同形）。 */
let state = { methodEditor: true, activeTurn: 1, pending: null, claims: [] }
function claimFor({ operationId, action, name, callId }) {
  state = { methodEditor: true, activeTurn: 1, pending: null, claims: [{ operationId, action, name, requestId: 'r1', turn: 1, callId }] }
}

function fakeExec(cwd, callId) {
  return { callId, agent: { session: { header: { agentPreset: 'method-editor', cwd } } } }
}

test('BUG-396 set_default：核对与回执都用请求名，写盘后不误抛；默认列表唯一', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ml-tool-'))
  try {
    writeFileSync(join(dir, 'method-library.md'), LIBRARY, 'utf8')
    const defs = toolDefs()
    const setDefault = defs.get('method_library_set_default')
    assert.ok(setDefault !== undefined, '未注册 method_library_set_default')

    claimFor({ operationId: 'op-1', action: 'set-default', name: '事实核查', callId: 'call-1' })
    const value = await setDefault.execute(
      { action: 'set', operationId: 'op-1', name: '事实核查' },
      fakeExec(dir, 'call-1'),
    )
    assert.deepEqual(value, { operationId: 'op-1', action: 'set', name: '事实核查', changed: true, defaults: ['事实核查'] })
    assert.deepEqual(foldLibrary(readFileSync(join(dir, 'method-library.md'), 'utf8')).filter((e) => e.isDefault).map((e) => e.name), ['事实核查'])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('BUG-396 set_default：clear 回执名称为空、默认清零（负控：放宽不得改变 clear 语义）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ml-tool-'))
  try {
    writeFileSync(join(dir, 'method-library.md'), LIBRARY.replace(
      '- 不承诺: 不做排名',
      '- 不承诺: 不做排名\n\n〔默认标记在标题上〕',
    ), 'utf8')
    writeFileSync(join(dir, 'method-library.md'), LIBRARY.replace('## 事实核查（2026-11-21，用户）', '## 事实核查（2026-11-21，用户）〔默认偏好〕'), 'utf8')
    const defs = toolDefs()
    const setDefault = defs.get('method_library_set_default')
    claimFor({ operationId: 'op-2', action: 'clear-default', name: undefined, callId: 'call-2' })
    const value = await setDefault.execute(
      { action: 'clear', operationId: 'op-2' },
      fakeExec(dir, 'call-2'),
    )
    assert.deepEqual(value, { operationId: 'op-2', action: 'clear', name: '', changed: true, defaults: [] })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('BUG-396 set_default：未声明的目标名不得写盘（claim 名称不匹配即拒）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ml-tool-'))
  try {
    writeFileSync(join(dir, 'method-library.md'), LIBRARY, 'utf8')
    const before = readFileSync(join(dir, 'method-library.md'), 'utf8')
    const defs = toolDefs()
    const setDefault = defs.get('method_library_set_default')
    claimFor({ operationId: 'op-3', action: 'set-default', name: '方案比较', callId: 'call-3' })
    await assert.rejects(
      async () => await setDefault.execute({ action: 'set', operationId: 'op-3', name: '事实核查' }, fakeExec(dir, 'call-3')),
      /匹配到当前 UI 操作/,
    )
    assert.equal(readFileSync(join(dir, 'method-library.md'), 'utf8'), before, '被拒的操作不得改盘')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
