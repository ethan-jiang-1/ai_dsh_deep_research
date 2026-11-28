#!/usr/bin/env node
// demo-showcase.mjs — 3 分钟零 Key 深度研究标杆示范通道（operate: run）。
// 零 API Key、零污染日用 ~/.dsh 或仓内 research-workspace：把 tests/fixtures/showcase-home
// materialize 到 runtime/smoke-workspace/showcase-{home,workspace}，以源码域 overlay + agent-team
// 启动隔离 DSH Web 服务，幂等注册示范工作区并打印可立即体验 5 个 Signature Moments 的带 token URL。
//
// 用法：
//   pnpm demo                       # 启动并在终端打印带 token URL + 3 分钟体验清单（前台常驻，Ctrl-C 回收）
//   node tools/channel/demo-showcase.mjs --port 3120 --no-open
//   node tools/channel/demo-showcase.mjs --check   # 验通 materialize → 启动 → auth → 注册工作区后自动退出 0
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as zlib from 'node:zlib'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const TEXT_EXTS = new Set(['.md', '.json', '.jsonl', '.yml', '.yaml', '.txt', '.js', '.mjs', '.ts'])
const COLD_MS = 2 * 60 * 60_000
const BOOT_TIMEOUT_MS = 120_000
const KEY_ENVS = ['DEEPSEEK_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'DSH_API_KEY']

const TEAM_OVERLAY_TAIL = `
    - id: agent-team
      name: '@deepseek-ai/dsh-experimental-agent-team'
      config:
        maxMembers: 8
        maxTasks: 256
        maxPendingMessagesPerMember: 64
        maxMessageBytes: 65536
        disposalTimeoutMs: 5000

    - id: ui-agent-team
      name: '@deepseek-ai/dsh-experimental-client-ui-agent-team'
`

/**
 * 与 vendor session-persistence-jsonl 同形的会话组目录名。
 * @param {string} cwd
 * @returns {string}
 */
function projectKey(cwd) {
  let readable = ''
  let sepRun = false
  for (let i = 0; i < cwd.length; i += 1) {
    const code = cwd.charCodeAt(i)
    const ch = String.fromCharCode(code)
    if (ch === '/' || ch === '\\' || ch === ':') {
      if (!sepRun) readable += '-'
      sepRun = true
    } else if (ch !== '~' && /^[A-Za-z0-9._-]$/.test(ch)) {
      readable += ch
      sepRun = false
    } else {
      readable += `~${code.toString(16).toUpperCase().padStart(4, '0')}`
      sepRun = false
    }
  }
  const slug = readable.replace(/^-+/, '') || 'root'
  return `--${slug.slice(0, 251)}--`
}

/**
 * 两帧 zstd 编码（帧 1 = header 行 + 换行，帧 2 = 其余事件）。
 * @param {string} text
 * @returns {Buffer}
 */
function encodeSessionLog(text) {
  const nl = text.indexOf('\n')
  if (nl === -1) throw new Error('demo-showcase: 会话日志缺少 header 行换行符')
  const header = text.slice(0, nl + 1)
  const rest = text.slice(nl + 1)
  if (typeof zlib.zstdCompressSync !== 'function') {
    throw new Error('demo-showcase: 当前 Node 缺少 zlib.zstdCompressSync（需要 Node ^22.19 || >=24）')
  }
  const frames = [zlib.zstdCompressSync(Buffer.from(header, 'utf8'))]
  if (rest.length > 0) frames.push(zlib.zstdCompressSync(Buffer.from(rest, 'utf8')))
  return Buffer.concat(frames)
}

/**
 * 递归复制并替换占位符。
 * @param {string} src
 * @param {string} dst
 * @param {Record<string, string>} replacements
 */
function copyTree(src, dst, replacements) {
  mkdirSync(dst, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, entry.name)
    const to = join(dst, entry.name)
    if (entry.isDirectory()) { copyTree(from, to, replacements); continue }
    if (!entry.isFile()) continue
    if (TEXT_EXTS.has(extname(entry.name).toLowerCase())) {
      let text = readFileSync(from, 'utf8')
      for (const [key, val] of Object.entries(replacements)) text = text.split(key).join(val)
      writeFileSync(to, text, 'utf8')
    } else {
      writeFileSync(to, readFileSync(from))
    }
  }
}

/**
 * 读取空闲端口。
 * @returns {Promise<number>}
 */
function pickFreePort() {
  return new Promise((resolvePort, rejectPort) => {
    const srv = createServer()
    srv.unref()
    srv.on('error', rejectPort)
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      const port = typeof addr === 'object' && addr !== null ? addr.port : 0
      srv.close(() => resolvePort(port))
    })
  })
}

