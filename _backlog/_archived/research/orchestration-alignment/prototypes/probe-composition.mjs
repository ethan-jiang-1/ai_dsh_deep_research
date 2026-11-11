#!/usr/bin/env node
// probe-composition.mjs — Phase 2 keyless 组合原型探针（只住 _backlog）。
// 做什么：把 dev/research.overlay.yml + worker.overlay.yml 合成一份临时 overlay，boot 真 web，
//   用 session/create 证明 research-worker / research-wave 能挂上，用 skills/list 证明角色
//   skill 目录能进 worker 的技能目录；不调用模型，不证明行为面。
// 用法：source dev/env.sh && node _backlog/research/orchestration-alignment/prototypes/probe-composition.mjs
// 产物：_backlog/research/orchestration-alignment/evidence/composition-scan.json
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { bootWeb, authenticate, makeRpc } from '../../../../scripts/lib/web-harness.mjs'
import { reclaimPort } from '../../../../scripts/lib/port-reclaim.mjs'

const ROOT = resolve(import.meta.dirname, '../../../..')
const HOME = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null
if (!HOME) { console.error('probe-composition: 需要 DSH_HOME（先 source dev/env.sh）'); process.exit(2) }
const BIN = join(ROOT, 'vendor/dsh/apps/cli/src/bin.ts')
if (!existsSync(BIN)) { console.error(`probe-composition: vendor CLI 不在位 ${BIN}`); process.exit(2) }

const PROTOS = join(ROOT, '_backlog/research/orchestration-alignment/prototypes')
const EVIDENCE = join(ROOT, '_backlog/research/orchestration-alignment/evidence')
const WORKSPACE = join(PROTOS, 'workspace')
mkdirSync(WORKSPACE, { recursive: true })
const combined = join(PROTOS, 'combined.overlay.yml')
const base = readFileSync(join(ROOT, 'dev/research.overlay.yml'), 'utf8')
const extra = readFileSync(join(PROTOS, 'worker.overlay.yml'), 'utf8')
writeFileSync(combined, `${base}\n${extra}`)

const PORT = 3105
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rpc = makeRpc({
  prefix: 'orch-',
  timeoutMs: 20_000,
  errorOf: (endpoint, body) => `${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 300)}`,
})

const skillChars = {}
for (const [role, file] of [
  ['analyst', 'presets/analyst/skills/evidence-extraction/SKILL.md'],
  ['analyst', 'presets/analyst/skills/wave-execution/SKILL.md'],
  ['critic', 'presets/critic/skills/adversarial-review/SKILL.md'],
  ['critic', 'presets/critic/skills/claim-verdict/SKILL.md'],
  ['scout', 'presets/scout/skills/lead-mapping/SKILL.md'],
]) {
  skillChars[file] = readFileSync(join(ROOT, 'packages/deep-research-pack', file), 'utf8').length
}

const result = { port: PORT, combinedOverlay: combined, presetRows: [], sessions: [], skillChars, checks: [] }
const { child, token } = await bootWeb({
  bin: BIN, cwd: ROOT, profile: 'web', patchPath: combined, port: PORT,
  env: { ...process.env, DSH_HOME: HOME }, timeoutMs: 120_000, tailChars: 800, detached: true,
})
try {
  const url = `http://127.0.0.1:${PORT}`
  const cookie = await authenticate(url, token)
  const roster = await rpc(url, cookie, 'agentPresets/list', {})
  result.presetRows = (roster.presets ?? []).map((p) => ({ id: p.id, name: p.name, broken: p.broken ?? null }))
  for (const id of ['research-worker', 'research-wave']) {
    const row = result.presetRows.find((p) => p.id === id)
    result.checks.push({ check: `roster 含 ${id}`, ok: row !== undefined && row.broken === null, detail: row ?? null })
  }
  for (const preset of ['research-worker', 'research-wave', 'critic']) {
    try {
      const created = await rpc(url, cookie, 'session/create', { request: { cwd: WORKSPACE, agentPreset: preset } })
      const id = created?.id ?? created?.sessionId
      const skills = await rpc(url, cookie, 'skills/list', { request: { sessionId: id } })
      const names = (skills.skills ?? []).map((s) => s.name).sort()
      result.sessions.push({ preset, id, agentPreset: created?.agentPreset, skills: names })
      result.checks.push({ check: `session/create ${preset}`, ok: created?.agentPreset === preset && typeof id === 'string', detail: created?.agentPreset })
      if (preset === 'research-worker' || preset === 'research-wave') {
        result.checks.push({ check: `${preset} 看见 evidence-extraction`, ok: names.includes('evidence-extraction') })
        result.checks.push({ check: `${preset} 看见 adversarial-review`, ok: names.includes('adversarial-review') })
        result.checks.push({ check: `${preset} 看不见 lead 的 team-assembly`, ok: !names.includes('team-assembly') })
      }
    } catch (error) {
      result.sessions.push({ preset, error: error.message })
      result.checks.push({ check: `session/create ${preset}`, ok: false, detail: error.message })
    }
  }
} finally {
  try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
  await sleep(300)
  try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
  const leak = await reclaimPort(PORT)
  result.checks.push({ check: '端口回收', ok: leak === null, detail: leak })
}
writeFileSync(join(EVIDENCE, 'composition-scan.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
process.exit(result.checks.every((c) => c.ok) ? 0 : 1)
