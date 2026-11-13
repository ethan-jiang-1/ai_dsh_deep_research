// client-load-seed.support.mjs — client-load 冒烟的**种子夹具 materialize**（smoke 层支援件，keyless）。
// 为什么不是 scripts/lib：本件只服务 client-load.entry 的 `--seed`，且无 keyless 直测面（文件系统
// materialize）；scripts/lib 的模块受 tests/contracts/test-surface 对账（每个模块要有直测或 SMOKE_ONLY
// 登记），把它放 smoke 支援件（与 client-load-reference.support/config/final 同层）不需要改测试台账。
//
// 为什么需要（issue 2026-11-03-client-load-smoke-not-in-ci）：client-load 只在本机 dev home 手工跑，
// 因为整套真浏览器断言（当前 69 条；backlog 的「61 条」是旧计数——本轮基线实跑 69）依赖两个
// 本机事实——`research-workspace` 组的绑定会话 + 已交付 bundle + 一条未绑定负样本。
// 本件把这两件事从 `tests/fixtures/client-load-home/` 的明文夹具复制到 `runtime/smoke-workspace/`
// （gitignored），让冒烟在干净机器/CI 用 `--seed` 自建 home。
//
// 三条实测边界（2026-11-03 seed spike，重踩代价高——都写进错误信息）：
//   ① **组目录名 = vendor `projectKey(seed 工作区绝对路径)`**：会话日志头 `id` + `cwd` 必须与落盘
//      路径吻合（vendor `assertStoredIdentity`；vendor/dsh/packages/session/session-persistence-jsonl/
//      src/index.ts:1601-1628 + format.ts:280-288）；组名按夹具里的 cwd 现算，不抄 dev home 的组名。
//   ② **默认会话后端是 zstd**：明文 `.jsonl` 会被 `encodingMismatch` 拒绝（index.ts:1745-1753），
//      workspaceRegistry 随之不激活（workspace/create → service-unavailable）。故本件把明文夹具
//      压成 `.jsonl.zstd`。
//   ③ **zstd 首帧必须恰好只有 header 一行**（`assertZstdHeaderFrame`，index.ts:78-82；
//      `readFirstZstdLine` 只解首帧，index.ts:1496-1524）：整份日志压成一个帧时，`listArtifacts`
//      把该会话当作 corruption **静默跳过**（无启动报错，侧栏只剩空会话）。故写成两帧：
//      帧 1 = header + 换行，帧 2 = 其余全部事件。
//
// 夹具布局（`tests/fixtures/client-load-home/`）：
//   sessions/<sessionId>/session.v4.jsonl   明文会话日志（阈值 >30 分钟由本件回拨 mtime）
//   workspace/research-workspace/**.md|json|yml   工作区树（bundle / method-library / archive run）
// 文本里的 `__WORKSPACE__` / `__REPO_ROOT__` 占位在 materialize 时替换为种子工作区绝对路径 / 当前仓根。
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import * as zlib from 'node:zlib'

/** 夹具名解析失败时的补救文案（fail-loud）；调用方把候选路径拼在 `tried` 里。 */
export const SEED_FIXTURE_REMEDY = '夹具必须是含 sessions/ 与 workspace/research-workspace/ 的目录（默认正本 = tests/fixtures/client-load-home）'

/** 文本类扩展名：materialize 时做 `__WORKSPACE__` 替换；其余按二进制原样复制。 */
const TEXT_EXTENSIONS = new Set(['.md', '.json', '.jsonl', '.yml', '.yaml', '.txt', '.js', '.mjs', '.ts', '.csv'])

/** 冷会话门槛：冒烟把 30 分钟内仍写盘的会话当"在飞 run"排除（client-load-reference.support 绑定候选过滤）。 */
const COLD_MS = 2 * 60 * 60_000

/** 会话目录名 = vendor `encodeSegment(id)`（简单 id 原样；只拦路径分隔符与 . / ..）。 */
function encodeSegment(segment) {
  if (segment === '.' || segment === '..') throw new Error(`seed-home: 非法会话目录名 ${JSON.stringify(segment)}`)
  if (segment.includes('/') || segment.includes('\\')) throw new Error(`seed-home: 会话目录名不得含路径分隔符 ${JSON.stringify(segment)}`)
  return segment
}

