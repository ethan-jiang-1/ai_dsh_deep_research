#!/usr/bin/env node
// record-role-fixture.mjs — 角色组装面 fixture 录制工具（dev 工具态，非检查——命名语法不覆盖）。
// 为 snapshot-replay-smoke 的多场景化录制 per-role canned 会话：boot research 档（真模型档，
// 需 DEEPSEEK_API_KEY）→ 以 <role> preset 建会话 → 发角色探针 prompt（含哨兵指令）→ 等回合
// 落定（哨兵出现在 **assistant 文本** + 日志静默）→ 解压会话日志写 fixture（人审后入库；
// 场景声明由人登记）。哨兵只认 assistant 文本：prompt 原文自带「探针完成」字样，全文 grep
// 会把死回合（上游流畸形耗尽重试、无任何 assistant 文本）误收成合格录制品——2026-10-13
// 实录 6 连 MALFORMED_RESPONSE 的死回合被旧判据误收，折算层（缺 assistant 文本）才咬住。
// 录一次，之后 keyless 永久回放（B 层组装请求 diff 钉 persona 全文 + 工具 schema）。
// ⚠ 副作用自知：每次录制在 dev home 会话组留一段一次性探针会话（事件数只有真实 run 的
// 零头）——量大后会污染 client-load-smoke 的绑定窗（实红教训），按标题前缀
// 「用一两句话说明你作为」定期清理即可。
// 2026-10-18 实红复现与清理补充：生成式标题**会多次更新**，按"首个 title 事件"匹配会漏（我第一轮
// 清理就漏了）；清理脚本要按**全部** `"title":"…"` 事件任一命中来判，另把「渐进面探针会话」「探针会话…」
// 与本轮探针问句派生的标题一并纳入（本次共移出 60+ 场，移出=保留现场可逆，不删除）。
// 用法：source dev/env.sh && node --import tsx/esm dev/record-role-fixture.mjs --role scout [--port 3105]
// BUG-019 修复：MCP server 经 npx 冷启动连接可能晚于首回合请求组装（时序骰子，实录 6 录
// 4 赢 2 输；宿主 stdout/logs 均无就绪信号可等）——写盘前验 MCP 组谓词，缺组即废弃本录并
// 有界重试，连续落败 fail-loud；mirror 无 mcp 行（MCP_PLAYWRIGHT=0 形态）时谓词不适用。
// 等待/重试替代时序运气（scripts/AGENTS「等待显式状态」——此处显式状态 = 产出件谓词）。
import { spawn, execSync } from 'node:child_process'
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { scrubbedEnv, withModelKey } from '../scripts/lib/env.mjs'
import { sentinelInAssistantText } from '../scripts/lib/replay-request.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const argOf = (name, fallback = null) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1] }
const ROLE = argOf('role')
const PORT = Number(argOf('port', '3105'))
const SENTINEL = '探针完成'
const BOOT_TIMEOUT_MS = 120_000
const TURN_TIMEOUT_MS = 240_000
// BUG-019：MCP 组谓词（marker = mcp-resources 插件的 resource 工具名——请求工具表含它
// ⟺ MCP server 已在首请求前连接完毕）与有界重试上限。
const MCP_MARKER = 'list_mcp_resources'
const MAX_ATTEMPTS = 3

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

// mirror 是否声明 mcp 行：决定 MCP 组谓词是否适用（MCP_PLAYWRIGHT=0 形态无此行，
// 竞态与 MCP 组都不存在，谓词跳过——fail-loud 不误伤该形态）。
const mirrorPatch = join(DSH_HOME, 'profiles', 'research', 'cordis.patch.yml')
const expectMcp = existsSync(mirrorPatch) && /mcp|playwright/i.test(readFileSync(mirrorPatch, 'utf8'))

// ── boot + 录一次：返回会话日志全文；spawn/cleanup 每次尝试独立（含 fail 路径——
//    process.exit 跳过 finally，故 fatal 一律 throw，由顶层统一打印并退出）。──
const VENDOR = join(ROOT, 'vendor', 'dsh')
const bin = join(VENDOR, 'apps', 'cli', 'src', 'bin.ts')