/**
 * 解析命令行参数。
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {number | null} */
  let port = null
  let openBrowser = true
  let checkOnly = false
  let fixturePath = join(ROOT, 'tests', 'fixtures', 'showcase-home')
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--no-open') openBrowser = false
    else if (token === '--check') { checkOnly = true; openBrowser = false }
    else if (token === '--port' && argv[i + 1] !== undefined) {
      const n = Number(argv[++i])
      if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`demo-showcase: 非法端口 ${argv[i]}`)
      port = n
    } else if (token === '--fixture' && argv[i + 1] !== undefined) {
      fixturePath = resolve(argv[++i])
    } else if (token === '--help' || token === '-h') {
      console.log('用法：node tools/channel/demo-showcase.mjs [--port <n>] [--no-open] [--check] [--fixture <dir>]')
      process.exit(0)
    }
  }
  return { port, openBrowser, checkOnly, fixturePath }
}

/**
 * 将示范夹具 materialize 到独立隔离运行区。
 * @param {string} fixtureDir
 */
function materializeShowcase(fixtureDir) {
  const home = join(ROOT, 'runtime', 'smoke-workspace', 'showcase-home')
  const wsRoot = join(ROOT, 'runtime', 'smoke-workspace', 'showcase')
  const workspace = join(wsRoot, 'research-workspace')
  const srcWs = join(fixtureDir, 'workspace', 'research-workspace')
  const srcSessions = join(fixtureDir, 'sessions')
  if (!existsSync(srcWs) || !existsSync(srcSessions)) {
    throw new Error(`demo-showcase: 示范夹具不完整（${fixtureDir}），需要 workspace/research-workspace 与 sessions/`)
  }

  rmSync(home, { recursive: true, force: true })
  rmSync(wsRoot, { recursive: true, force: true })
  mkdirSync(home, { recursive: true })
  const replacements = { __WORKSPACE__: workspace, __REPO_ROOT__: ROOT }
  copyTree(srcWs, workspace, replacements)

  const group = projectKey(workspace)
  const coldTime = new Date(Date.now() - COLD_MS)
  /** @type {string[]} */
  const sessionIds = []
  for (const ent of readdirSync(srcSessions, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue
    const rawLog = join(srcSessions, ent.name, 'session.v4.jsonl')
    if (!existsSync(rawLog)) continue
    let text = readFileSync(rawLog, 'utf8')
    for (const [key, val] of Object.entries(replacements)) text = text.split(key).join(val)
    const targetDir = join(home, 'sessions', group, ent.name)
    mkdirSync(targetDir, { recursive: true })
    const zstdPath = join(targetDir, 'session.v4.jsonl.zstd')
    writeFileSync(zstdPath, encodeSessionLog(text))
    utimesSync(zstdPath, coldTime, coldTime)
    sessionIds.push(ent.name)
  }

  const overlayPath = join(ROOT, 'runtime', 'smoke-workspace', 'showcase.overlay.yml')
  const baseOverlay = join(ROOT, 'tools', 'record', 'research.overlay.yml')
  writeFileSync(overlayPath, readFileSync(baseOverlay, 'utf8') + TEAM_OVERLAY_TAIL, 'utf8')
  return { home, workspace, group, overlayPath, sessionIds }
}

/**
 * 清理子进程组。
 * @param {import('node:child_process').ChildProcess | null} child
 */
function killGroup(child) {
  if (child === null || child.pid === undefined) return
  try { process.kill(-child.pid, 'SIGTERM') } catch { /* 进程组已退出 */ }
}

/**
 * 等待 web 启动横幅并解析 token。
 * @param {import('node:child_process').ChildProcess} child
 * @param {number} port
 * @returns {Promise<string>}
 */
function waitBanner(child, port) {
  const re = new RegExp(`http://127\\.0\\.0\\.1:${port}/\\?token=(\\S+)`)
  let output = ''
  return new Promise((resolveToken, rejectToken) => {
    let done = false
    const timer = setTimeout(() => {
      if (done) return
      done = true
      rejectToken(new Error(`demo-showcase: 等待启动横幅超时\n${output.slice(-800)}`))
    }, BOOT_TIMEOUT_MS)
    const onData = (chunk) => {
      output += String(chunk)
      const m = re.exec(output)
      if (m !== null && !done) {
        done = true
        clearTimeout(timer)
        resolveToken(m[1])
      }
    }
    child.stdout?.setEncoding('utf8')
    child.stderr?.setEncoding('utf8')
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)
    child.on('exit', (code) => {
      if (done) return
      done = true
      clearTimeout(timer)
      rejectToken(new Error(`demo-showcase: web 进程提前退出（code ${String(code)}）\n${output.slice(-800)}`))
    })
  })
}

/**
 * 用 token 换 cookie，幂等登记示范工作区并预热预载会话的 Host 投影缓存（零激活 LLM）。
 * @param {string} base
 * @param {string} token
 * @param {string} workspace
 * @param {readonly string[]} sessionIds
 */
