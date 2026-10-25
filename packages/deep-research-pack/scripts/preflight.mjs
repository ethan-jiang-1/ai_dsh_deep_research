#!/usr/bin/env node
// preflight.mjs — 部署前置检查（pack 自带；fail-loud，每项失败给补救命令）。
//
// 为什么需要：本 pack 装了 ≠ 能跑。研究纪律靠**会话 cwd 的 AGENTS.md**（DSH agent-instructions
// 向上发现注入）、团队机制靠 **vendor agent-team-profile 层**、角色靠 **平台 peer 包**、
// 版本靠 **engines.dsh**（`dsh.compatibility.dshReleases` 是兼容矩阵镜像，不是宿主字段）。本命令把这些前提逐项机检，缺什么说什么、
// 怎么补也说什么——部署方的第一条命令（配 scaffold.mjs 自动补齐）。
//
// 用法：
//   node <pack>/scripts/preflight.mjs [--workspace <研究工作区>] [--host <profile 目录>] [--install-only]
//   或经 bin：dsh-deep-research-preflight [--workspace <dir>] [--host <dir>]（registry 安装形态；tarball 装法无 PATH bin，用本文件全路径）
//   --no-host-inference 为 scaffold 内部参数：目标 profile 尚未初始化时禁止解析其他 profile。
//
// 缺省宿主解析锚：从 $DSH_HOME 选 research 或唯一可用 profile；其余多 profile 情形不推断，
// 回退到本包位置（适合 pack 已安装在目标 profile 的场景）。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { satisfiesVersion } from './lib/version-range.mjs'

const PACK = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const argv = process.argv.slice(2)
const installOnly = argv.includes('--install-only')
const noHostInference = argv.includes('--no-host-inference')
const argOf = (name) => { const i = argv.indexOf(`--${name}`); return i === -1 ? null : argv[i + 1] }
const workspace = argOf('workspace') === null ? null : resolve(argOf('workspace'))
let host = argOf('host') === null ? null : resolve(argOf('host'))
// 缺省从 $DSH_HOME 可用 profiles 选择解析锚：有 research 时用它，只有一个可用 profile 时用唯一项；
// 其他多 profile 情形不推断，按本包位置解析。显式 --host 可覆盖该选择。
// scaffold 用 --no-host-inference 禁止从其他 profile 或 pack 安装位置解析 peer。
if (host === null && !noHostInference && process.env.DSH_HOME !== undefined) {
  const profiles = join(resolve(process.env.DSH_HOME), 'profiles')
  if (existsSync(profiles)) {
    const names = readdirSync(profiles).filter((n) => existsSync(join(profiles, n, 'package.json')))
    const pick = names.includes('research') ? 'research' : names.length === 1 ? names[0] : undefined
    if (pick !== undefined) host = join(profiles, pick)
  }
}
const requireFrom = host === null
  ? noHostInference ? null : createRequire(import.meta.url)
  : createRequire(join(host, 'package.json'))
const resolveFrom = (name) => {
  if (requireFrom === null) return false
  try { requireFrom.resolve(name); return true } catch { return false }
}
const resolveVersion = (name) => {
  if (requireFrom === null) return null
  try {
    const manifest = JSON.parse(readFileSync(requireFrom.resolve(`${name}/package.json`), 'utf8'))
    return typeof manifest.version === 'string' ? manifest.version : null
  } catch { return null }
}
// 实际运行版本：profile 解析到的 app-boot 优先；它是团队层要匹配的版本（engines.dsh 是范围）。
const runtimeVersion = resolveVersion('@deepseek-ai/dsh-app-boot')
const cliVersion = (() => {
  const r = spawnSync('dsh', ['--version'], { encoding: 'utf8' })
  return r.status === 0 ? (String(r.stdout).trim().match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/)?.[0] ?? null) : null
})()

const results = []
const record = (ok, name, detail, remedy) => { results.push({ ok, name, detail, remedy }) }

/** `engines.node` 的当前声明是 `^22.19.0 || >=24.0.0`；本实现覆盖该形态的 ^/>= 比较。
 *  变更 engines.node 时同步扩这里（tests/pack/deploy-bin.test.mjs 钉住本函数与声明同源）。 */
function nodeSatisfies(version, range) {
  const v = String(version).split('.').map((n) => Number.parseInt(n, 10))
  if (v.length < 3 || v.some((n) => Number.isNaN(n))) return false
  const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
  for (const raw of String(range).split('||')) {
    const alt = raw.trim()
    let m = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(alt)
    if (m) {
      const base = [Number(m[1]), Number(m[2]), Number(m[3])]
      if (v[0] === base[0] && cmp(v, base) >= 0) return true
      continue
    }
    m = /^>=(\d+)\.(\d+)\.(\d+)$/.exec(alt)
    if (m) {
      if (cmp(v, [Number(m[1]), Number(m[2]), Number(m[3])]) >= 0) return true
      continue
    }
    m = /^(\d+)\.(\d+)\.(\d+)$/.exec(alt)
    if (m) {
      if (cmp(v, [Number(m[1]), Number(m[2]), Number(m[3])]) === 0) return true
    }
  }
  return false
}

