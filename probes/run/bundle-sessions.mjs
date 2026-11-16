#!/usr/bin/env node
// 维护面：show（只读投影/诊断/取证；不判 PASS/FAIL）。规则 = docs/guides/68-surface-contract.md
// 状态：常驻
// 一句话：bundle → 见证会话反查 + 状态摘要 + 下一步命令
// 何时跑：诊断第一步：bundle 不记会话 id，需要拿会话 id
// 档位：keyless（须先 source；默认只扫 research-workspace 组）
// 判据：不适用（show；exit 1 = 零绑定，不是裁决）
// 不证明：交付合格；零绑定不等于没跑过（可能换了组）
// bundle-sessions.mjs — run bundle → 见证会话清单（诊断入口的第一步）。
//
// 用法：source dev/env.sh && node probes/run/bundle-sessions.mjs <bundle|slug> [--sessions <dir>] [--json] [--no-cache]
// 退出码：0 = 找到见证会话 / 1 = 语料在场但零绑定会话 / 2 = 用法或前置缺席（未跑 ≠ 通过）。
//
// 为什么要它：诊断一律从会话起手（`stream-diagnostics --session <标题|id>`），而 bundle 里
// 不记会话 id——这一步此前只能按 mtime 猜或手写解压脚本（见 lib/bundle-sessions.mjs 头注）。
// 输出 = 会话 id + 组 + present 条数，并给出可直接复制的下一步命令。
import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sessionsOfBundleCached } from '../../scripts/lib/ops/bundle-sessions.mjs'
import { readZstdText } from '../../scripts/lib/shared/zstd-read.mjs'
import { defaultGroupSubstring, workspaceRoot } from '../../scripts/lib/shared/workspace-root.mjs'
import { resolveSessionLog } from '../../scripts/lib/shared/session-log.mjs'
import { runStateOf } from '../../scripts/lib/shared/run-state.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const argv = process.argv.slice(2)
const opt = (name, fallback = undefined) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}
const flag = (name) => argv.includes(name)
const target = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--sessions')

if (target === undefined || flag('--help')) {
  console.error('bundle-sessions: 用法 node probes/run/bundle-sessions.mjs <bundle|drt_<slug>|slug> [--sessions <dir>] [--json]')
  process.exit(2)
}

// 入参三形态：bundle 目录 / drt_<slug> / 裸 slug
const asDir = resolve(target)
const slug = existsSync(asDir) && statSync(asDir).isDirectory() ? basename(asDir) : basename(target.replace(/\/$/, ''))
if (!/^drt_[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug)) {
  console.error(`bundle-sessions: 认不出 bundle 名（期望 drt_<slug>）：${slug}`)
  process.exit(2)
}

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null
const sessionsRoot = resolve(opt('--sessions', home === null ? join(ROOT, 'runtime', 'harness-home', 'sessions') : join(home, 'sessions')))
if (!existsSync(sessionsRoot)) {
  console.error(`bundle-sessions: 会话根不在场：${sessionsRoot}（先 source dev/env.sh 或给 --sessions）`)
  process.exit(2)
}

// 缓存路径：与 run 通道状态根同处（runtime/ 不进 git）。缓存只省解压，判据仍是同一 helper。
const cachePath = resolve(opt('--cache', join(process.env.DSH_RUN_STATE_DIR ?? join(ROOT, 'runtime', 'smoke-workspace'), 'bundle-sessions-cache.json')))
// 扫描面：run 会话的 cwd = research-workspace，会话按 cwd 分组成目录（组名 = 转义后的绝对路径）。
// 默认只扫匹配组（实测全量 2,069 个日志冷启 ~1 分钟；组内 767 个 ≈ 1/3）；`--all` 扫整根。
const group = opt('--group', defaultGroupSubstring() ?? 'research-workspace')
const groupRoots = existsSync(sessionsRoot)
  ? readdirSync(sessionsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.includes(group))
    .map((d) => join(sessionsRoot, d.name))
  : []
const roots = flag('--all') || groupRoots.length === 0 ? undefined : groupRoots
if (!flag('--all') && groupRoots.length === 0) {
  console.error(`bundle-sessions: 没有匹配「${group}」的会话组——改用整根扫描（可用 --group 换过滤词）`)
}
const result = sessionsOfBundleCached(sessionsRoot, slug, {
  roots,
  readLog: (p) => { const r = readZstdText(p); return r.ok ? r.text : '' },
  cachePath,
  useCache: !flag('--no-cache'),
})
if (flag('--json')) {
  console.log(JSON.stringify({ ...result, sessionsRoot }, null, 2))
  process.exit(result.sessions.length === 0 ? 1 : 0)
}

console.log(`bundle-sessions: ${slug}（扫 ${result.logs} 个会话日志，根 = ${sessionsRoot}；缓存命中 ${result.cacheHits} / 解压 ${result.cacheMisses}）`)
if (result.sessions.length === 0) {
  console.error('  零绑定会话——语料在场但没有任何会话写过/读过该 bundle（换了 home？或 bundle 名不对）')
  process.exit(1)
}
for (const s of result.sessions) {
  const tag = s.presented > 0 ? `present×${s.presented}` : '提及'
  console.log(`  ${s.sessionId}  [${s.group ?? '?'}]  ${tag}`)
}
const top = result.sessions[0]
// 状态摘要（runStateOf 的同一谓词，watch-run 消费的那份）：一条命令把"哪场、哪个会话、
// 现在什么态"串起来——诊断不必再手拼 watch-run/stream-diagnostics 两跳。
try {
  const ws = workspaceRoot({ argv: [], env: process.env, defaultRoot: join(ROOT, 'research-workspace') })
  const wsRoot = ws.root ?? ws
  const logPath = resolveSessionLog(join(sessionsRoot, top.group ?? groupRoots[0] ?? '', top.sessionId))
  if (logPath !== null) {
    const st = runStateOf({ logPath, wsRoot })
    console.log('')
    console.log(`状态：events=${st.events} readable=${st.readable} hitlPending=${st.hitlPending} runSettled=${st.runSettled}${st.teammate === true ? ' teammate=true' : ''}`)
  }
} catch (error) {
  console.error(`状态摘要未取证：${error instanceof Error ? error.message : String(error)}（会话反查结果仍有效）`)
}
console.log('')
console.log('下一步（诊断）：')
console.log(`  node probes/run/stream-diagnostics.mjs --session ${top.sessionId}`)
// watch-run 的判据参数是 **session-id**，不是 slug（2026-11-03 实测：传 slug → exit 2）。
console.log(`  node probes/run/watch-run.mjs ${top.sessionId}`)
process.exit(0)
