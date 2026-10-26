#!/usr/bin/env node
// export-dist.mjs — 一条命令出完整交付：tarball + 安装手册 → _dist/。
// 精神移植自 ai_dsh_architect scripts/dist/export-dist.mjs（docs/distribution.md 的导出合同）：
//   ① 手册是**生成物**不是手写物——版本/日期/条目数在导出时注入，手册与旁边的 tarball 不能漂移；
//   ② 打包步骤 = release-smoke 每轮证明的同一条 `npm pack`（cache 钉进仓库 gitignored 区，
//      工具态纪律：npm 不碰 ~/.npm）；inventory 在导出的产物本体上重申发布边界；
//   ③ 手册正文每一步都走 release-smoke 验证过的路径（add → dump-config → scaffold → preflight），
//      是被证明过的顺序，不是设想；
//   ④ _dist/ 是导出目的地，不是源——tarball gitignored，手册是唯一 tracked 例外
//      （verify 门禁 dist-manual-version 钉版本一致：版本动 → 必须同 diff 重导出）。
// 导出不是发布：不动版本、不跑自带门禁之外的面、不发布任何东西——打包的是当下工作树的 pack。
//
// 用法：node scripts/dist/export-dist.mjs

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localDateStr } from '../lib/local-date.mjs'

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
  const dshEngine = pkg.engines?.dsh ?? pkg.dsh?.compatibility?.dshReleases?.[0]?.replace(/^dsh-v/, '') ?? '（缺）'
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
  const tarballSha = createHash('sha256').update(readFileSync(tarball)).digest('hex')
  const listed = spawnSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
  const entries = (listed.stdout ?? '').split('\n').filter(Boolean)
  const must = [
    'package/LICENSE',
    'package/cordis.patch.yml',
    'package/README.md',
    'package/package.json',
    'package/lib/index.js',
    'package/lib/client.js',
    'package/workspace/AGENTS.md',
    'package/workspace/.gitignore.example',
    'package/workspace/seed.json',
    'package/scripts/lib/seed-core.mjs',
    'package/scripts/lib/version-range.mjs',
    'package/scripts/preflight.mjs',
    'package/scripts/scaffold.mjs',
  ]
  const missing = must.filter((entry) => !entries.includes(entry))
  // 种子清单在导出时再核一次：版本 = pack 版本，文件映射非空。清单随包但内容错 = 安装方
  // 拿到无法升级的种子（scaffold 会 fail-loud，但发布面应在导出时就红）。
  const seedManifest = JSON.parse(readFileSync(join(PACK, 'workspace', 'seed.json'), 'utf8'))
  const seedOk = seedManifest.version === version && Object.keys(seedManifest.files ?? {}).length > 0
  // 发布边界：lib/types 下的 JS 与 sourcemap 是构建中间产物，不是运行时；进包即用户装垃圾。
  const forbidden = entries.filter((entry) => /^package\/lib\/types\/.*\.(?:js|map)$/.test(entry))
  const presetRows = entries.filter((e) => /^package\/presets\/[a-z]+\.patch\.yml$/.test(e)).length
  const skills = entries.filter((e) => e.endsWith('/SKILL.md')).length
  const templates = entries.filter((e) => e.startsWith('package/workspace/templates/')).length
  const outside = entries.filter((e) => !e.startsWith('package/'))
  report('inventory',
    listed.status === 0 && missing.length === 0 && forbidden.length === 0 && outside.length === 0 && presetRows >= 4 && skills > 0 && templates > 0 && seedOk,
    missing.length > 0 ? `缺：${missing.join(', ')}`
      : forbidden.length > 0 ? `构建中间产物进包：${forbidden.slice(0, 5).join(', ')}${forbidden.length > 5 ? '…' : ''}（改 package.json files 排除）`
      : outside.length > 0 ? `package/ 之外的条目：${outside.join(', ')}`
        : !seedOk ? `seed.json 版本/映射不合法（version=${seedManifest.version}）`
          : `${entries.length} 条目，preset 行 ${presetRows}，skill ${skills}，模板 ${templates}，seed v${seedManifest.version}`)

  // 3. 手册——版本/日期/条目数注入，让它指名它旁边这份产物；步骤 = release-smoke 的路径
  //    日期 = 本地口径（人读日期行；UTC slice 在 00:00–08:00 窗口差一天——BUG-017 同款口径纪律）
  const date = localDateStr()
  const manual = `# dsh-deep-research-pack 手动安装手册

| | |
|---|---|
| 版本 | ${version} |
| 安装包 | \`${tarballName}\`（与本手册同目录） |
| 打包日期 | ${date} |
| sha256 | \`${tarballSha}\` |
| 验证基线 | DSH \`engines.dsh\`（当前 \`${dshEngine}\`；不匹配时宿主拒绝加载）+ Node \`^22.19.0 || >=24.0.0\` |

这个安装包携带本包运行所需的文件：bundle 行（cordis.patch.yml）、角色 preset 与方法论技能（presets/）、
研究驾驶舱浏览器端（lib/）、工作区种子（workspace/）、部署 bin（scripts/）、README 与 LICENSE，共
${entries.length} 个条目。tarball 形态不需要克隆仓库，也不需要为本包访问 registry；但 DSH 本体、
团队机制层（registry 或预装）与 Playwright MCP（npx 首次拉取）仍是外部前置。
下面每一步都与仓库的发布冒烟（release-smoke）每轮自动验证的路径一致，是被证明过的顺序，不是设想。

## 一、安装

\`\`\`sh
# ① 建 profile——自定义名默认只带 dsh-base（起不了 web，也就没有图形界面）；须先取 web 模板。
#    这一步只需第一次；profile 已存在就跳过。\`web\` = DSH 出厂模板，不读你本地同名 profile。
dsh --profile research --from-default-profile web --dump-config

# ② 装包（两种形态，任选其一）：
#    npm（推荐；包发布后可用）：dsh plugin --profile research add dsh-deep-research-pack
#    离线 / 未发布时：tarball 必须给 file: 形态，且必须**绝对路径**
#    （\`file:\` 的相对路径按 profile 目录解析，不是你的 cwd）
dsh plugin --profile research add file:/path/to/${tarballName}
\`\`\`

（本文一律以 \`research\` 为例；换名字——例如隔离试用 \`try-research\`、不动日常环境——把命令里
的 \`research\` 换成它即可。）

## 二、验证安装

\`\`\`sh
dsh --profile research --dump-config
\`\`\`

输出里应能看到五样东西：

- \`id: preset-lead\`（以及 preset-scout / preset-analyst / preset-critic）——四角色 preset；
- \`id: tool-present\` —— HITL 选项卡工具行；
- \`id: ui-agent-team\` —— 团队协作通道的可视面；
- \`id: research-client\` —— 研究驾驶舱（浏览器端）的挂载行；
- \`id: session-query-sqlite\` —— 会话内检索（SQLite，首次搜索时打开）。

## 三、铺研究工作区（角色的纪律从 cwd 注入，缺这步角色没有证据契约）

\`\`\`sh
node ~/.dsh/profiles/research/node_modules/dsh-deep-research-pack/scripts/scaffold.mjs \\
  --workspace ~/research-workspace --profile research
\`\`\`

它会铺工作区种子（研究手册 AGENTS.md + run 模板）、写种子状态（\`.dsh-research-seed.json\`）、
确保团队机制层在场，并跑前置检查。脚本用 PATH 上的 \`dsh\`，写哪个 home 由 \`DSH_HOME\` 决定——
装日用 DSH 时**别先** source 开发环境的 env.sh。随时可单独复检：

\`\`\`sh
node ~/.dsh/profiles/research/node_modules/dsh-deep-research-pack/scripts/preflight.mjs \\
  --workspace ~/research-workspace
\`\`\`

### 升级工作区种子

pack 升级后，先只读检查再安全升级：

\`\`\`sh
node ~/.dsh/profiles/research/node_modules/dsh-deep-research-pack/scripts/scaffold.mjs \\
  --workspace ~/research-workspace --check
node ~/.dsh/profiles/research/node_modules/dsh-deep-research-pack/scripts/scaffold.mjs \\
  --workspace ~/research-workspace --upgrade
\`\`\`

\`--upgrade\` 只覆盖“用户未改过且种子已更新”的文件；改过的文件保留原样，新种子写成
\`<文件>.seed-new\` 供手动合并。\`method-library.md\` 是用户数据，任何模式都不覆盖已存在文件。
只处理工作区、不碰 profile：加 \`--seed-only\`。
没有模型 key 时加 \`--install-only\`：只验安装形状，不把“无 key”当安装失败。

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

## 六、升级 / 回滚

升级插件（npm 或同目录的新 tarball，任选其一）：

\`\`\`sh
dsh plugin --profile research add dsh-deep-research-pack@<新版>
dsh plugin --profile research add file:/path/to/dsh-deep-research-pack-<新版>.tgz
\`\`\`

升级后 \`dsh --profile research --dump-config\` 应仍见四角色与本包行；随后用 scaffold 检查并安全升级工作区种子：

\`\`\`sh
node ~/.dsh/profiles/research/node_modules/dsh-deep-research-pack/scripts/scaffold.mjs \\
  --workspace ~/research-workspace --check
node ~/.dsh/profiles/research/node_modules/dsh-deep-research-pack/scripts/scaffold.mjs \\
  --workspace ~/research-workspace --upgrade
\`\`\`

回滚 = 装回旧版 tarball；工作区种子不回滚（用户数据与方法库不随插件降级）。旧版检查会报“工作区记录比 pack 新”并拒绝 --upgrade；确需降级工作区种子用 --force（显式覆盖，新种子会丢）。
DSH 本体版本必须满足旧包的 \`engines.dsh\`，否则宿主拒绝加载。

## 七、离线 / 受限网络

| 依赖 | 是否离线可用 | 说明 |
|---|---|---|
| DSH 本体 | 需预装 | 本包不装 DSH |
| 本包 tarball | 是 | 本手册同目录的文件，不需要 registry |
| 团队机制层 | 需预置或缓存 | \`@deepseek-ai/dsh-experimental-agent-team-profile@<运行中的 DSH 版本>\`；scaffold 会按 profile 的 app-boot 解析。只预装 node_modules 不够：pnpm registry metadata/cache 也要在，否则冷 store 会报 \`ERR_PNPM_NO_OFFLINE_META\` |
| Playwright MCP | 可关闭或预缓存 | 默认 npx 首次拉取；离线时设 \`MCP_PLAYWRIGHT=0\`（通道启动脚本）或预置 npm 缓存 |
| 模型 API | 需网络 | 研究 run 需要 DeepSeek API 可达 |

## 常见问题

| 现象 | 原因与处理 |
|---|---|
| 「研究状态」页签没出现 | 浏览器刷新不加载新模块：重启 \`dsh web\`，再硬刷新页面 |
| 角色不守证据纪律 | 会话必须建在 scaffold 铺过的工作区里（手册从 cwd 注入），见第三节 |
| preflight 报团队机制层缺席 | 重跑 scaffold（按 profile 的 app-boot 解析运行版本）；或手工 \`dsh plugin --profile research add @deepseek-ai/dsh-experimental-agent-team-profile@<运行中的 DSH 版本>\` |
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
