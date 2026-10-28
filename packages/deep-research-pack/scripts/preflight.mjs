#!/usr/bin/env node
// preflight.mjs — 部署前置检查（pack 自带；fail-loud，每项失败给补救命令）。
//
// 为什么需要：本 pack 装了 ≠ 能跑。研究纪律靠**会话 cwd 的 AGENTS.md**（DSH agent-instructions
// 向上发现注入）、团队机制靠 **vendor agent-team-profile 层**、角色靠 **安装锚上的运行时行依赖**、
// 版本靠 **engines.dsh**（`dsh.compatibility.dshReleases` 是兼容矩阵镜像，不是宿主字段）。本命令把这些前提逐项机检，缺什么说什么、
// 怎么补也说什么——部署方的第一条命令（配 scaffold.mjs 自动补齐）。
//
// 用法：
//   node <pack>/scripts/preflight.mjs [--workspace <研究工作区>] [--host <profile 目录>]
//     [--install-anchor <@deepseek-ai/dsh 目录或 package.json>] [--install-only]
//   或经 bin：dsh-deep-research-preflight [--workspace <dir>] [--host <dir>]（registry 安装形态；tarball 装法无 PATH bin，用本文件全路径）
//   --no-host-inference 为 scaffold 内部参数：目标 profile 尚未初始化时禁止解析其他 profile。
//
// 缺省宿主解析锚：从 $DSH_HOME 选 research 或唯一可用 profile；其余多 profile 情形不推断，
// 回退到本包位置（适合 pack 已安装在目标 profile 的场景）。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { satisfiesVersion } from './lib/version-range.mjs'
import { resolveDshHome, resolvePathInput } from './lib/dsh-home.mjs'
import { inferInstallAnchor, resolveRowPeers } from './lib/install-anchor.mjs'
import { rowPeerNames } from './lib/pack-rows.mjs'
import { auditWorkspace } from './lib/workspace-audit.mjs'
import { seedPolicyAdvice } from './lib/seed-core.mjs'
import { credentialStatus } from './lib/credentials-status.mjs'