const recordOnce = async () => {
  // LLM 流 socket 隔离预载（用户指令 2026-10-13：一次性连接不复用——postmortem 2026-10-13）
  const iso = join(ROOT, 'dev', 'llm-socket-isolation.cjs')
  const child = spawn(process.execPath, ['--import', 'tsx/esm', bin, '--profile', 'research', '--', '--port', String(PORT), '--no-open'], { cwd: VENDOR, env: withModelKey(scrubbedEnv({ DSH_HOME, PATH: process.env.PATH, NODE_OPTIONS: `--require ${iso}` })), stdio: ['ignore', 'pipe', 'pipe'], detached: true })
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
    // 哨兵只认 assistant 文本 + 等日志静默（死回合防误收，2026-10-13）。判据正本 =
    // lib/replay-request（BUG-030 起与 snapshot-replay-smoke A 层同源，不再各持一份）。
    let logText = null
    let lastSize = -1
    let quietRounds = 0
    const deadline = Date.now() + TURN_TIMEOUT_MS
    while (Date.now() < deadline) {
      await sleep(4_000)
      logText = readLog(logOf(sessionId))
      if (logText === null) { if (childGone) break; continue }
      const hasSentinel = sentinelInAssistantText(logText, SENTINEL)
      const size = statSync(logOf(sessionId)).size
      quietRounds = size === lastSize ? quietRounds + 1 : 0
      lastSize = size
      if (hasSentinel && quietRounds >= 3) break
      if (childGone) break
    }
    if (logText === null || !sentinelInAssistantText(logText, SENTINEL)) {
      const err = new Error(`回合未在 ${TURN_TIMEOUT_MS / 1000}s 内落定（哨兵「${SENTINEL}」未出现在任何 assistant 文本里——死回合/上游失败窗口不收）——真模型回合未走通`)
      err.fatal = true
      throw err
    }
    return logText
  } finally {
    cleanup()
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── MCP 组谓词 + 有界重试（BUG-019）：工具表缺 MCP 组 = 竞态输家，回放 B 层必假红——
//    废弃不写盘，重试；连续落败 fail-loud（带处置入口）。 ──
let logText = null
try {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) console.log(`  第 ${attempt}/${MAX_ATTEMPTS} 次尝试（上次工具表缺 MCP 组——BUG-019 竞态，已废弃不写盘）…`)
    logText = await recordOnce()
    if (!expectMcp || logText.includes(MCP_MARKER)) break
    console.log(`  工具表缺 MCP 组（首请求组装早于 MCP server 连接）——废弃本次录制品，不写盘`)
    logText = null
  }
} catch (e) {
  console.error(`record-role-fixture: ${e.message ?? e}`)
  process.exit(e.fatal ? 2 : 1)
}
if (logText === null) {
  fail(`连续 ${MAX_ATTEMPTS} 次录制工具表均缺 MCP 组（BUG-019 竞态）——检查 mirror 的 mcp 行与 npx 可达性；若修复已入库则此路径为回归（卡 = _backlog/bugs/BUG-019-recorder-mcp-race.md，已修则在其 fixed_bugs 归档）`)
}
console.log(`  回合落定（${expectMcp ? 'MCP 组在场 + ' : ''}哨兵在场 + 日志静默）——写 fixture…`)
mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'session.v4.jsonl'), logText)
// 场景身份住 snapshots/replay/research-face/snapshot.json（replay smoke 的实际驱动输入）。
// 录制器不代写它：manifest 是正本，新角色/重录后由人把录制身份（codeAnchor/vendor/recordedAt）
// 填进对应 case——smoke 会因 case 集 ≠ 盘上 presets/ 而 fail-loud，漏登记不会静默通过。
const rel = ROLE === 'lead' ? 'session.v4.jsonl' : `${ROLE}/session.v4.jsonl`
console.log(`  已写 ${OUT_DIR}/session.v4.jsonl——请在 snapshots/replay/research-face/snapshot.json 登记 case「${ROLE}」（fixture: ${rel} + 录制身份），人审后入库（git add）。`)
if (ROLE === 'lead') console.log('  C 金标准刷新 = snapshot-replay-smoke --update-expected + 人审。')