/**
 * 解析 `--seed <dir|name>`：先按路径（cwd 相对 / 仓根相对 / 绝对），再按夹具名。
 * @param {string} spec - CLI 参数值（目录或夹具名）。
 * @param {{root: string, cwd?: string}} opts - 仓根与解析基准（cwd 缺省 = process.cwd()）。
 * @returns {{dir: string, tried: string[]}} 解析出的夹具根（含 sessions/ + workspace/research-workspace/）。
 */
export function resolveSeedFixture(spec, { root, cwd = process.cwd() }) {
  if (typeof spec !== 'string' || spec.trim() === '') throw new Error('seed-home: --seed 需要目录或夹具名')
  const candidates = []
  if (spec.startsWith('/') || /^[A-Za-z]:[\\/]/.test(spec)) candidates.push(spec)
  else {
    candidates.push(resolve(cwd, spec), resolve(root, spec))
    const fixtures = join(root, 'tests', 'fixtures')
    candidates.push(join(fixtures, spec), join(fixtures, 'client-load-home', spec))
  }
  const unique = [...new Set(candidates)]
  for (const dir of unique) {
    if (existsSync(join(dir, 'sessions')) && existsSync(join(dir, 'workspace', 'research-workspace'))) {
      return { dir: resolve(dir), tried: unique }
    }
  }
  throw new Error(`seed-home: 找不到夹具 ${JSON.stringify(spec)}（候选：${unique.join('、')}）；${SEED_FIXTURE_REMEDY}`)
}

/** 递归复制一棵**文本已替换**的目录树；文本扩展名做占位替换，其余按字节复制。 */
function copyTree(source, destination, replacements) {
  mkdirSync(destination, { recursive: true })
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name)
    const to = join(destination, entry.name)
    if (entry.isDirectory()) { copyTree(from, to, replacements); continue }
    if (entry.isSymbolicLink()) throw new Error(`seed-home: 夹具不得含符号链接（${from}）`)
    if (!entry.isFile()) throw new Error(`seed-home: 夹具含非常规文件（${from}）`)
    if (TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      let text = readFileSync(from, 'utf8')
      for (const [placeholder, value] of Object.entries(replacements)) text = text.split(placeholder).join(value)
      writeFileSync(to, text, 'utf8')
    } else {
      writeFileSync(to, readFileSync(from))
    }
  }
}

/** 明文字符串 → vendor 会话日志的物理编码（帧 1 = header 行，帧 2 = 其余事件；见文件头边界③）。 */
export function encodeSessionLog(text) {
  const newline = text.indexOf('\n')
  if (newline === -1) throw new Error('seed-home: 会话日志缺少 header 行（首行没有换行符）')
  const header = text.slice(0, newline + 1)
  const rest = text.slice(newline + 1)
  if (!zlib.zstdCompressSync) throw new Error('seed-home: 当前 Node 缺 zlib.zstdCompressSync（需 node >= 22.15；本仓 engines = ^22.19 || >=24）')
  const frames = [zlib.zstdCompressSync(Buffer.from(header, 'utf8'))]
  if (rest.length > 0) frames.push(zlib.zstdCompressSync(Buffer.from(rest, 'utf8')))
  return Buffer.concat(frames)
}

/**
 * Materialize 夹具 home + 工作区到运行区（幂等：先清空两个目标目录）。
 *
 * @param {object} opts
 * @param {string} opts.fixtureDir - 夹具根（resolveSeedFixture 的 dir）。
 * @param {string} opts.homeDir - DSH_HOME 目标（如 runtime/smoke-workspace/seed-home）。
 * @param {string} opts.workspaceRoot - 工作区**父目录**目标（如 runtime/smoke-workspace/seed；其下生成 research-workspace/）。
 * @param {string} opts.repoRoot - 当前仓库根（夹具里的 `__REPO_ROOT__` 占位替换目标：日志里历史工具路径的仓根前缀）。
 * @param {(cwd: string) => string} opts.projectKey - vendor 同形的组目录名函数（调用方从 lib/session-log 取正本，
 *   本件不直接 import lib —— 否则 scripts/README 的 lib 消费列要跟着改，超出本夹具改动的面）。
 * @param {number} [opts.now] - 回拨基准（测试注入用；缺省 Date.now()）。
 * @returns {{fixtureDir: string, home: string, root: string, workspace: string, group: string,
 *   sessions: Array<{sessionId: string, logPath: string, mtimeMs: number}>}}
 */
