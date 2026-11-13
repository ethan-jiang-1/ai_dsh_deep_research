// defaults-store.spec.mjs — 项目默认 client store 的状态机（keyless）。
//
// 保障面（issue A1/A2/A5/A6/A7 的 UI 数据路径）：刷新读两文件、无文件 = auto、按钮/面板
// 共用快照、写只经 host command（set/unset/clear 的 payload 与 revision）、stale/io/invalid
// 回执、两 session 隔离、方法库默认/冲突。组件渲染归 client-load.entry；这里只测状态机。
//
// 红证：把 setPatch 的 expectedRevision 去掉、unset 不送 revision、或 refresh 不按 session
// 分桶 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultsStore } from '../../packages/deep-research-pack/src/client/defaults/store.ts'

const DEFAULTS = 'research-defaults.json'

function harness(initial = {}) {
  const state = {
    files: {},
    entries: {},
    libraries: {},
    commands: [],
    execute: null,
    ...initial,
  }
  const deps = {
    readText: async (sid) => state.files[sid] ?? null,
    listDir: async (sid) => state.entries[sid] === undefined ? [] : state.entries[sid],
    readLibrary: async (sid) => state.libraries[sid] ?? { kind: 'absent' },
    execute: async (sid, line) => {
      state.commands.push({ sid, line })
      if (state.execute !== null) return state.execute(sid, line)
      return { ok: true, value: { result: { kind: 'success', text: 'ok revision=1' } } }
    },
  }
  const store = createDefaultsStore(deps)
  return { store, state }
}

const flush = async () => { await new Promise((resolve) => setTimeout(resolve, 0)) }

test('无文件 = auto：refresh 零 command；快照 ready / 空值 / 方法缺席', async () => {
  const { store, state } = harness()
  await store.refresh('s1')
  const snapshot = store.getSnapshot('s1')
  assert.equal(snapshot.phase, 'ready')
  assert.equal(snapshot.value.effort, undefined)
  assert.equal(snapshot.problems.length, 0)
  assert.equal(snapshot.methodRead, 'absent')
  assert.equal(snapshot.methodDefault, null)
  assert.equal(state.commands.length, 0)
})

test('文件在场：值/revision/方法默认/冲突进快照；两 session 不串', async () => {
  const library = '## 格局调研（2026-11-12，源自 对话）〔默认偏好〕\n- 找来源: a\n'
  const conflict = '## 一〔默认偏好〕\n- 找来源: a\n\n## 二〔默认偏好〕\n- 找来源: b\n'
  const { store, state } = harness({
    files: {
      s1: JSON.stringify({ schema: 1, revision: 3, effort: 'deep', output: { audience: '决策层' } }),
      s2: JSON.stringify({ schema: 1, revision: 1, effort: 'standard' }),
    },
    entries: {
      s1: [{ type: 'file', name: DEFAULTS }],
      s2: [{ type: 'file', name: DEFAULTS }],
    },
    libraries: {
      s1: { kind: 'ok', text: library },
      s2: { kind: 'ok', text: conflict },
    },
  })
  await store.refresh('s1')
  await store.refresh('s2')
  const one = store.getSnapshot('s1')
  const two = store.getSnapshot('s2')
  assert.equal(one.value.effort, 'deep')
  assert.equal(one.value.output?.audience, '决策层')
  assert.equal(one.revision, 3)
  assert.equal(one.methodDefault, '格局调研')
  assert.equal(one.methodConflict, false)
  assert.equal(two.value.effort, 'standard')
  assert.equal(two.revision, 1)
  assert.equal(two.methodDefault, '一')
  assert.equal(two.methodConflict, true)
  assert.equal(state.commands.length, 0)
})

test('setPatch：带 expectedRevision 的 set；成功后 refresh 读回新值', async () => {
  const { store, state } = harness()
  await store.refresh('s1')
  state.execute = async () => {
    state.files.s1 = JSON.stringify({ schema: 1, revision: 1, effort: 'deep' })
    state.entries.s1 = [{ type: 'file', name: DEFAULTS }]
    return { ok: true, value: { result: { kind: 'success', text: 'ok revision=1 effort=deep' } } }
  }
  await store.setPatch('s1', { effort: 'deep' })
  assert.equal(state.commands.length, 1)
  const line = state.commands[0].line
  assert.match(line, /^\/research-defaults set /)
  const payload = JSON.parse(line.slice('/research-defaults set '.length))
  assert.deepEqual(payload, { expectedRevision: 0, patch: { effort: 'deep' } })
  await flush()
  const snapshot = store.getSnapshot('s1')
  assert.equal(snapshot.value.effort, 'deep')
  assert.equal(snapshot.revision, 1)
  assert.equal(snapshot.outcome?.kind, 'ok')
  assert.equal(snapshot.pending, false)
})

