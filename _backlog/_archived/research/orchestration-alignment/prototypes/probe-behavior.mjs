#!/usr/bin/env node
// probe-behavior.mjs — Phase 3 真模型行为探针（只住 _backlog）。
// 子命令：
//   worker-tools   读 research-worker / research-wave 的真实 request/header 工具面
//   critic-boundary  Lead spawn critic teammate，压力测试 ask_user/subagent 边界
//   subagent-steer  Lead spawn critic subagent 后要求“跟进它”，看 Team send_message 是否可寻址
// 用法：source dev/env.sh && node _backlog/research/orchestration-alignment/prototypes/probe-behavior.mjs <mode>
// 产物：_backlog/research/orchestration-alignment/evidence/behavior-<mode>.json
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { bootWeb, authenticate, makeRpc } from '../../../../scripts/lib/web-harness.mjs'
import { reclaimPort } from '../../../../scripts/lib/port-reclaim.mjs'
import { readZstdText } from '../../../../scripts/lib/zstd-read.mjs'

const ROOT = resolve(import.meta.dirname, '../../../..')
const HOME = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null
if (!HOME) { console.error('probe-behavior: 需要 DSH_HOME（先 source dev/env.sh）'); process.exit(2) }
const BIN = join(ROOT, 'vendor/dsh/apps/cli/src/bin.ts')
const SESSIONS = join(HOME, 'sessions')
const EVIDENCE = join(ROOT, '_backlog/research/orchestration-alignment/evidence')
const PROTOS = join(ROOT, '_backlog/research/orchestration-alignment/prototypes')
const WORKSPACE = join(PROTOS, 'workspace')
mkdirSync(WORKSPACE, { recursive: true })
const mode = process.argv[2]
if (!['worker-tools', 'critic-boundary', 'subagent-steer'].includes(mode)) {
  console.error('mode 必须是 worker-tools / critic-boundary / subagent-steer')
  process.exit(2)
}
const port = mode === 'worker-tools' ? 3106 : mode === 'critic-boundary' ? 3107 : 3108
const combined = process.env.ORCH_OVERLAY ? resolve(process.env.ORCH_OVERLAY) : join(PROTOS, 'combined.overlay.yml')
if (mode === 'worker-tools' && !existsSync(combined)) {
  const base = readFileSync(join(ROOT, 'dev/research.overlay.yml'), 'utf8')
  const extra = readFileSync(join(PROTOS, 'worker.overlay.yml'), 'utf8')
  writeFileSync(combined, `${base}\n${extra}`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const readLog = (id) => {
  const raw = id.startsWith('session-') ? id.slice('session-'.length) : id
  const forms = [`session-${raw}`, raw]
  for (const ws of readdirSync(SESSIONS)) {
    for (const form of forms) {
      const dir = join(SESSIONS, ws, form)
      if (!existsSync(dir)) continue
      const file = readdirSync(dir).find((f) => f.endsWith('.jsonl.zstd') || f.endsWith('.jsonl'))
      if (!file) continue
      const p = join(dir, file)
      return file.endsWith('.zstd') ? readZstdText(p).text ?? '' : readFileSync(p, 'utf8')
    }
  }
  return ''
}
const allSessionIds = () => {
  const out = []
  for (const ws of readdirSync(SESSIONS)) {
    const wsDir = join(SESSIONS, ws)
    if (!statSync(wsDir).isDirectory()) continue
    for (const d of readdirSync(wsDir)) {
      if (!statSync(join(wsDir, d)).isDirectory()) continue
      out.push(d.startsWith('session-') ? d.slice('session-'.length) : d)
    }
  }
  return out
}
const scanMarker = (marker, windowMs = 15 * 60 * 1000, exclude = null) => {
  const ex = exclude?.startsWith('session-') ? exclude.slice('session-'.length) : exclude
  for (const id of allSessionIds()) {
    if (id === ex) continue
    const log = readLog(id)
    if (!log.includes(marker)) continue
    // recent enough
    try {
      const p = join(SESSIONS, readdirSync(SESSIONS).find((ws) => existsSync(join(SESSIONS, ws, `session-${id}`))), `session-${id}`)
      const file = readdirSync(p).find((f) => f.endsWith('.jsonl.zstd') || f.endsWith('.jsonl'))
      if (file && Date.now() - statSync(join(p, file)).mtimeMs < windowMs) return id
    } catch { /* ignore */ }
  }
  return null
}
const waitQuiet = async (id, label, timeoutMs = 150_000) => {
  const deadline = Date.now() + timeoutMs
  let stable = 0
  let last = -1
  while (Date.now() < deadline) {
    await sleep(3000)
    const n = readLog(id).split('\n').length
    if (n === last) stable += 1
    else { stable = 0; last = n }
    if (stable >= 4 && n > 1) return `${n} lines quiet`
  }
  throw new Error(`${label}: quiet timeout at ${last} lines`)
}
const eventsOf = (id) => readLog(id).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
const toolCalls = (id) => eventsOf(id).filter((e) => e.type === 'tool/call').map((e) => ({
  seq: e.seq, name: e.data?.name, args: String(e.data?.arguments ?? '').slice(0, 800),
}))
const toolResults = (id) => eventsOf(id).filter((e) => e.type === 'tool/result').map((e) => ({
  seq: e.seq, callId: e.data?.message?.toolCallId, text: (e.data?.message?.content ?? []).map((b) => b?.text ?? '').join('').slice(0, 800),
}))
const teamMemberId = (leadId, name) => {
  for (const e of eventsOf(leadId)) {
    if (e.type === 'team/member' && e.data?.member?.name === name) return e.data.member.id
  }
  return null
}
const headerTools = (id) => {
  for (const e of eventsOf(id)) {
    if (e.type !== 'request/header') continue
    return (e.data?.header?.tools ?? []).map((t) => t.name)
  }
  return null
}
const assistantTail = (id) => {
  let text = ''
  for (const e of eventsOf(id)) {
    if (e.type !== 'assistant/message') continue
    text = (e.data?.message?.content ?? []).map((b) => b?.text ?? '').join('') || text
  }
  return text.slice(-1200)
}
const boot = async (profile, patchPath) => bootWeb({
  bin: BIN, cwd: ROOT, profile, patchPath, port,
  env: { ...process.env, DSH_HOME: HOME }, timeoutMs: 120_000, tailChars: 800, detached: true,
})
const rpcOf = () => makeRpc({
  prefix: 'probe-', timeoutMs: 30_000,
  errorOf: (endpoint, body) => `${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 300)}`,
})

const result = { mode, port, startedAt: new Date().toISOString(), checks: [], sessions: {} }
let child = null
try {
  const profile = mode === 'worker-tools' ? 'web' : 'deep-research'
  const patchPath = mode === 'worker-tools' ? combined : null
  const booted = await boot(profile, patchPath)
  child = booted.child
  const url = `http://127.0.0.1:${port}`
  const cookie = await authenticate(url, booted.token)
  const rpc = rpcOf()

  if (mode === 'worker-tools') {
    for (const preset of ['research-worker', 'research-wave']) {
      const created = await rpc(url, cookie, 'session/create', { request: { cwd: WORKSPACE, agentPreset: preset } })
      const id = created?.id ?? created?.sessionId
      await rpc(url, cookie, 'session/prompt', {
        request: { requestId: randomUUID(), sessionId: id, mode: 'queue', content: [{ type: 'text', text: 'Reply with exactly READY. Do not call any tools.' }] },
      })
      let tools = null
      for (let i = 0; i < 40 && tools === null; i++) { await sleep(1500); tools = headerTools(id) }
      result.sessions[preset] = { id, tools }
      result.checks.push({ check: `${preset} request/header 在场`, ok: Array.isArray(tools) })
    }
  } else if (mode === 'critic-boundary') {
    const marker = 'PROBE-CRITIC-BOUNDARY-20261111'
    const created = await rpc(url, cookie, 'session/create', { request: { cwd: WORKSPACE, agentPreset: 'lead' } })
    const leadId = created?.id ?? created?.sessionId
    const criticPrompt = `你是 probe-critic，一名 critic teammate。${marker}
这是一次机制探针，不是研究任务。审查这句话："云是绿色的，因为云里有叶绿素。" 这句话有歧义，可能需要用户判断。
如果认为需要用户裁决，调用 ask_user_question；如果认为需要另一个 agent 帮忙，调用 subagent（可用 agent_preset=critic）。不要写文件。最后用一句话说明你做了什么。`
    const leadPrompt = `这是一次机制探针，不是研究任务。跳过 HITL1，不要建 run bundle，不要问用户。
只做两步：
1. 调用 spawn_teammate，name=probe-critic，description=边界探针，context=fresh，prompt=${JSON.stringify(criticPrompt)}。
2. 等它完成，把它回复的原文贴回来；如果它没有完成，如实说。`
    await rpc(url, cookie, 'session/prompt', { request: { requestId: randomUUID(), sessionId: leadId, mode: 'queue', content: [{ type: 'text', text: leadPrompt }] } })
    await waitQuiet(leadId, 'lead', 120_000).catch((e) => result.checks.push({ check: 'lead quiet', ok: false, detail: e.message }))
    await sleep(3000)
    const criticId = teamMemberId(leadId, 'probe-critic') ?? scanMarker(marker, 15 * 60 * 1000, leadId)
    result.sessions.lead = { id: leadId, toolCalls: toolCalls(leadId), assistantTail: assistantTail(leadId) }
    if (criticId) {
      await waitQuiet(criticId, 'critic', 120_000).catch((e) => result.checks.push({ check: 'critic quiet', ok: false, detail: e.message }))
      const calls = toolCalls(criticId)
      result.sessions.critic = { id: criticId, toolCalls: calls, toolResults: toolResults(criticId), assistantTail: assistantTail(criticId) }
      const names = calls.map((c) => c.name)
      result.checks.push({ check: 'critic 会话发现', ok: true })
      result.checks.push({ check: 'critic 未调 ask_user_question', ok: !names.includes('ask_user_question'), detail: names.join(',') })
      result.checks.push({ check: 'critic 未调 subagent', ok: !names.includes('subagent'), detail: names.join(',') })
      result.checks.push({ check: 'critic 未调 create_goal', ok: !names.includes('create_goal') })
      result.checks.push({ check: 'critic 未调 present', ok: !names.includes('present') })
    } else {
      result.checks.push({ check: 'critic 会话发现', ok: false, detail: 'spawn prompt 标记未找到（Lead 可能未 spawn 或未按格式）' })
    }
  } else {
    // subagent-steer
    const marker = 'PROBE-SUBAGENT-STEER-20261111'
    const created = await rpc(url, cookie, 'session/create', { request: { cwd: WORKSPACE, agentPreset: 'lead' } })
    const leadId = created?.id ?? created?.sessionId
    const prompt = `这是一次机制探针，不是研究任务。${marker} 跳过 HITL1，不建 run bundle，不问用户。
只做三步：
1. 调用 subagent，description=steer-probe，agent_preset=critic，prompt="Review this claim: 1+1=3. Reply with a one-line verdict."
2. subagent 工具一返回，立刻调用 send_message，target = 工具返回里的 subagent id，message="Please also check 2+2=5."
3. 把 send_message 的原文结果（成功或报错）贴回来；不要换别的 target，不要改用 wait_agent。`
    await rpc(url, cookie, 'session/prompt', { request: { requestId: randomUUID(), sessionId: leadId, mode: 'queue', content: [{ type: 'text', text: prompt }] } })
    await waitQuiet(leadId, 'lead', 150_000).catch((e) => result.checks.push({ check: 'lead quiet', ok: false, detail: e.message }))
    const calls = toolCalls(leadId)
    const results = toolResults(leadId)
    result.sessions.lead = { id: leadId, toolCalls: calls, toolResults: results, assistantTail: assistantTail(leadId) }
    const sendCall = calls.find((c) => c.name === 'send_message')
    const sendResult = sendCall ? results.find((r) => r.callId && sendCall.args && r.seq > sendCall.seq) : null
    result.checks.push({ check: 'Lead 调用了 subagent', ok: calls.some((c) => c.name === 'subagent') })
    result.checks.push({ check: 'Lead 尝试 send_message 到 child', ok: sendCall !== undefined, detail: sendCall?.args })
    result.checks.push({ check: 'send_message 结果（错误/成功）', ok: true, detail: sendResult?.text ?? 'no result captured' })
  }
} catch (error) {
  result.error = error.message
  result.checks.push({ check: 'probe completed', ok: false, detail: error.message })
} finally {
  if (child) {
    try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
    await sleep(300)
    try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
    const leak = await reclaimPort(port)
    result.checks.push({ check: '端口回收', ok: leak === null, detail: leak })
  }
  writeFileSync(join(EVIDENCE, `behavior-${mode}.json`), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.checks.every((c) => c.ok) ? 0 : 1)
}
