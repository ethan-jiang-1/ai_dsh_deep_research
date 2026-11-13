// coach-sessions.spec.mjs — 方法编辑会话默认标题随 locale 迁移（BUG-069）。
//
// 为什么存在：标题只在创建时写一次；中文界面创建的自动标题（方法编辑）在切到英文后仍是
// 中文。修法 = 打开已有会话时，若标题等于已知 `methodEditorTitle` 值（zh/en）则改名为当前
// locale；用户自定义标题不动；新会话直接用当前 locale。本文件钉纯判据 + 装配接线（mock rename）。
// 负例留证 2026-11-12：BUG-069——把 `migrateCoachTitle` 从 `ensureCoachSession` 的 retain 分支
// 删掉 → 「已有中文标题 + en → rename」红；把 `coachTitleMigrationOf` 的已知值判断改成
// `title === currentTitle`（只剩 no-op）→ 同红；新会话分支改用 `translateZh` 固定标题 →
// 「新建 en → Method Editor」红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coachTitleMigrationOf, createCoachSessions, migrateCoachTitles } from '../../packages/deep-research-pack/src/client/coach-sessions.ts'
import { en, zh } from '../../packages/deep-research-pack/src/client/locales.ts'

const tZh = (key) => String(zh[key])
const tEn = (key) => String(en[key])
const CJK = /[\u4e00-\u9fa5]/

/** 最小 sessions/workspaces/remote 桩；`existingTitle` 控制 retain 分支的会话行。 */
function mockCoach({ existingTitle, retainThrows = false } = {}) {
  const renames = []
  const creates = []
  const references = []
  let retainAttempts = 0
  const sessions = {
    create: async (opts) => { creates.push(opts); return 'method-coach-draft-1' },
    retain: (id) => {
      retainAttempts += 1
      // 首次 retain = 会话缺席（create 分支）；create 之后的 retain 必须成功。
      if (retainThrows && retainAttempts === 1) throw new Error('missing session')
      const reference = {
        release() {},
        ready: Promise.resolve(),
        binding: { session: { getSnapshot: () => ({ openState: 'open' }) } },
      }
      references.push({ id, reference })
      return reference
    },
    list: {
      getSnapshot: () => ({
        byId: {
          'session-parent': { cwd: '/workspace' },
          'method-coach-draft-1': { cwd: '/workspace', ...(existingTitle === undefined ? {} : { title: existingTitle }) },
        },
      }),
    },
  }
  const workspaces = { list: { getSnapshot: () => ({ items: [{ workspaceId: 'ws-1', sessionIds: ['session-parent'] }] }) } }
  const ctx = { get: (name) => (name === 'sessions' ? sessions : name === 'workspaces' ? workspaces : undefined) }
  const remote = {
    rename: async (input) => { renames.push(input); return { title: input.title } },
    prompt: async () => ({ ok: true }),
  }
  return { ctx, remote, renames, creates, references }
}

test('BUG-069 标题迁移判据：已知 zh/en 默认标题才迁移，自定义标题不动', () => {
  assert.equal(coachTitleMigrationOf('方法编辑', 'Method Editor'), 'Method Editor', '中文自动标题 → 当前 en')
  assert.equal(coachTitleMigrationOf('Method Editor', '方法编辑'), '方法编辑', '英文自动标题 → 当前 zh')
  assert.equal(coachTitleMigrationOf('  方法编辑  ', 'Method Editor'), 'Method Editor', '迁移前 trim（持久化标题可能带空白）')
  assert.equal(coachTitleMigrationOf('Method Editor', 'Method Editor'), null, '已是当前 locale → 不重复 rename')
  assert.equal(coachTitleMigrationOf('方法编辑', '方法编辑'), null, 'zh 当前 locale + zh 标题 → 不动')
  assert.equal(coachTitleMigrationOf('我的尽调方法', 'Method Editor'), null, '用户自定义标题绝不动')
  assert.equal(coachTitleMigrationOf(undefined, 'Method Editor'), null, '标题尚未投影（无值）→ 不动')
  assert.equal(coachTitleMigrationOf('   ', 'Method Editor'), null, '空标题 → 不动')
})