async function bootstrapWorkspace(base, token, workspace, sessionIds) {
  const authRes = await fetch(`${base}/?token=${token}`, { redirect: 'manual' })
  const cookies = authRes.headers.getSetCookie?.() ?? []
  if (cookies.length === 0) throw new Error('demo-showcase: token 交换未返回 session cookie')
  const cookie = cookies.map((c) => c.split(';')[0]).join('; ')

  const rpcRes = await fetch(`${base}/api/workspace/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      type: 'client-request',
      rpcId: 'showcase-ws-1',
      method: 'workspace/create',
      payload: { args: { request: { path: workspace } } },
    }),
  })
  const rpcBody = await rpcRes.json()
  if (rpcBody?.result?.ok !== true) {
    throw new Error(`demo-showcase: workspace/create 失败：${JSON.stringify(rpcBody).slice(0, 200)}`)
  }
  for (let i = 0; i < sessionIds.length; i += 1) {
    const sid = sessionIds[i]
    await fetch(`${base}/api/session/projections`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: `showcase-proj-${i + 1}`,
        method: 'session/projections',
        payload: { args: { request: { sessionId: sid } } },
      }),
    }).catch(() => undefined)
  }
  const wsVal = rpcBody.result.value
  const workspaceId = String(wsVal?.workspace?.workspaceId ?? wsVal?.workspaceId ?? wsVal?.id ?? '')
  return { cookie, workspaceId }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const bin = join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')
  const clientBundle = join(ROOT, 'packages', 'deep-research-pack', 'lib', 'client.js')
  if (!existsSync(bin)) {
    console.error('demo-showcase: 缺少 vendor/dsh 源码，请先执行 git submodule update --init vendor/dsh')
    process.exit(2)
  }
  if (!existsSync(clientBundle)) {
    console.error('demo-showcase: 缺少 pack 构建产物，请先执行 pnpm build')
    process.exit(2)
  }

  const port = opts.port ?? await pickFreePort()
  const mat = materializeShowcase(opts.fixturePath)

  /** @type {NodeJS.ProcessEnv} */
  const env = { ...process.env, DSH_HOME: mat.home, DEEP_RESEARCH_WORKSPACE: mat.workspace }
  for (const key of KEY_ENVS) delete env[key]

  const child = spawn(
    process.execPath,
    ['--import', 'tsx/esm', bin, '--profile', 'web', '--patch', mat.overlayPath, '--', '--port', String(port), '--no-open'],
    { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true },
  )

  const cleanup = () => { killGroup(child) }
  process.on('SIGINT', () => { cleanup(); process.exit(0) })
  process.on('SIGTERM', () => { cleanup(); process.exit(0) })

  try {
    const token = await waitBanner(child, port)
    const base = `http://127.0.0.1:${port}`
    const url = `${base}/?token=${token}`
    const { workspaceId } = await bootstrapWorkspace(base, token, mat.workspace, mat.sessionIds)

    if (opts.checkOnly) {
      console.log(`demo-showcase: CHECK PASS（port=${port} · sessions=${mat.sessionIds.length} · workspaceId=${workspaceId.slice(0, 8)}）`)
      cleanup()
      process.exit(0)
    }

    console.log('')
    console.log('====================================================================')
    console.log('  Orca Deep Research · 3 分钟零 Key 标杆示范通道已就绪')
    console.log(`  URL: ${url}`)
    console.log(`  隔离工作区: ${mat.workspace}`)
    console.log(`  预载会话: ${mat.sessionIds.join(', ')}（无 API Key，零调用外部模型）`)
    console.log('====================================================================')
    console.log('推荐 3 分钟体验清单（5 个 Signature Moments）：')
    console.log('  [S1] 新建空白会话：观察去编程壳首屏、Hero 轻量选配与意图起题卡')
    console.log('  [S2] 观察左栏状态标：绿标(已交付) 与琥珀标(待拍板)，点开状态页与质量雷达格下钻证据卡')
    console.log('  [S3] 点击「沉浸精读终稿」切全屏：体验三栏布局、150ms 悬停溯源与「核查」风险筛选')
    console.log('  [S4] 在输入框键入 /lens、/method、@ 查看研究指令流与引用胶囊，或按 Cmd/Ctrl+Shift+D 开工作台')
    console.log('  [S5] 打开左侧全局「研究工作台」：切换 Runs（跨会话零串台 + 只读归档对比）/ 方法库 / 透镜')
    console.log('按 Ctrl-C 停止并回收服务进程。')

    if (opts.openBrowser && process.platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true }).unref()
    }
    await new Promise((resolveExit) => { child.on('exit', resolveExit) })
  } catch (err) {
    cleanup()
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

main()
