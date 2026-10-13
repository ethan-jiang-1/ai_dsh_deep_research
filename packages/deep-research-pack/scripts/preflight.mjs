#!/usr/bin/env node
// preflight.mjs — 部署前置检查（pack 自带；fail-loud，每项失败给补救命令）。
//
// 为什么需要：本 pack 装了 ≠ 能跑。研究纪律靠**会话 cwd 的 AGENTS.md**（DSH agent-instructions
// 向上发现注入）、团队机制靠 **vendor agent-team-profile 层**、角色靠 **平台 peer 包**、
// 版本靠 **dsh.compatibility.dshReleases** 钉死。本命令把这些前提逐项机检，缺什么说什么、
// 怎么补也说什么——部署方的第一条命令（配 scaffold.mjs 自动补齐）。
//
// 用法：
//   node <pack>/scripts/preflight.mjs [--workspace <研究工作区>] [--host <profile 目录>] [--install-only]
//   或经 bin：dsh-deep-research-preflight [--workspace <dir>] [--host <dir>]（registry 安装形态；tarball 装法无 PATH bin，用本文件全路径）
//
// --host 指向**运行本 pack 的 profile 目录**（其 node_modules 是 peer/团队层的解析锚）；
// 缺省先按本包位置解析（装进 profile 后即正确），再试 $DSH_HOME/profiles/*。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const PACK = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const argv = process.argv.slice(2)
const installOnly = argv.includes('--install-only')
const argOf = (name) => { const i = argv.indexOf(`--${name}`); return i === -1 ? null : argv[i + 1] }
const workspace = argOf('workspace') === null ? null : resolve(argOf('workspace'))
let host = argOf('host') === null ? null : resolve(argOf('host'))
// 缺省宿主推断：$DSH_HOME/profiles/<唯一或 research>（多 profile 时优先 research）
if (host === null && process.env.DSH_HOME !== undefined) {
  const profiles = join(resolve(process.env.DSH_HOME), 'profiles')
  if (existsSync(profiles)) {
    const names = readdirSync(profiles).filter((n) => existsSync(join(profiles, n, 'package.json')))
    const pick = names.includes('research') ? 'research' : names[0]
    if (pick !== undefined) host = join(profiles, pick)
  }
}
const requireFrom = host === null ? createRequire(import.meta.url) : createRequire(join(host, 'package.json'))
const resolveFrom = (name) => { try { requireFrom.resolve(name); return true } catch { return false } }

const results = []
const record = (ok, name, detail, remedy) => { results.push({ ok, name, detail, remedy }) }

// ① DSH 版本（dsh --version；读不到则按"无法判定"不误红）
{
  const want = pkg.dsh?.compatibility?.dshReleases ?? []
  const r = spawnSync('dsh', ['--version'], { encoding: 'utf8' })
  const found = r.status === 0 ? String(r.stdout).trim() : null
  const ok = found === null ? null : want.some((tag) => found.includes(String(tag).replace(/^dsh-v/, '')))
  record(ok, 'DSH 版本兼容', found === null ? `无法判定（dsh --version 不可用；本包要求 ${want.join('、')}）` : `宿主 ${found}；本包要求 ${want.join('、')}`, `装匹配版本：npm i -g @deepseek-ai/dsh@${String(want[0] ?? '').replace(/^dsh-v/, '')}`)
}

// ② 平台 peer 包（解析锚 = 宿主 profile）
{
  const peers = Object.keys(pkg.peerDependencies ?? {})
  const missing = peers.filter((p) => !resolveFrom(p))
  record(missing.length === 0, `平台 peer 包（${peers.length} 个）`, missing.length === 0 ? `全部可解析（锚：${host ?? '本包位置'}）` : `缺 ${missing.length} 个：${missing.slice(0, 3).join('、')}${missing.length > 3 ? '…' : ''}`, '这些是 DSH 平台包：装匹配版本的 DSH，或把它们装进同一 profile')
}

// ③ 团队机制层（本包不声明团队行——归 vendor agent-team-profile 层）
{
  const candidates = ['@deepseek-ai/dsh-experimental-agent-team-profile', '@deepseek-ai/dsh-experimental-tool-agent-team']
  const found = candidates.filter(resolveFrom)
  record(found.length > 0, '团队机制层（spawn_teammate 等）', found.length > 0 ? `在场：${found.join('、')}` : '缺席——四角色协作主通道不可用', 'dsh plugin --profile <p> add @deepseek-ai/dsh-experimental-agent-team-profile（本包故意不声明团队行：组合与实战 config 归该层）')
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
console.log(`deep-research-pack preflight（pack v${pkg.version}；解析锚：${host ?? PACK}）\n`)
for (const r of results) {
  console.log(`  ${r.ok === false ? '✗' : r.ok == null ? '?' : '✓'} ${r.name}`)
  console.log(`      ${r.detail}`)
  if (r.ok === false) console.log(`      → ${r.remedy}`)
}
console.log(hardFail.length === 0
  ? installOnly
    ? '\npreflight: 安装验收通过（不代表研究就绪）'
    : '\npreflight: 全绿（本 pack 可用）'
  : `\npreflight: ${hardFail.length} 项待补（按 → 的补救命令处理；或用 scaffold.mjs 一键补齐）`)
process.exit(hardFail.length === 0 ? 0 : 1)
