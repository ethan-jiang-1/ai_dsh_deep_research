// research-commands-shortcuts.spec.mjs — R2.2 Composer `/` 命令、`@` 研究引用与全局快捷键直测回归。
import test from 'node:test'
import assert from 'node:assert/strict'
import { zh } from '../../../packages/deep-research-pack/src/client/locales.ts'
import { makeMaliciousRunSource, makeTranslator } from '../client-dom-helpers.mjs'
import { registerResearchCommands } from '../../../packages/deep-research-pack/src/client/research-commands.ts'
import { registerResearchShortcuts } from '../../../packages/deep-research-pack/src/client/research-shortcuts.ts'
import { registerResearchTriggers, researchReferenceRule } from '../../../packages/deep-research-pack/src/client/research-triggers.tsx'
import { bindingIssue, isWebBindingAllowed, normalizeBinding } from '../../../vendor/dsh/packages/client/shortcuts/src/protocol.ts'

const tZh = makeTranslator(zh)

function makeFakeContext(services) {
  const disposers = []
  return {
    get: (name) => services[name],
    inject: (names, cb) => {
      const scoped = {
        ...services,
        effect: (fn) => {
          const d = fn()
          if (typeof d === 'function') disposers.push(d)
        },
      }
      if (names.every((n) => services[n] !== undefined)) cb(scoped)
    },
    disposeAll: () => { for (const d of disposers) d() },
  }
}

test('registerResearchCommands：注册 /research-defaults 装饰 + /lens /method /hub 命令并执行闭环', async () => {
  const registered = new Map()
  const decorated = new Map()
  const executed = []
  const openedHub = []
  const ctx = makeFakeContext({
    commandUi: {
      register: (c) => { registered.set(c.name, c); return () => { registered.delete(c.name) } },
      decorate: (d) => { decorated.set(d.name, d); return () => { decorated.delete(d.name) } },
    },
  })

  registerResearchCommands(ctx, {
    t: tZh,
    defaultsStore: {
      getSnapshot: () => ({ phase: 'ready', value: { effort: 'standard' }, revision: 2 }),
      refresh: async () => {},
    },
    readLibrary: async () => ({ state: 'ok', entries: [{ name: '我的尽调法', summary: '先查招股书' }] }),
    executeDefaultsCommand: async (sid, line) => { executed.push([sid, line]); return { ok: true } },
    openHubTab: (tab) => { openedHub.push(tab) },
  })

  assert.ok(decorated.has('research-defaults'), '应装饰 Host /research-defaults')
  assert.deepEqual([...registered.keys()].sort(), ['hub', 'lens', 'method'])

  // 验 /research-defaults popupSelect 选项与执行
  const defSpec = decorated.get('research-defaults').ui
  const defOpts = await defSpec.options({ sessionId: 's1' }, new AbortController().signal)
  assert.ok(defOpts.some((o) => o.id === 'depth:standard' && o.active === true))
  await defSpec.onSelect({ id: 'depth:deep', label: '深度档' }, { sessionId: 's1' })
  assert.deepEqual(executed, [['s1', '/research-defaults set {"patch":{"effort":"deep"},"expectedRevision":2}']])

  // 验 /lens 含 8 条内置透镜
  const lensOpts = await registered.get('lens').ui.options({ sessionId: 's1' }, new AbortController().signal)
  assert.equal(lensOpts.length, 8)
  assert.ok(lensOpts.some((o) => o.id === 'adversarial'))

  // 验 /method 含工作区自定义 + 内置打法
  const methodOpts = await registered.get('method').ui.options({ sessionId: 's1' }, new AbortController().signal)
  assert.ok(methodOpts.some((o) => o.id === 'custom:我的尽调法'))
  assert.ok(methodOpts.some((o) => o.id === 'builtin:事实核查'))

  // 验 /hub action
  registered.get('hub').ui.run({ sessionId: 's1' })
  assert.deepEqual(openedHub, ['runs'])

  ctx.disposeAll()
  assert.equal(registered.size, 0)
  assert.equal(decorated.size, 0)
})

test('registerResearchShortcuts：三条快捷键全部通过 DSH 真实协议校验（含 web:macos/windows 白名单）', () => {
  const shortcuts = []
  let active = false
  let statusOpened = 0
  let graphOpened = 0
  let hubOpened = 0
  const ctx = makeFakeContext({
    shortcuts: {
      register: (cmd) => { shortcuts.push(cmd); return () => {} },
    },
  })

  registerResearchShortcuts(ctx, {
    t: tZh,
    openStatus: () => { statusOpened += 1 },
    openGraph: () => { graphOpened += 1 },
    openHub: () => { hubOpened += 1 },
    hasActiveSession: () => active,
  })

  assert.equal(shortcuts.length, 3)
  for (const cmd of shortcuts) {
    for (const [profile, rawBinding] of Object.entries(cmd.defaults)) {
      const [runtime, platform] = profile.split(':')
      const normalized = normalizeBinding(rawBinding, platform)
      assert.equal(bindingIssue(normalized, runtime, platform), null, `${cmd.id} (${profile}) 不得命中保留键`)
      if (runtime === 'web') {
        assert.equal(isWebBindingAllowed(normalized, platform), true, `${cmd.id} (${profile}) 必须通过 Web 白名单`)
      }
    }
  }

  // 无会话时 status/graph 阻塞，hub 仍可开
  assert.equal(shortcuts[0].resolve({}).status, 'blocked')
  assert.equal(shortcuts[1].resolve({}).status, 'blocked')
  const hubRes = shortcuts[2].resolve({})
  assert.equal(hubRes.status, 'handled')
  hubRes.run()
  assert.equal(hubOpened, 1)

  active = true
  shortcuts[0].resolve({}).run()
  shortcuts[1].resolve({}).run()
  assert.equal(statusOpened, 1)
  assert.equal(graphOpened, 1)
})

