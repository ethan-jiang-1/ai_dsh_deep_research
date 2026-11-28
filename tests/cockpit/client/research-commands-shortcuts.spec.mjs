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
  assert.deepEqual(executed, [['s1', '/research-defaults set {"effort":"deep"}']])

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
  let openedGraph = 0
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
    openGraph: () => { openedGraph += 1 },
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
  assert.equal(openedGraph, 1)

  const node = researchReferenceRule.match('请复核 @drt_alpha/evidence/sec-10k.md 的口径', 0)
  assert.equal(node?.id, 'researchRef')
  assert.equal(node?.data.cardName, 'sec-10k.md')
})
