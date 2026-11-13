// bundle-sessions：run bundle → 见证会话反查（keyless；临时 sessions 树，纯 fs）。
//
// 为什么要它：诊断入口全部以会话 id/标题起手，而 bundle 从不记录会话 id——"哪场 run 坏了"
// 到"该点哪个会话"这一步此前没有入口（2026-10-27 卫生轮 维度6）。本测试钉住反查的三个语义：
//   ① 只有**绑定**该 bundle 的 lead 会话入选（写过 `drt_<slug>/` 才算——别的 run 的会话、
//      只在用户消息里提过 slug 的会话都不作证）；
//   ② present 条数按会话聚合（交付见证优先排前）；
//   ③ 无关 bundle 的会话不串场。
// 负例留证 2026-10-27：把 sessionsOfBundle 的 slug 透传改成写死 ''（空 slug 早退）→ 第 ① 例红；
// 还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sessionsOfBundle, sessionsOfBundleCached } from '../../scripts/lib/bundle-sessions.mjs'

const HEADER = '{"type":"session","delegationDepth":0,"agentPreset":"lead"}'
const writeCall = (path) => `{"type":"tool/call","data":{"name":"write","callId":"w1","arguments":${JSON.stringify(JSON.stringify({ path }))}}}`
const presented = (path, callId = 'p1') => `{"type":"deliverables/presented","data":{"callId":${JSON.stringify(callId)},"files":[{"path":${JSON.stringify(path)}}]}}`

function sessionDir(root, group, id) {
  const dir = join(root, group, id)
  mkdirSync(dir, { recursive: true })
  return dir
}