export function materializeSeedHome({ fixtureDir, homeDir, workspaceRoot, repoRoot, projectKey, now = Date.now() }) {
  const fixture = resolve(fixtureDir)
  const home = resolve(homeDir)
  const root = resolve(workspaceRoot)
  if (typeof repoRoot !== 'string' || repoRoot === '') throw new Error('seed-home: materializeSeedHome 需要 repoRoot（__REPO_ROOT__ 占位替换目标）')
  if (typeof projectKey !== 'function') throw new Error('seed-home: materializeSeedHome 需要 projectKey（组目录名正本 = lib/session-log 的再导出）')
  const workspace = join(root, 'research-workspace')
  const fixtureWorkspace = join(fixture, 'workspace', 'research-workspace')
  if (!existsSync(fixtureWorkspace)) throw new Error(`seed-home: 夹具缺 workspace/research-workspace（${fixtureWorkspace}）；${SEED_FIXTURE_REMEDY}`)
  const replacements = { __WORKSPACE__: workspace, __REPO_ROOT__: repoRoot }

  rmSync(home, { recursive: true, force: true })
  rmSync(root, { recursive: true, force: true })
  mkdirSync(home, { recursive: true })
  copyTree(fixtureWorkspace, workspace, replacements)

  const group = projectKey(workspace)
  const sessionsDir = join(fixture, 'sessions')
  if (!existsSync(sessionsDir)) throw new Error(`seed-home: 夹具缺 sessions/（${sessionsDir}）；${SEED_FIXTURE_REMEDY}`)
  const sessions = []
  for (const entry of readdirSync(sessionsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const sessionId = encodeSegment(entry.name)
    const sourceLog = join(sessionsDir, entry.name, 'session.v4.jsonl')
    if (!existsSync(sourceLog)) throw new Error(`seed-home: 会话 ${sessionId} 缺 session.v4.jsonl（明文夹具正本）`)
    let text = readFileSync(sourceLog, 'utf8')
    for (const [placeholder, value] of Object.entries(replacements)) text = text.split(placeholder).join(value)
    let header
    try { header = JSON.parse(text.slice(0, text.indexOf('\n'))) } catch (cause) {
      throw new Error(`seed-home: 会话 ${sessionId} 的 header 行不是合法 JSON：${cause.message}`)
    }
    if (header?.type !== 'session') throw new Error(`seed-home: 会话 ${sessionId} 首行不是 type=session 的 header`)
    if (header.id !== sessionId) {
      throw new Error(`seed-home: 会话 ${sessionId} 的 header id = ${JSON.stringify(header.id)} 与目录名不符（vendor assertStoredIdentity 会拒绝）`)
    }
    if (header.cwd !== workspace) {
      throw new Error(`seed-home: 会话 ${sessionId} 的 header cwd = ${JSON.stringify(header.cwd)}，与 materialize 的工作区 ${workspace} 不一致（夹具须用 __WORKSPACE__ 占位）`)
    }
    const targetDir = join(home, 'sessions', group, sessionId)
    mkdirSync(targetDir, { recursive: true })
    const logPath = join(targetDir, 'session.v4.jsonl.zstd')
    writeFileSync(logPath, encodeSessionLog(text))
    const mtime = new Date(now - COLD_MS)
    utimesSync(logPath, mtime, mtime)
    sessions.push({ sessionId, logPath, mtimeMs: mtime.getTime() })
  }
  if (sessions.length === 0) throw new Error(`seed-home: 夹具 sessions/ 下没有会话目录（${sessionsDir}）`)
  return { fixtureDir: fixture, home, root, workspace, group, sessions }
}

/** 夹具体积摘要（给报告/调试用；不参与断言）。 */
export function seedFixtureSize(dir) {
  let bytes = 0
  let files = 0
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name)
      if (entry.isDirectory()) walk(p)
      else if (entry.isFile()) { files += 1; bytes += statSync(p).size }
      else if (entry.isSymbolicLink() && lstatSync(p).isSymbolicLink()) throw new Error(`seed-home: 夹具含符号链接（${p}）`)
    }
  }
  walk(resolve(dir))
  return { files, bytes }
}