test('stale：错误码保留 + refresh 读当前 revision；不重试、不覆盖文件', async () => {
  const { store, state } = harness({
    files: { s1: JSON.stringify({ schema: 1, revision: 1, effort: 'deep' }) },
    entries: { s1: [{ type: 'file', name: DEFAULTS }] },
  })
  await store.refresh('s1')
  state.execute = async () => {
    state.files.s1 = JSON.stringify({ schema: 1, revision: 5, effort: 'deep' })
    return { ok: true, value: { result: { kind: 'error', text: 'error stale revision=5' } } }
  }
  await store.setPatch('s1', { effort: 'standard' })
  const snapshot = store.getSnapshot('s1')
  assert.equal(snapshot.outcome?.kind, 'error')
  assert.equal(snapshot.outcome?.code, 'stale')
  assert.equal(snapshot.outcome?.revision, 5)
  assert.equal(snapshot.value.revision, 5)
  assert.equal(snapshot.value.effort, 'deep')
  assert.equal(state.commands.length, 1)
})

test('unset / clear：送 revision；错误 command 只置回执，不抛', async () => {
  const { store, state } = harness({
    files: { s1: JSON.stringify({ schema: 1, revision: 2, effort: 'deep' }) },
    entries: { s1: [{ type: 'file', name: DEFAULTS }] },
  })
  await store.refresh('s1')
  state.execute = async () => ({ ok: true, value: { result: { kind: 'success', text: 'ok revision=3' } } })
  await store.unset('s1', ['effort'])
  await store.clear('s1')
  assert.equal(state.commands[0].line, '/research-defaults unset effort revision=2')
  assert.equal(state.commands[1].line, '/research-defaults clear revision=2')

  state.execute = async () => ({ ok: false, error: { code: 'gateway/down' } })
  await store.clear('s1')
  const snapshot = store.getSnapshot('s1')
  assert.equal(snapshot.outcome?.kind, 'error')
  assert.equal(snapshot.outcome?.code, 'io')
  assert.equal(snapshot.pending, false)
})

test('invalid patch：本地拒绝，不发 command；invalid 文件进 problems、按钮 invalid', async () => {
  const { store, state } = harness()
  await store.refresh('s1')
  await store.setPatch('s1', { effort: 'bogus' })
  assert.equal(state.commands.length, 0)
  assert.equal(store.getSnapshot('s1').outcome?.code, 'invalid')

  const bad = harness({
    files: { s1: '{"schema":1,"effort":"bogus"}' },
    entries: { s1: [{ type: 'file', name: DEFAULTS }] },
  })
  await bad.store.refresh('s1')
  const snapshot = bad.store.getSnapshot('s1')
  assert.ok(snapshot.problems.length > 0)
  assert.equal(snapshot.phase, 'ready')
})

test('文件在但读不回 → phase unreadable；不把故障当空态', async () => {
  const { store } = harness({
    files: {},
    entries: { s1: [{ type: 'file', name: DEFAULTS }] },
  })
  await store.refresh('s1')
  const snapshot = store.getSnapshot('s1')
  assert.equal(snapshot.phase, 'unreadable')
  assert.ok(snapshot.problems.some((item) => item.code === 'io'))
})

test('loading 期间 set/unset/clear 不发 command（防首帧误写）', async () => {
  const { store, state } = harness({
    files: { s1: JSON.stringify({ schema: 1, revision: 1, effort: 'deep' }) },
    entries: { s1: [{ type: 'file', name: DEFAULTS }] },
  })
  assert.equal(store.getSnapshot('s1').phase, 'loading')
  await store.setPatch('s1', { effort: 'standard' })
  await store.unset('s1', ['effort'])
  await store.clear('s1')
  assert.equal(state.commands.length, 0)
})

// 负例留证 2026-11-12：BUG-092——双 null 被当 auto；BUG-107——pending 期间第二次写被静默丢。
// 还原法：exists/unreadable 不区分 channelDown；runWrite 恢复 `if (pending) return`。
test('BUG-092 工作区不可达（listDir + readText 双 null）→ unreadable，不是 auto', async () => {
  const { store } = harness({ files: { s1: null }, entries: { s1: null } })
  await store.refresh('s1')
  const snapshot = store.getSnapshot('s1')
  assert.equal(snapshot.phase, 'unreadable')
  assert.ok(snapshot.problems.some((item) => item.code === 'io'))
})

test('BUG-107 pending 期间的第二次写排队执行，不丢改动', async () => {
  const { store, state } = harness()
  await store.refresh('s1')
  let release
  const gate = new Promise((resolve) => { release = resolve })
  state.execute = async () => {
    await gate
    return { ok: true, value: { result: { kind: 'success', text: 'ok revision=1' } } }
  }
  const first = store.setPatch('s1', { effort: 'deep' })
  await flush()
  const second = store.setPatch('s1', { output: { audience: '决策层' } })
  await flush()
  assert.equal(state.commands.length, 1, '第二次写应排队而非并发')
  release()
  await first
  await second
  assert.equal(state.commands.length, 2, '排队后的第二次写必须执行')
})