test('registerResearchTriggers / researchReferenceRule：@ 补全证据卡与计划节点并直达预览', async () => {
  const sources = []
  const openedEv = []
  const openedGraph = []
  const run = makeMaliciousRunSource({
    tree: {
      drt_alpha: {
        evidence: { 'sec-10k.md': '# 10-K\n', '_failed.md': '# failed\n' },
        'plan.md': '| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n| W1 | | active | scan | 收集公开年报 | scout | | leads.md | 3 sources | 5m | std | t1 |\n',
      },
    },
  })
  const ctx = makeFakeContext({
    sessions: {
      list: {
        getSnapshot: () => ({
          projectionsBySession: {
            s1: { values: { researchRun: { schemaVersion: 1, slug: 'alpha', phase: 'running', hitlKind: null, deliveredPath: null, updatedAt: 1 } } },
          },
          byId: {},
        }),
      },
    },
    inputTriggers: {
      registerSource: (src) => { sources.push(src); return () => {} },
    },
  })

  registerResearchTriggers(ctx, {
    t: tZh,
    runSource: () => run.source,
    openEvidence: (sid, dir, card) => { openedEv.push([sid, dir, card]) },
    openGraph: (nodeId) => { openedGraph.push(nodeId) },
  })

  assert.equal(sources.length, 1)
  const src = sources[0]
  const cands = await src.candidates({ sessionId: 's1' }, { query: '', position: 'inline', drilled: false, signal: new AbortController().signal })
  assert.ok(cands.some((c) => c.label === 'sec-10k.md'), '应列出合法证据卡')
  assert.ok(!cands.some((c) => c.label === '_failed.md'), '不得列出 _failed.md')
  assert.ok(cands.some((c) => c.label === 'W1'), '应列出活跃计划节点')

  const evCand = cands.find((c) => c.label === 'sec-10k.md')
  const picked = src.onPick({ candidate: evCand })
  assert.equal(picked.insert.ref, '@drt_alpha/evidence/sec-10k.md')
  assert.equal(src.openReference({ sessionId: 's1' }, { ref: picked.insert.ref, appearance: 'file' }), true)
  assert.deepEqual(openedEv, [['s1', 'drt_alpha', 'sec-10k.md']])

  assert.equal(src.openReference({ sessionId: 's1' }, { ref: '@drt_alpha/W1', appearance: 'file' }), true)
  assert.deepEqual(openedGraph, ['W1'], 'BUG-479：点击计划节点 @ 引用必须向 openGraph 透传 nodeId')

  const node = researchReferenceRule.match('请复核 @drt_alpha/evidence/sec-10k.md 的口径', 0)
  assert.equal(node?.id, 'researchRef')
  assert.equal(node?.data.cardName, 'sec-10k.md')
})

// 负例留证 2026-11-28：BUG-470——冷会话未预热时 phase='loading'，/research-defaults 弹窗全标「自动」；
// 且 Host 返回 kind='error' 时 executeDefaultsCommand 吞错不抛出。
// 红配方：去掉 options() 里的 loading 预热 refresh → 本例红（refreshCalls=0、active 全错）。
test('BUG-470 registerResearchCommands：冷会话打开 /research-defaults 自动 refresh 并正确高亮 active，失败不静默', async () => {
  const decorated = new Map()
  let snap = { phase: 'loading', value: { revision: 0 }, revision: 0 }
  let refreshCalls = 0
  const ctx = makeFakeContext({
    commandUi: {
      register: () => () => {},
      decorate: (d) => { decorated.set(d.name, d); return () => { decorated.delete(d.name) } },
    },
  })

  registerResearchCommands(ctx, {
    t: tZh,
    defaultsStore: {
      getSnapshot: () => snap,
      refresh: async () => {
        refreshCalls += 1
        snap = { phase: 'ready', value: { effort: 'deep', revision: 4 }, revision: 4 }
      },
    },
    readLibrary: async () => ({ state: 'absent' }),
    executeDefaultsCommand: async () => ({ ok: false, error: 'error stale revision=5' }),
    openHubTab: () => {},
  })

  const defSpec = decorated.get('research-defaults').ui
  const opts = await defSpec.options({ sessionId: 's-cold' }, new AbortController().signal)
  assert.equal(refreshCalls, 1, '冷会话首次打开弹窗应先 refresh')
  assert.ok(opts.some((o) => o.id === 'depth:deep' && o.active === true), 'refresh 后应高亮磁盘当前档位')

  await assert.rejects(
    () => defSpec.onSelect({ id: 'depth:quick', label: '快速档' }, { sessionId: 's-cold' }),
    /stale/,
    '命令返回失败时 onSelect 必须显性抛错不静默',
  )
})
