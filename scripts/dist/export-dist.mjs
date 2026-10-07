#!/usr/bin/env node
// export-dist.mjs — 一条命令出完整交付：tarball + 安装手册 → _dist/。
// 精神移植自 ai_dsh_architect scripts/export-dist.mjs（docs/distribution.md 的导出合同）：
//   ① 手册是**生成物**不是手写物——版本/日期/条目数在导出时注入，手册与旁边的 tarball 不能漂移；
//   ② 打包步骤 = release-smoke 每轮证明的同一条 `npm pack`（cache 钉进仓库 gitignored 区，
//      工具态纪律：npm 不碰 ~/.npm）；inventory 在导出的产物本体上重申发布边界；
//   ③ 手册正文每一步都走 release-smoke 验证过的路径（add → dump-config → scaffold → preflight），
//      是被证明过的顺序，不是设想；
//   ④ _dist/ 是导出目的地，不是源——tarball gitignored，手册是唯一 tracked 例外
//      （verify 门禁 dist-manual-version 钉版本一致：版本动 → 必须同 diff 重导出）。
// 导出不是发布：不动版本、不跑自带门禁之外的面、不发布任何东西——打包的是当下工作树的 pack。
//
// 用法：node scripts/export-dist.mjs

import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const DIST = join(ROOT, '_dist')
const MANUAL = '安装手册.md'

const failed = []
const report = (name, ok, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed.push(name)
}