const PACK = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const argv = process.argv.slice(2)
const installOnly = argv.includes('--install-only')
const noHostInference = argv.includes('--no-host-inference')
const argValue = (name) => {
  const index = argv.indexOf(`--${name}`)
  if (index === -1) return null
  const value = argv[index + 1]
  if (value === undefined || value === '' || value.startsWith('--') || value.startsWith('-')) {
    console.error(`preflight: --${name} 需要一个值（下一个参数是 ${value ?? '(缺失)'}）`)
    process.exit(2)
  }
  return value
}
const workspace = argValue('workspace') === null ? null : resolvePathInput(argValue('workspace'))
let host = argValue('host') === null ? null : resolvePathInput(argValue('host'))
// 安装锚 = 实际运行的 DSH 安装（peer/版本判据的唯一来源）。显式 --install-anchor 优先；
// 否则从 PATH 上的 dsh 推断。解析不到时 runtime/anchor 为 null，相关项标“未验证”，不硬红。
let anchor = null
let anchorError = null
try {
  anchor = inferInstallAnchor({ explicit: argValue('install-anchor'), env: process.env })
} catch (error) {
  anchorError = error instanceof Error ? error.message : String(error)
}
// 缺省从 DSH home（$DSH_HOME，未设时 ~/.dsh）的可用 profiles 选择解析锚：有 research 时用它，
// 只有一个可用 profile 时用唯一项；其他多 profile 情形不推断。显式 --host 可覆盖该选择。
// scaffold 用 --no-host-inference 禁止从其他 profile 或 pack 安装位置解析 peer。
if (host === null && !noHostInference) {
  const profiles = join(resolveDshHome(process.env), 'profiles')
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
// 实际运行版本：安装锚优先（它才是运行中的 DSH）；profile 的 app-boot 只作旧布局后备。
// 团队层必须匹配这个精确版本，不能用 engines.dsh 范围当版本号。
const runtimeVersion = anchor?.version ?? resolveVersion('@deepseek-ai/dsh-app-boot')
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

// ② DSH 版本（engines.dsh 是宿主字段；兼容矩阵是镜像。安装锚优先，PATH CLI 只作后备）
{
  const want = pkg.engines?.dsh ?? pkg.dsh?.compatibility?.dshReleases?.[0]?.replace(/^dsh-v/, '') ?? null
  const judgeVersion = runtimeVersion ?? cliVersion
  const ok = want === null || judgeVersion === null ? null : satisfiesVersion(judgeVersion, want)
  const detail = anchor !== null
    ? `安装锚 ${anchor.path} 的版本 ${runtimeVersion}${cliVersion !== null && cliVersion !== runtimeVersion ? `（PATH CLI ${cliVersion}，不作判据）` : ''}；本包要求 ${want ?? '未声明'}`
    : runtimeVersion !== null
      ? `未解析到安装锚；按 profile 的 app-boot ${runtimeVersion} 判定；本包要求 ${want ?? '未声明'}`
      : cliVersion !== null
        ? `未解析到安装锚；按 PATH CLI ${cliVersion} 判定；本包要求 ${want ?? '未声明'}`
        : `无法判定（未解析到安装锚，dsh --version 也不可用；本包要求 ${want ?? '未声明'}）`
  record(ok, 'DSH 版本兼容', detail, `装匹配版本：npm i -g @deepseek-ai/dsh@${want ?? '<版本>'}（或用 --install-anchor 指向实际安装）`)
  if (anchorError !== null) {
    record(false, 'DSH 安装锚', `无法使用显式/环境指定的安装锚：${anchorError}`, '传 --install-anchor <@deepseek-ai/dsh 安装目录或 package.json>，或清掉无效的 DSH_INSTALL_ANCHOR')
  }
}

// ② 平台运行时行依赖（解析锚 = DSH 安装本体；不查 client/构建期 peer）
{
  const rows = rowPeerNames(PACK)
  if (anchor === null) {
    record(null, `平台行依赖（${rows.length} 个）`, `未验证（未找到 DSH 安装锚；${anchorError ?? 'PATH 上没有可执行的 dsh'}）`, '用 --install-anchor 指向 @deepseek-ai/dsh 安装目录，或把 dsh 放进 PATH 后重跑')
  } else {
    const { missing } = resolveRowPeers(anchor.path, rows)
    record(missing.length === 0, `平台行依赖（${rows.length} 个）`,
      missing.length === 0 ? `全部可从安装锚解析（${anchor.path}）` : `缺 ${missing.length} 个：${missing.slice(0, 3).join('、')}${missing.length > 3 ? '…' : ''}`,
      '这个 DSH 安装缺少 pack 行需要的包：装匹配版本的 DSH，或升级/回退 pack；不要把 peer 装进 profile 来绕过')
  }
}

// ④ 团队机制层（本包不声明团队行——归 vendor agent-team-profile 层；版本与 engines.dsh 对齐）
{
  const TEAM = '@deepseek-ai/dsh-experimental-agent-team-profile'
  // 期望版本只能来自“实际运行版本”；两者都不可得时标未验证，不拿兼容矩阵冒充运行版本。
  const expected = runtimeVersion ?? cliVersion
  const installed = resolveFrom(TEAM)
  const version = installed ? resolveVersion(TEAM) : null
  const ok = installed ? (version === null || expected === null ? null : version === expected) : false
  const detail = !installed
    ? '缺席——四角色协作主通道不可用（团队层是 N2 experimental，上游可改/撤）'
    : version === null
      ? '在场，但读不到版本（无法确认与 engines.dsh 对齐）'
      : `在场：${TEAM}@${version}${expected === null ? '' : version === expected ? '（与运行版本一致）' : `；期望 ${expected}`}`
  record(ok, '团队机制层（spawn_teammate 等）', detail, `dsh plugin --profile <p> add ${TEAM}${expected === null ? '' : `@${expected}`}（本包故意不声明团队行：组合与实战 config 归该层；N2 experimental 不是产品稳定性承诺）`)
}

// ④ profile 组成（缺 web app 的 profile 起不了 GUI；bundle 装成普通依赖不会启用层）
{
  if (host === null) {
    record(null, 'profile 组成（web）', '未指定宿主 profile（--host <profile 目录> 可检查）', 'scaffold 会传入目标 profile；直接运行时加 --host')
  } else {
    const profileName = basename(host)
    let bundles = null
    try {
      const manifest = JSON.parse(readFileSync(join(host, 'package.json'), 'utf8'))
      bundles = Array.isArray(manifest?.dsh?.profile?.bundles) ? manifest.dsh.profile.bundles : null
    } catch {
      bundles = null
    }
    const list = bundles ?? []
    const missing = [
      !list.includes('@deepseek-ai/dsh-web-app') ? '@deepseek-ai/dsh-web-app' : null,
      !list.includes('dsh-deep-research-pack') ? 'dsh-deep-research-pack' : null,
      !list.includes('@deepseek-ai/dsh-experimental-agent-team-profile') ? '@deepseek-ai/dsh-experimental-agent-team-profile' : null,
    ].filter(Boolean)
    const detail = bundles === null
      ? `读不到 profile 清单：${join(host, 'package.json')}（profile 未初始化或不是 DSH profile）`
      : missing.length === 0
        ? `bundles 含 web app、本包与团队层（${profileName}）`
        : `缺 ${missing.join('、')}（${profileName}）`
    record(missing.length === 0, 'profile 组成（web）', detail,
      `重建该 profile：dsh --profile ${profileName} --from-default-profile web --dump-config（已存在时先删/换名；base-only profile 起不了 GUI）`)
  }
}

// ④ 研究工作区（手册 = 会话 cwd 的 AGENTS.md；模板 = run bundle 起点；.gitignore = 运行区拒收）
{
  if (workspace === null) {
    record(true, '研究工作区', '未指定（--workspace <目录> 可检查；scaffold.mjs 可一键生成）', `node ${join(PACK, 'scripts', 'scaffold.mjs')} --workspace <目录>`)
  } else {
    let seed = null
    try { seed = JSON.parse(readFileSync(join(PACK, 'workspace', 'seed.json'), 'utf8')) } catch { seed = null }
    const seedRemedy = `先看分类：node ${join(PACK, 'scripts', 'scaffold.mjs')} --workspace ${workspace} --check；新建空工作区重铺，或按报告 --upgrade/--force`
    if (seed === null || typeof seed.files !== 'object' || seed.files === null) {
      record(false, '研究工作区种子清单', '读不到 pack 的 workspace/seed.json——先重装/重建 pack', '重装 pack，或运行 node dev/sync-pack-workspace.mjs 重建种子')
    } else {
      const audit = auditWorkspace({ workspace, seed })
      // 契约类种子（policy=contract）偏离包版本 = 节点 I/O/手册契约可能不同源；只在详情里点名，
      // 不改变阻塞判据（用户可能有意定制，preflight 不能替他决定）。
      const contractDrift = (rel) => {
        const finding = audit.findings.find((item) => item.rel === rel)
        if (finding === undefined) return ''
        const advice = seedPolicyAdvice(finding.policy, finding.status)
        if (advice === null) return ''
        // stale = 用户没改、包里有新版：正确动作是 --upgrade，不是 --adopt。
        return advice.kind === 'update'
          ? '；契约类种子（policy=contract）包内已更新——运行 --upgrade'
          : advice.kind === 'drift' ? '；契约类种子（policy=contract）与包版本不同源——确认后 --adopt 建基线' : ''
      }
      const findingOf = new Map(audit.findings.map((item) => [item.rel, item]))
      const statusOf = (rel) => findingOf.get(rel)?.status ?? 'missing'
      const label = {
        current: 'current（与种子一致）',
        missing: 'missing（缺席）',
        deleted: 'deleted（安装后被删）',
        stale: 'stale（旧种子，可安全升级）',
        modified: 'modified（用户改过）',
        untracked: 'untracked（不是 scaffold 铺的种子）',
        special: 'special（目录/symlink/FIFO 等非普通文件）',
        unreadable: 'unreadable（不可读）',
      }
      const statusOk = (status, critical = true) => {
        if (status === 'current') return true
        if (status === 'modified' || status === 'stale') return null
        if (status === 'untracked' && !critical) return null
        return false
      }
      const manual = join(workspace, 'AGENTS.md')
      const manualStatus = statusOf('AGENTS.md')
      let manualLines = ''
      if (['current', 'modified', 'stale'].includes(manualStatus)) {
        try { manualLines = `（${readFileSync(manual, 'utf8').split('\n').length} 行）` } catch {}
      }
      record(statusOk(manualStatus), `研究工作区手册（${manual}）`,
        `${label[manualStatus] ?? manualStatus}${manualLines}${manualStatus === 'untracked' ? '——角色会拿到别的项目的指令，不能宣称研究就绪' : ''}${contractDrift('AGENTS.md')}`,
        seedRemedy)
      const nodesStatus = statusOf('NODES.md')
      record(statusOk(nodesStatus), `节点契约（${join(workspace, 'NODES.md')}）`, `${label[nodesStatus] ?? nodesStatus}${contractDrift('NODES.md')}`, seedRemedy)
      const patternsStatus = statusOf('question-patterns.md')
      record(statusOk(patternsStatus), `判型模式库（${join(workspace, 'question-patterns.md')}）`, `${label[patternsStatus] ?? patternsStatus}${contractDrift('question-patterns.md')}`, seedRemedy)
      const ignoreStatus = statusOf('.gitignore')
      record(statusOk(ignoreStatus, false), `工作区 .gitignore（${join(workspace, '.gitignore')}）`,
        `${label[ignoreStatus] ?? ignoreStatus}${ignoreStatus === 'untracked' ? '（保留用户规则，但 run 产物拒收未验证）' : ''}`, seedRemedy)
      const templateFindings = audit.findings.filter((item) => item.rel.startsWith('templates/run/'))
      const badTemplates = templateFindings.filter((item) => ['missing', 'deleted', 'untracked', 'special', 'unreadable'].includes(item.status))
      const tplCount = templateFindings.filter((item) => !['missing', 'deleted'].includes(item.status)).length
      // 模板与手册/NODES 同属契约类（D35）：被用户改过时也要点名，别让模板漂移静默。
      const templateAdvices = templateFindings.map((item) => seedPolicyAdvice(item.policy, item.status)).filter((a) => a !== null)
      const templateDrift = templateAdvices.some((a) => a.kind === 'update')
        ? '；模板属契约类（policy=contract）包内已更新——运行 --upgrade'
        : templateAdvices.some((a) => a.kind === 'drift') ? '；模板属契约类（policy=contract）且与包版本不同源——确认后 --adopt 建基线' : ''
      record(badTemplates.length === 0 && tplCount >= 6, `run 模板（${join(workspace, 'templates', 'run')}）`,
        `${tplCount} 个（期望 ≥6）${badTemplates.length > 0 ? `；问题：${badTemplates.map((item) => `${item.rel}=${item.status}`).join('、')}` : ''}${templateDrift}`, seedRemedy)

      const state = audit.state
      let seedVersionOk = null
      let seedVersionDetail = '未记录（旧工作区或未用 scaffold 铺过）'
      if (state !== null && typeof state.version === 'string') {
        seedVersionOk = state.version === pkg.version ? true : null
        const sidecars = audit.sidecars.length
        const orphans = audit.orphans.length
        seedVersionDetail = state.version === pkg.version
          ? `记录 v${state.version}（与 pack 一致）${sidecars > 0 ? `；${sidecars} 个未合并 .seed-new` : ''}${orphans > 0 ? `；${orphans} 个孤儿` : ''}`
          : `记录 v${state.version}；pack v${pkg.version}——运行 --upgrade`
      } else if (audit.findings.every((item) => item.status === 'current')) {
        seedVersionDetail = '无状态文件，但全部种子与当前 pack 一致（可运行 --upgrade 建基线）'
      }
      record(seedVersionOk, '工作区种子版本', seedVersionDetail, `node ${join(PACK, 'scripts', 'scaffold.mjs')} --workspace ${workspace} --check`)

      const methodPath = join(workspace, 'method-library.md')
      const hasMethod = existsSync(methodPath)
      record(hasMethod ? true : null, `方法库（${methodPath}）`,
        hasMethod ? '在场（用户数据，不校验内容）' : '缺席——观察面「我的偏好库」没有落盘文件；可手动建空架子或运行 scaffold --upgrade',
        `在 ${methodPath} 建空方法库骨架，或运行 scaffold --upgrade（不覆盖已存在文件）`)

      const named = new Set(['AGENTS.md', 'NODES.md', 'question-patterns.md', '.gitignore'])
      const uncovered = audit.blocking.filter((item) => !named.has(item.rel) && !item.rel.startsWith('templates/run/'))
      if (uncovered.length > 0) {
        record(false, '工作区种子完整性', `未覆盖的阻断种子：${uncovered.map((item) => `${item.rel}=${item.status}`).join('、')}`, seedRemedy)
      }
      for (const warning of audit.warnings.filter((item) => ['orphan', 'sidecar'].includes(item.kind))) {
        record(null, `工作区种子备注（${warning.kind}）`, `${warning.rel ?? ''}${warning.kind === 'sidecar' ? ' 待合并' : ' 不在当前清单'}`, '手动决定删除/合并；scaffold 不会自动删孤儿或覆盖 sidecar')
      }
    }
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
    const status = credentialStatus({
      env: process.env,
      dshHome: resolveDshHome(process.env),
      workspace,
      cwd: process.cwd(),
    })
    record(status.ok, '模型密钥 DEEPSEEK_API_KEY', status.detail,
      'export DEEPSEEK_API_KEY=<key>，或用 dsh 的凭据配置写入 $DSH_HOME/.credentials.yaml / home .env（chat / 搜索 / 抓取回退同一把钥匙）')
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