// ① Node 版本（pack 的运行前置；不满足时 DSH 本身也可能起不来）
{
  const range = pkg.engines?.node
  const node = process.versions.node
  const ok = range === undefined ? null : nodeSatisfies(node, range)
  record(ok, 'Node 版本兼容', range === undefined ? `未声明（当前 ${node}）` : `当前 ${node}；本包要求 ${range}`, `升级 Node 到 ${range ?? '包声明的范围'}（根 package.json engines.node 同源）`)
}

// ② DSH 版本（engines.dsh 是宿主字段；兼容矩阵是镜像。优先读 profile 的 app-boot 运行时，PATH CLI 只作后备）
{
  const want = pkg.engines?.dsh ?? pkg.dsh?.compatibility?.dshReleases?.[0]?.replace(/^dsh-v/, '') ?? null
  // profile 的 app-boot 优先；解析不到时才用 PATH CLI 兜底（同一安装的常见情形），不冒充运行时。
  const judgeVersion = runtimeVersion ?? cliVersion
  const ok = want === null || judgeVersion === null ? null : satisfiesVersion(judgeVersion, want)
  const detail = runtimeVersion !== null
    ? `宿主运行时 ${runtimeVersion}${cliVersion !== null && cliVersion !== runtimeVersion ? `（PATH CLI ${cliVersion}，不作判据）` : ''}；本包要求 ${want ?? '未声明'}`
    : cliVersion !== null
      ? `未解析到 profile 的 app-boot；按 PATH CLI ${cliVersion} 判定；本包要求 ${want ?? '未声明'}`
      : `无法判定（未解析到 profile 的 app-boot，dsh --version 也不可用；本包要求 ${want ?? '未声明'}）`
  record(ok, 'DSH 版本兼容', detail, `装匹配版本：npm i -g @deepseek-ai/dsh@${want ?? '<版本>'}（或让 profile 解析到该版本）`)
}

// ② 平台 peer 包（解析锚 = 宿主 profile）
{
  const peers = Object.keys(pkg.peerDependencies ?? {})
  const missing = peers.filter((p) => !resolveFrom(p))
  record(missing.length === 0, `平台 peer 包（${peers.length} 个）`, missing.length === 0 ? `全部可解析（锚：${host ?? '本包位置'}）` : `缺 ${missing.length} 个：${missing.slice(0, 3).join('、')}${missing.length > 3 ? '…' : ''}`, '这些是 DSH 平台包：装匹配版本的 DSH，或把它们装进同一 profile')
}

// ④ 团队机制层（本包不声明团队行——归 vendor agent-team-profile 层；版本与 engines.dsh 对齐）
{
  const TEAM = '@deepseek-ai/dsh-experimental-agent-team-profile'
  const expected = runtimeVersion ?? cliVersion ?? pkg.dsh?.compatibility?.dshReleases?.[0]?.replace(/^dsh-v/, '') ?? null
  const installed = resolveFrom(TEAM)
  const version = installed ? resolveVersion(TEAM) : null
  const ok = installed ? (version === null || expected === null ? null : version === expected) : false
  const detail = !installed
    ? '缺席——四角色协作主通道不可用'
    : version === null
      ? '在场，但读不到版本（无法确认与 engines.dsh 对齐）'
      : `在场：${TEAM}@${version}${expected === null ? '' : version === expected ? '（与运行版本一致）' : `；期望 ${expected}`}`
  record(ok, '团队机制层（spawn_teammate 等）', detail, `dsh plugin --profile <p> add ${TEAM}${expected === null ? '' : `@${expected}`}（本包故意不声明团队行：组合与实战 config 归该层）`)
}

