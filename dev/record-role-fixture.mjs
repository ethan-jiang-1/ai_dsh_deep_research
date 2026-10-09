#!/usr/bin/env node
// record-role-fixture.mjs — 角色组装面 fixture 录制工具（dev 工具态，非检查——命名语法不覆盖）。
// 为 snapshot-replay-smoke 的多场景化录制 per-role canned 会话：boot research 档（真模型档，
// 需 DEEPSEEK_API_KEY）→ 以 <role> preset 建会话 → 发角色探针 prompt（含哨兵指令）→ 等回合
// 落定（哨兵出现 + 日志静默）→ 解压会话日志写 fixture（人审后入库；场景声明由人登记）。
// 录一次，之后 keyless 永久回放（B 层组装请求 diff 钉 persona 全文 + 工具 schema）。
// ⚠ 副作用自知：每次录制在 dev home 会话组留一段一次性探针会话（事件数只有真实 run 的
// 零头）——量大后会污染 client-load-smoke 的绑定窗（实红教训），按标题前缀
// 「用一两句话说明你作为」定期清理即可。
// 用法：source dev/env.sh && node --import tsx/esm dev/record-role-fixture.mjs --role scout [--port 3105]
import { spawn, execSync } from 'node:child_process'
import { writeFileSync, existsSync, mkdirSync, readdirSync, mkdtempSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { scrubbedEnv, withModelKey } from '../scripts/lib/env.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const argOf = (name, fallback = null) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1] }
const ROLE = argOf('role')
const PORT = Number(argOf('port', '3105'))
const SENTINEL = '探针完成'
const BOOT_TIMEOUT_MS = 120_000
const TURN_TIMEOUT_MS = 240_000

// 角色探针 prompt：一回合、零工具依赖（组装面钉 persona + 工具 schema 即可，工具路径由
// lead 场景承担）+ 哨兵收尾（A 层逐字命中判据）。lead 探针 = 2026-09-30 首录原文复用
// （BUG-013 重录路径：同探针 → 会话形状同构，C 金标准漂移最小化；lead 场景额外承担
// web_search/web_fetch 工具路径 + C 渲染金标准，故探针带真实检索步）。
const ROLE_PROMPTS = {
  lead: '这是一次**观察面录制探针**（最小步骤，不要写任何文件，不要组队）：\n\n1. 用 web_search 搜一次「DSH harness」（结果不求深究，拿到清单即可）；\n2. 用 web_fetch 抓取结果里第一个官方域名的页面（拿到正文即可）；\n3. 完成后直接给一句话总结（"探针完成，搜了 X、抓了 Y"），不要展开分析。\n\n目的：为观察面渲染回归录制一段含 web_search + web_fetch 的最小会话流。\n',
  scout: '用一两句话说明你作为 Scout 的侦察职责与顺位（何时被指派、产出什么），然后另起一行以「探针完成」收尾。不要调用任何工具。',
  analyst: '用一两句话说明你作为 Analyst 的挖掘职责与证据卡纪律（来源四字段、摘录可回溯），然后另起一行以「探针完成」收尾。不要调用任何工具。',
  critic: '用一两句话说明你作为 Critic 的核查职责与狩猎对象（伪造链接、断链、记账不实），然后另起一行以「探针完成」收尾。不要调用任何工具。',
}

const fail = (msg) => { console.error(`record-role-fixture: ${msg}`); process.exit(2) }
if (!ROLE || !ROLE_PROMPTS[ROLE]) fail(`需要 --role <角色 id>（可录集 = ROLE_PROMPTS 键，含 lead——重录 = 先删旧 session.v4.jsonl，录制品人审后入库）`)
if (!process.env.DSH_HOME) fail('未 source dev/env.sh（DSH_HOME 缺席）——与 L1/L2 同档自拒')
const DSH_HOME = resolve(process.env.DSH_HOME)
if (!existsSync(join(DSH_HOME, '.credentials.yaml'))) fail('dev home 无凭据文件（.credentials.yaml）——先配置 DEEPSEEK_API_KEY')
// 角色 fixture 住场景目录根（lead 的历史落点，ui.expected.md 同目录），其余角色住 <role>/ 子目录
const OUT_DIR = join(ROOT, 'snapshots', 'replay', 'research-face', ...(ROLE === 'lead' ? [] : [ROLE]))
if (existsSync(join(OUT_DIR, 'session.v4.jsonl'))) fail(`${OUT_DIR}/session.v4.jsonl 已在——重录请先删除（录制品人审后入库，不静默覆盖）`)

// ── boot（形状照 snapshot-replay-smoke：vendor 源码 + tsx + research 档，真模型）──
const VENDOR = join(ROOT, 'vendor', 'dsh')
const bin = join(VENDOR, 'apps', 'cli', 'src', 'bin.ts')
const BOOT_START = Date.now()
const child = spawn(process.execPath, ['--import', 'tsx/esm', bin, '--profile', 'research', '--', '--port', String(PORT), '--no-open'], { cwd: VENDOR, env: withModelKey(scrubbedEnv({ DSH_HOME, PATH: process.env.PATH })), stdio: ['ignore', 'pipe', 'pipe'], detached: true })
let output = ''
let childGone = false
child.on('exit', () => { childGone = true })
const banner = new Promise((res, rej) => {
  const onData = (chunk) => {
    output += String(chunk)
    const m = new RegExp(`http://127\\.0\\.0\\.1:${PORT}/\\?token=(\\S+)`).exec(output)
    if (m !== null) res({ token: m[1] })
  }
  child.stdout.on('data', onData)
  child.stderr.on('data', onData)
  child.on('exit', (code) => rej(new Error(`web 进程提前退出（code ${String(code)}）\n${output.slice(-600)}`)))
  setTimeout(() => rej(new Error(`等待启动横幅超时\n${output.slice(-600)}`)), BOOT_TIMEOUT_MS)
})
const cleanup = () => { try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

try {
  const { token } = await banner
  const base = `http://127.0.0.1:${PORT}`
  const response0 = await fetch(`${base}/?token=${token}`, { redirect: 'manual' })
  const cookie = (response0.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
  let rpcId = 0
  const rpc = async (endpoint, args) => {
    const response = await fetch(`${base}/api/${endpoint}`, {
      method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: `rec-${++rpcId}`, method: endpoint, payload: { args } }),
    })
    const body = await response.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`)
    return body.result.value
  }

  const ws = await rpc('workspace/create', { request: { path: join(ROOT, 'research-workspace') } })
  const workspaceId = ws?.workspace?.workspaceId ?? ws?.workspaceId
  const created = await rpc('session/create', { request: { workspaceId, agentPreset: ROLE } })
  const sessionId = created?.id ?? created?.sessionId
  console.log(`  会话已建（preset=${ROLE}，id=${sessionId}）——发探针 prompt…`)
  await rpc('session/prompt', { request: { requestId: randomUUID(), sessionId, mode: 'queue', content: [{ type: 'text', text: ROLE_PROMPTS[ROLE] }] } })

  // ── 等回合落定：本会话日志出现哨兵 + 日志静默（连续 3 次轮询字节数不变——team-preflight
  //    时序教训：标记早现 ≠ 回合完成）──
  const SESSIONS = join(DSH_HOME, 'sessions')
  const group = readdirSync(SESSIONS).find((d) => d.includes('research-workspace'))
  const logOf = (sid) => join(SESSIONS, group, sid, 'session.v4.jsonl.zstd')
  const readLog = (log) => { try { return execSync(`zstd -dc "${log}" 2>/dev/null`, { maxBuffer: 64 * 1024 * 1024 }).toString('utf8') } catch { return null } }
  let logText = null
  let lastSize = -1
  let quietRounds = 0
  const deadline = Date.now() + TURN_TIMEOUT_MS
  while (Date.now() < deadline) {
    await sleep(4_000)
    logText = readLog(logOf(sessionId))
    if (logText === null) { if (childGone) break; continue }
    const hasSentinel = logText.includes(SENTINEL)
    const size = statSync(logOf(sessionId)).size
    quietRounds = size === lastSize ? quietRounds + 1 : 0
    lastSize = size
    if (hasSentinel && quietRounds >= 3) break
    if (childGone) break
  }
  if (logText === null || !logText.includes(SENTINEL)) {
    fail(`回合未在 ${TURN_TIMEOUT_MS / 1000}s 内落定（哨兵「${SENTINEL}」缺席）——真模型回合未走通`)
  }
  console.log(`  回合落定（哨兵在场 + 日志静默）——写 fixture…`)
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, 'session.v4.jsonl'), logText)
  // 场景身份住 snapshots/replay/research-face/snapshot.json（replay smoke 的实际驱动输入）。
  // 录制器不代写它：manifest 是正本，新角色/重录后由人把录制身份（codeAnchor/vendor/recordedAt）
  // 填进对应 case——smoke 会因 case 集 ≠ 盘上 presets/ 而 fail-loud，漏登记不会静默通过。
  const rel = ROLE === 'lead' ? 'session.v4.jsonl' : `${ROLE}/session.v4.jsonl`
  console.log(`  已写 ${OUT_DIR}/session.v4.jsonl——请在 snapshots/replay/research-face/snapshot.json 登记 case「${ROLE}」（fixture: ${rel} + 录制身份），人审后入库（git add）。`)
  if (ROLE === 'lead') console.log('  C 金标准刷新 = snapshot-replay-smoke --update-expected + 人审。')
} finally {
  cleanup()
}
