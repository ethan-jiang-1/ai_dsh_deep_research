#!/usr/bin/env node
// checks/smoke/cli-exit.e2e.mjs — 入口退出码契约的真进程证据（BUG-213 / BUG-217 / BUG-218）。
//
// 为什么住 smoke 道：真边界 = 子进程 exit code，而默认回归（tests/）禁子进程（layering ①/②，
// 「真入口的检查写 checks/ 的 smoke/probe」）。本件只跑 usage/前置失败形态——不连网、不碰凭据、
// 不写仓；唯一的「真失败」用例连 127.0.0.1:1，期望 ECONNREFUSED 后 exit 1。
//
// 覆盖矩阵（0=绿 / 1=断言红 / 2=未跑）：
//   run-dashboard 无参            → 2（usage）
//   run-kickoff 缺 --token        → 2（前置缺席）
//   run-kickoff 连接失败          → 1（真失败，与「未跑」可分）
//   run-lane 无匹配条目            → 2，且消息含 --all / --list（修正入口）
//   run-lane 全 SKIP（无 DSH_HOME）→ 2（未跑 ≠ 通过）
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const failures = []

const run = (label, args, { env = process.env, expect, check } = {}) => {
  const result = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', env, timeout: 30000 })
  const out = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  if (result.status !== expect) failures.push(`${label}: exit ${String(result.status)} ≠ ${expect}\n${out}`)
  if (check !== undefined) {
    const problem = check(out)
    if (problem !== null) failures.push(`${label}: ${problem}\n${out}`)
  }
}

run('run-dashboard 无参（usage）', ['probes/analyze/run-dashboard.mjs'],
  { expect: 2, check: (out) => (/用法/.test(out) ? null : '缺用法提示') })
run('run-kickoff 缺 --token（前置缺席）', ['tools/channel/run-kickoff.mjs'],
  { expect: 2, check: (out) => (/--token/.test(out) ? null : '缺 --token 提示') })
run('run-kickoff 连接失败（真失败）', ['tools/channel/run-kickoff.mjs', '--port', '1', '--token', 'x'],
  { expect: 1 })
// 邻接不回退（BUG-213 修复判据）：同族的 usage/前置出口必须保持 2。
for (const [label, file] of [
  ['run-driver 无参', 'tools/channel/run-driver.mjs'],
  ['run-accept 无参', 'checks/run-gates/run-accept.mjs'],
  ['scene-capture 无参', 'probes/analyze/scene-capture.mjs'],
  ['session-replay 无参', 'probes/analyze/session-replay.mjs'],
]) run(`${label}（usage 邻接）`, [file], { expect: 2 })
run('run-lane 无匹配（未跑）', ['checks/test/run-lane.mjs', 'entry', '--only', 'cold-start'],
  { expect: 2, check: (out) => (out.includes('--all') && out.includes('--list') ? null : '无匹配消息缺 --all 修正入口') })

const noHome = { ...process.env }
delete noHome.DSH_HOME
run('run-lane 全 SKIP（未跑 ≠ 通过）', ['checks/test/run-lane.mjs', 'entry', '--all', '--only', 'cold-start'],
  { env: noHome, expect: 2, check: (out) => (/PASS 0 \/ FAIL 0 \/ SKIP 1/.test(out) ? null : '汇总行与退出码不同源（期望 PASS 0 / FAIL 0 / SKIP 1）') })

if (failures.length > 0) {
  console.error(`cli-exit: ${failures.length} 条失败\n\n${failures.join('\n\n')}`)
  process.exit(1)
}
console.log('cli-exit: 入口退出码契约全绿（usage/前置=2，真失败=1，全 SKIP=2，消息带修正入口）')