test('BUG-069 打开已有会话：中文自动标题在 en 下改名为 Method Editor（同一会话，不新建）', async () => {
  const { ctx, remote, renames, creates } = mockCoach({ existingTitle: zh.methodEditorTitle })
  const { ensureCoachSession } = createCoachSessions(ctx, remote, tEn)
  const result = await ensureCoachSession('session-parent', 'draft-1')
  assert.equal(result.id, 'method-coach-draft-1')
  assert.equal(creates.length, 0, '已有会话必须 retain，不得新建')
  assert.deepEqual(renames, [{ sessionId: 'method-coach-draft-1', title: 'Method Editor' }])
  assert.equal(en.methodEditorTitle, 'Method Editor')
})

test('BUG-069 打开已有会话：已是当前 locale / 自定义标题 → 不 rename', async () => {
  for (const existingTitle of [en.methodEditorTitle, 'My own method editor']) {
    const { ctx, remote, renames } = mockCoach({ existingTitle })
    const { ensureCoachSession } = createCoachSessions(ctx, remote, tEn)
    await ensureCoachSession('session-parent', 'draft-1')
    assert.deepEqual(renames, [], `标题 ${JSON.stringify(existingTitle)} 不应触发 rename`)
  }
})

test('BUG-069 新会话：标题直接用当前 locale（zh/en 都验）', async () => {
  for (const [t, expected] of [[tEn, en.methodEditorTitle], [tZh, zh.methodEditorTitle]]) {
    const { ctx, remote, renames, creates } = mockCoach({ retainThrows: true })
    const { ensureCoachSession } = createCoachSessions(ctx, remote, t)
    const result = await ensureCoachSession('session-parent', 'draft-1')
    assert.equal(result.id, 'method-coach-draft-1')
    assert.equal(creates.length, 1)
    assert.equal(creates[0].agentPreset, 'method-editor')
    assert.deepEqual(renames, [{ sessionId: 'method-coach-draft-1', title: expected }])
    if (t === tEn) assert.doesNotMatch(expected, CJK, 'en 新会话标题不得含中文')
  }
})

test('BUG-069 locale 切换：会话列表里的已知默认标题迁到当前 locale，只认 method-coach-*', async () => {
  const renames = []
  const sessions = {
    list: {
      getSnapshot: () => ({
        byId: {
          'method-coach-a': { title: zh.methodEditorTitle },
          'method-coach-b': { title: '我的自定义标题' },
          'method-coach-c': { title: en.methodEditorTitle },
          'method-coach-d': {},
          'other-session': { title: zh.methodEditorTitle },
        },
      }),
    },
  }
  const remote = { rename: async (input) => { renames.push(input); return {} }, prompt: async () => ({ ok: true }) }
  await migrateCoachTitles(sessions, remote, tEn)
  assert.deepEqual(renames, [{ sessionId: 'method-coach-a', title: en.methodEditorTitle }],
    '只迁移 method-coach-* 且标题为已知默认值的行；自定义标题/其它会话/当前 locale 值不动')
})

test('BUG-069 locale 切换：createCoachSessions 暴露的迁移入口读当前 t（装配接线）', async () => {
  const renames = []
  const ctx = {
    get: (name) => (name === 'sessions'
      ? { list: { getSnapshot: () => ({ byId: { 'method-coach-old': { title: zh.methodEditorTitle } } }) } }
      : undefined),
  }
  const remote = { rename: async (input) => { renames.push(input); return {} }, prompt: async () => ({ ok: true }) }
  const { migrateKnownCoachTitles } = createCoachSessions(ctx, remote, tEn)
  await migrateKnownCoachTitles()
  assert.deepEqual(renames, [{ sessionId: 'method-coach-old', title: en.methodEditorTitle }])
})

test('BUG-069 标题迁移失败不阻塞会话（fail-soft）', async () => {
  const { ctx, remote } = mockCoach({ existingTitle: zh.methodEditorTitle })
  remote.rename = async () => { throw new Error('rename transport down') }
  const { ensureCoachSession } = createCoachSessions(ctx, remote, tEn)
  const result = await ensureCoachSession('session-parent', 'draft-1')
  assert.equal(result.id, 'method-coach-draft-1', 'rename 失败仍返回已 retain 的会话')
})