// ④ 研究工作区（手册 = 会话 cwd 的 AGENTS.md；模板 = run bundle 起点；.gitignore = 运行区拒收）
{
  if (workspace === null) {
    record(true, '研究工作区', '未指定（--workspace <目录> 可检查；scaffold.mjs 可一键生成）', `node ${join(PACK, 'scripts', 'scaffold.mjs')} --workspace <目录>`)
  } else {
    const manual = join(workspace, 'AGENTS.md')
    const nodesDoc = join(workspace, 'NODES.md')
    const patternsDoc = join(workspace, 'question-patterns.md')
    const ignore = join(workspace, '.gitignore')
    const templates = join(workspace, 'templates', 'run')
    const hasManual = existsSync(manual)
    const hasNodes = existsSync(nodesDoc)
    const hasPatterns = existsSync(patternsDoc)
    const hasIgnore = existsSync(ignore)
    const tplCount = existsSync(templates) ? readdirSync(templates).filter((f) => f.endsWith('.md')).length : 0
    const seedRemedy = `cp -r ${join(PACK, 'workspace')}/. ${workspace}/`
    record(hasManual, `研究工作区手册（${manual}）`, hasManual ? `在场（${readFileSync(manual, 'utf8').split('\n').length} 行）` : '缺席——角色将没有研究纪律（证据契约/目录约定/完成判据全失效）', seedRemedy)
    record(hasNodes, `节点契约（${nodesDoc}）`, hasNodes ? '在场' : '缺席——节点开工判据与回边版本语义不可查', seedRemedy)
    record(hasPatterns, `判型模式库（${patternsDoc}）`, hasPatterns ? '在场' : '缺席——HITL1 判型失去第一对照面', seedRemedy)
    record(hasIgnore, `工作区 .gitignore（${ignore}）`, hasIgnore ? '在场（run 产物默认拒收）' : '缺席——工作区若进 git，一次 git add -A 会把 run bundle/归档/用户方法库一起提交', seedRemedy)
    record(tplCount >= 6, `run 模板（${templates}）`, `${tplCount} 个（期望 ≥6）`, seedRemedy)
    // 种子版本：状态文件由 scaffold 写入；缺失/落后不硬红（旧工作区仍可用），但必须显式列为未验证。
    const statePath = join(workspace, '.dsh-research-seed.json')
    let seedVersionOk = null
    let seedVersionDetail = '未记录（旧工作区或未用 scaffold 铺过）'
    if (existsSync(statePath)) {
      try {
        const state = JSON.parse(readFileSync(statePath, 'utf8'))
        seedVersionOk = state.version === pkg.version ? true : null
        const skipped = Array.isArray(state.skipped) ? state.skipped : []
        seedVersionDetail = state.version === pkg.version
          ? `记录 v${state.version}（与 pack 一致）${skipped.length > 0 ? `；${skipped.length} 个未合并 .seed-new` : ''}`
          : `记录 v${state.version}；pack v${pkg.version}——运行 --upgrade`
      } catch {
        seedVersionDetail = '状态文件不可解析——运行 scaffold --check 重建'
      }
    }
    record(seedVersionOk, '工作区种子版本', seedVersionDetail, `node ${join(PACK, 'scripts', 'scaffold.mjs')} --workspace ${workspace} --check`)
  }
}

// ⑤ 构建产物
{
  const hostHalf = join(PACK, 'lib', 'index.js')
  const clientHalf = join(PACK, 'lib', 'client.js')
  const ok = existsSync(hostHalf) && existsSync(clientHalf)
  record(ok, '构建产物（lib/index.js + lib/client.js）', ok ? '在场' : `缺：${!existsSync(hostHalf) ? 'lib/index.js ' : ''}${!existsSync(clientHalf) ? 'lib/client.js' : ''}`, '源码安装需先构建：cd <pack> && pnpm install && pnpm build（npm 安装的发布包含 lib/，无需构建）')
}

// ⑥ 模型密钥（默认研究就绪检查；安装验收明确不宣称研究可用）
{
  if (installOnly) {
    record(true, '模型密钥 DEEPSEEK_API_KEY', '安装验收模式：跳过凭据在场检查（不代表研究就绪）', '')
  } else {
    const key = process.env.DEEPSEEK_API_KEY
    const home = process.env.DSH_HOME ?? join(process.env.HOME ?? '', '.dsh')
    const credFile = join(resolve(home), '.credentials.yaml')
    const hasEnv = key !== undefined && key !== ''
    const hasCred = existsSync(credFile)
    record(hasEnv || hasCred, '模型密钥 DEEPSEEK_API_KEY', hasEnv ? '环境变量已配置' : hasCred ? `DSH 凭据文件在场（${credFile}）` : '两者皆无——真模型档（研究 run）不可用', 'export DEEPSEEK_API_KEY=<key>，或用 dsh 的凭据配置写入 $DSH_HOME/.credentials.yaml（web 搜索同一把钥匙）')
  }
}

// ── 输出 ──
const hardFail = results.filter((r) => r.ok === false)
const unknown = results.filter((r) => r.ok === null)
const resolutionAnchor = host ?? (noHostInference ? '目标 profile 未就绪' : PACK)
console.log(`deep-research-pack preflight（pack v${pkg.version}；解析锚：${resolutionAnchor}）\n`)
for (const r of results) {
  console.log(`  ${r.ok === false ? '✗' : r.ok == null ? '?' : '✓'} ${r.name}`)
  console.log(`      ${r.detail}`)
  if (r.ok === false) console.log(`      → ${r.remedy}`)
}
console.log(hardFail.length === 0
  ? unknown.length > 0
    ? installOnly
      ? `\npreflight: 安装验收通过（不代表研究就绪；未验证项：${unknown.map((r) => r.name).join('、')}）`
      : `\npreflight: 通过（含未验证项：${unknown.map((r) => r.name).join('、')}）`
    : installOnly
      ? '\npreflight: 安装验收通过（不代表研究就绪）'
      : '\npreflight: 全绿（本 pack 可用）'
  : `\npreflight: ${hardFail.length} 项待补（按 → 的补救命令处理；或用 scaffold.mjs 一键补齐）`)
process.exit(hardFail.length === 0 ? 0 : 1)