function withSessions(fn) {
  const root = mkdtempSync(join(tmpdir(), 'bundle-sessions-'))
  try {
    // a：绑定 demo 且交付（present 一条）
    const a = sessionDir(root, 'grp', 'session-a')
    writeFileSync(join(a, 'log.jsonl'), [HEADER, writeCall('drt_demo/question.md'), presented('drt_demo/final/v1.md')].join('\n') + '\n')
    // b：绑定 demo 但只是写过（无 present）
    const b = sessionDir(root, 'grp', 'session-b')
    writeFileSync(join(b, 'log.jsonl'), [HEADER, writeCall('drt_demo/evidence/e1.md')].join('\n') + '\n')
    // c：绑定的是别的 bundle（不得串场）
    const c = sessionDir(root, 'grp', 'session-c')
    writeFileSync(join(c, 'log.jsonl'), [HEADER, writeCall('drt_other/question.md'), presented('drt_other/final/v1.md')].join('\n') + '\n')
    // d：非 lead（子 agent）会话——即使写了也不算见证
    const d = sessionDir(root, 'grp', 'session-d')
    writeFileSync(join(d, 'log.jsonl'), ['{"type":"session","delegationDepth":1,"agentPreset":"scout"}', writeCall('drt_demo/question.md'), presented('drt_demo/final/v1.md')].join('\n') + '\n')
    return fn(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('反查：只收绑定该 bundle 的 lead 会话，present 条数按会话聚合', () => {
  withSessions((root) => {
    const out = sessionsOfBundle(root, 'drt_demo')
    assert.deepEqual(out.sessions.map((s) => s.sessionId), ['session-a', 'session-b'], '只认 lead + 绑定 demo 的会话')
    assert.equal(out.sessions[0].presented, 1, 'session-a 的 present 计数')
    assert.equal(out.sessions[1].presented, 0, '只写过 = 提及，不是交付见证')
    assert.ok(out.logs >= 4, '扫描计数应覆盖全部 jsonl（含不绑定者）')
  })
})

test('反查：裸 slug 与 drt_ 前缀等价', () => {
  withSessions((root) => {
    assert.deepEqual(sessionsOfBundle(root, 'demo').sessions, sessionsOfBundle(root, 'drt_demo').sessions)
  })
})

test('反查：零绑定会话是空集（不是全量兜底）', () => {
  withSessions((root) => {
    const out = sessionsOfBundle(root, 'drt_missing')
    assert.deepEqual(out.sessions, [], '不存在的 slug 不得返回任何会话')
    assert.equal(out.slug, 'missing')
  })
})

// 缓存面（2026-10-28 Phase B）：反查要能在排障时反复跑——判据不变，只是跳过未变日志的解压。
test('缓存：第二次调用命中缓存，结果与直扫一致；日志变化后失效重扫', () => {
  withSessions((root) => {
    const cachePath = join(root, '..', `bs-cache-${process.pid}.json`)
    const readLog = (p) => readFileSync(p, 'utf8')
    const first = sessionsOfBundleCached(root, 'drt_demo', { readLog, cachePath })
    assert.deepEqual(first.sessions, sessionsOfBundle(root, 'drt_demo').sessions, '缓存路径与直扫必须同结果')
    assert.ok(first.cacheMisses >= 4, `首次应全量解析（实际 ${first.cacheMisses}）`)
    const second = sessionsOfBundleCached(root, 'drt_demo', { readLog, cachePath })
    assert.equal(second.cacheMisses, 0, '第二次不应再解压任何日志')
    assert.ok(second.cacheHits >= 4, '第二次应全部命中')
    assert.deepEqual(second.sessions, first.sessions)
    // 追加一行到某个日志 → 该文件失效，其余仍命中
    const target = join(root, 'grp', 'session-b', 'log.jsonl')
    appendFileSync(target, `{"type":"deliverables/presented","data":{"callId":"p2","files":[{"path":"drt_demo/final/v2.md"}]}}\n`)
    const third = sessionsOfBundleCached(root, 'drt_demo', { readLog, cachePath })
    assert.equal(third.cacheMisses, 1, '只有被改动的日志重扫')
    assert.equal(third.sessions.find((x) => x.sessionId === 'session-b')?.presented, 1, '新 present 计入 session-b')
  })
})

// 缓存的坏形态（2026-10-28 覆盖补测）：缓存是"加速件"，任何坏状态都不许让反查失败——
// 坏 JSON / 版本不符一律按空缓存处理；`useCache:false` 既不读也不写。
test('缓存坏形态：坏 JSON 与版本不符都退回全量扫描，不抛', () => {
  withSessions((root) => {
    const cachePath = join(root, '..', `bs-cache-bad-${process.pid}.json`)
    const readLog = (p) => readFileSync(p, 'utf8')
    writeFileSync(cachePath, '{not json')
    const first = sessionsOfBundleCached(root, 'drt_demo', { readLog, cachePath })
    assert.deepEqual(first.sessions.map((x) => x.sessionId), ['session-a', 'session-b'], '坏缓存不影响结果')
    assert.ok(first.cacheMisses >= 4, '坏缓存 → 全量重扫')
    // 版本不符同样整体失效
    writeFileSync(cachePath, JSON.stringify({ version: 999, logs: { '/nope': { mtimeMs: 1, size: 1, facts: null } } }))
    const second = sessionsOfBundleCached(root, 'drt_demo', { readLog, cachePath })
    assert.ok(second.cacheMisses >= 4, '版本不符 → 全量重扫')
    assert.deepEqual(second.sessions.map((x) => x.sessionId), ['session-a', 'session-b'])
  })
})

test('缓存关掉：useCache=false 不读不写缓存文件', () => {
  withSessions((root) => {
    const cachePath = join(root, '..', `bs-cache-off-${process.pid}.json`)
    const readLog = (p) => readFileSync(p, 'utf8')
    const out = sessionsOfBundleCached(root, 'drt_demo', { readLog, cachePath, useCache: false })
    assert.equal(out.cacheHits, 0)
    assert.ok(out.cacheMisses >= 4)
    assert.equal(existsSync(cachePath), false, 'useCache=false 不应落盘')
  })
})