try {
  const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
  const version = pkg.version
  const tarballName = `dsh-deep-research-pack-${version}.tgz`

  // 全新导出：只清本脚本自己的既有产物，不碰放进 _dist/ 的其他东西。
  mkdirSync(DIST, { recursive: true })
  for (const name of readdirSync(DIST)) {
    if (name === MANUAL || /^dsh-deep-research-pack-.*\.tgz$/.test(name)) {
      rmSync(join(DIST, name), { force: true })
    }
  }

  // 1. 打包——release-smoke 逐轮证明的同一条 npm pack（cache 进 scratch，npm 不碰 ~/.npm）
  const scratch = mkdtempSync(join(tmpdir(), 'dsh-export-dist-'))
  const packed = spawnSync('npm', ['pack', '--pack-destination', DIST, '--cache', join(scratch, 'npm-cache')], {
    cwd: PACK, encoding: 'utf8',
  })
  rmSync(scratch, { recursive: true, force: true })
  const packedName = (packed.stdout ?? '').trim().split('\n').filter(Boolean).pop()
  report('npm pack', packed.status === 0 && packedName === tarballName,
    `exit ${packed.status}, ${packedName ?? '无 tarball'}${(packed.stderr ?? '').trim() ? `：${packed.stderr.trim().split('\n')[0]}` : ''}`)

  // 2. inventory——发布边界在导出的产物本体上重申：必备条目在场、四角色 preset 随包、
  //    工作区种子与部署 bin 随包、tarball 里没有 package/ 之外的东西
  const tarball = join(DIST, tarballName)
  const listed = spawnSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
  const entries = (listed.stdout ?? '').split('\n').filter(Boolean)
  const must = [
    'package/cordis.patch.yml',
    'package/README.md',
    'package/package.json',
    'package/lib/index.js',
    'package/lib/client.js',
    'package/workspace/AGENTS.md',
    'package/scripts/preflight.mjs',
    'package/scripts/scaffold.mjs',
  ]
  const missing = must.filter((entry) => !entries.includes(entry))
  const presetRows = entries.filter((e) => /^package\/presets\/[a-z]+\.patch\.yml$/.test(e)).length
  const skills = entries.filter((e) => e.endsWith('/SKILL.md')).length
  const templates = entries.filter((e) => e.startsWith('package/workspace/templates/')).length
  const outside = entries.filter((e) => !e.startsWith('package/'))
  report('inventory',
    listed.status === 0 && missing.length === 0 && outside.length === 0 && presetRows >= 4 && skills > 0 && templates > 0,
    missing.length > 0 ? `缺：${missing.join(', ')}`
      : outside.length > 0 ? `package/ 之外的条目：${outside.join(', ')}`
        : `${entries.length} 条目，preset 行 ${presetRows}，skill ${skills}，模板 ${templates}`)

  // 3. 手册——版本/日期/条目数注入，让它指名它旁边这份产物；步骤 = release-smoke 的路径
  const date = new Date().toISOString().slice(0, 10)
  const manual = `# dsh-deep-research-pack 手动安装手册

| | |
|---|---|
| 版本 | ${version} |
| 安装包 | \`${tarballName}\`（与本手册同目录） |
| 打包日期 | ${date} |
| 验证基线 | DSH \`dsh-v0.2.0-rc.2\`（Node ≥ 22.19） |

这个安装包是自包含的：bundle 行（cordis.patch.yml）、四角色 preset 与六个方法论技能（presets/）、
研究驾驶舱浏览器端（lib/）、工作区种子（workspace/）、部署 bin（scripts/）、README，共
${entries.length} 个条目 —— 不需要 npm registry，不需要克隆仓库，拿到这一个文件就能装。下面每一步
都与仓库的发布冒烟（release-smoke）每轮自动验证的路径一致，是被证明过的顺序，不是设想。

## 一、安装

\`\`\`sh
# ① 建 profile——自定义名默认只带 dsh-base（起不了 web，也就没有图形界面）；须先取 web 模板。
#    这一步只需第一次；profile 已存在就跳过。\`web\` = DSH 出厂模板，不读你本地同名 profile。
dsh --profile research --from-default-profile web --dump-config

# ② 装本包（本包 private，未发布 registry——必须给 tarball 的 file: 形态，且必须**绝对路径**：
#    \`file:\` 的相对路径按 profile 目录解析，不是你的 cwd）
dsh plugin --profile research add file:/path/to/${tarballName}
\`\`\`

（本文一律以 \`research\` 为例；换名字——例如隔离试用 \`try-research\`、不动日常环境——把命令里
的 \`research\` 换成它即可。）

## 二、验证安装

\`\`\`sh
dsh --profile research --dump-config
\`\`\`

输出里应能看到四样东西：

- \`id: preset-lead\`（以及 preset-scout / preset-analyst / preset-critic）——四角色 preset；
- \`id: tool-present\` —— HITL 选项卡工具行；
- \`id: ui-agent-team\` —— 团队协作通道的可视面；
- \`id: research-client\` —— 研究驾驶舱（浏览器端）的挂载行。

## 三、铺研究工作区（角色的纪律从 cwd 注入，缺这步角色没有证据契约）

\`\`\`sh
node ~/.dsh/profiles/research/node_modules/dsh-deep-research-pack/scripts/scaffold.mjs \\
  --workspace ~/research-workspace --profile research
\`\`\`

它会铺工作区种子（研究手册 AGENTS.md + run 模板）、确保团队机制层在场，并跑前置检查。
脚本用 PATH 上的 \`dsh\`，写哪个 home 由 \`DSH_HOME\` 决定——装日用 DSH 时**别先** source 开发
环境的 env.sh。随时可单独复检：

\`\`\`sh
node ~/.dsh/profiles/research/node_modules/dsh-deep-research-pack/scripts/preflight.mjs \\
  --workspace ~/research-workspace
\`\`\`

## 四、跑一场研究

\`\`\`sh
cd ~/research-workspace && dsh --profile research
\`\`\`

对 Lead 说出研究问题即进 HITL1 立项；这一步拉起该 profile 的 web 应用并打印
\`http://127.0.0.1:<port>/?token=…\`（每次启动 token 都不同，旧 URL 作废）——用浏览器打开它，
研究过程中右栏出现「研究状态」页签（改插件内容后要重启这个 profile 才生效：浏览器刷新本身
不加载新模块，还需硬刷新 ⌘⇧R）。

## 五、卸载（干净，无残留）

\`\`\`sh
dsh plugin --profile research remove dsh-deep-research-pack
\`\`\`

卸载后 \`--dump-config\` 不再提及插件，profile 的 package.json 也不留痕迹 —— 这同样是冒烟
每轮验证过的。

## 常见问题

| 现象 | 原因与处理 |
|---|---|
| 「研究状态」页签没出现 | 浏览器刷新不加载新模块：重启 \`dsh web\`，再硬刷新页面 |
| 角色不守证据纪律 | 会话必须建在 scaffold 铺过的工作区里（手册从 cwd 注入），见第三节 |
| preflight 报团队机制层缺席 | \`dsh plugin --profile research add @deepseek-ai/dsh-experimental-agent-team-profile\` |
| 想确认装了什么版本 | \`dsh plugin --profile research list\`，或看本手册表头的版本号 |
`
  writeFileSync(join(DIST, MANUAL), manual)
  report('手册写入', true, `${MANUAL} — 版本 ${version}，${date}`)

  console.log('\n_dist/ 内容：')
  for (const name of readdirSync(DIST).sort()) console.log(`  ${name}`)
} catch (error) {
  report('意外失败', false, String(error))
}

if (failed.length > 0) {
  console.log(`\nexport-dist: ${failed.length} 步失败`)
  process.exit(1)
}
console.log('\nexport-dist: 全绿')
