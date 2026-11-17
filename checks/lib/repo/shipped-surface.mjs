// shipped-surface.mjs — 发布面自足判据的唯一正本（BUG-219…228 类级）。
//
// 为什么：仓内门禁的存在性 oracle 是**开发仓**——`doc-paths` / `call-surface` 对
// `checks/lib/shared/plan-card.mjs` 绿，因为开发仓里有它；tarball 里没有，但没有任何门禁看发布面。
// 于是「发布文本引用开发面」「发布集合不是公开合同的反投影」两类缺陷可以在 verify/test/pack.e2e
// 全绿的情况下发出去。本模块把发布面收成两条可证伪的判据：
//
//   ① 文本：随包文本（README / presets / content / scripts / workers / locale / src 注释 / 构建产物）
//      不得引用开发根（`checks/` `tests/` `tools/` `probes/` `_backlog/` `_dist/` `.agents/`）与
//      开发实例名（`research-workspace/`）；`docs/` `notes/` `runtime/` `vendor/` `snapshots/`
//      这类有自然语言歧义的词只认本仓真实子目录（`docs/design/` 是，`release notes/` 不是）。
//   ② 集合：`package.json files` = 显式允许集；`lib/types/**/*.d.ts` 集合 = `exports.*.types` 集合；
//      tarball 顶层 = 允许集。发布清单是公开合同的反投影，不是「目录全带 + 负模式」。
//
// 消费方：tests/checks/shipped-surface.test.mjs（keyless：扫随包源码文本 + manifest 不动量）
// 与 checks/smoke/pack.e2e.mjs（真 tarball：集合 + 构建产物文本）。纯函数、零 fs/子进程；
// 树遍历与 tarball 读取留在消费方。
//
// 显式边界：运行期词（`content/` `presets/` `lib/` `scripts/` `workers/` `locale*` `drt_`
// `research_pack_root` `@deepseek-ai/`）不是 dev 引用；README 的维护者折叠段（`<details>` 内）
// 是显式维护者语境，只约束用户段。

/** 无自然语言歧义的开发根：出现 `<root>/<segment>` 即 dev 引用。 */
export const FREE_DEV_ROOTS = Object.freeze(['checks', 'tests', 'tools', 'probes', '_backlog', '_dist', '.agents'])

/** 有自然语言歧义的开发根：只认本仓真实子目录（`release notes/` 不是路径）。 */
export const AMBIGUOUS_DEV_ROOTS = Object.freeze({
  docs: /^(?:design|guides|postmortem|decisions|terms|evaluation|project-map|00-index|AGENTS|external-materials|discipline-map)(?:[/.]|$)/,
  notes: /^(?:implemented|archived|proposed|rejected|README)(?:[/.]|$)/,
  runtime: /^(?:harness-home|smoke-workspace|ci-home|ci-state|build)(?:[/.]|$)/,
  vendor: /^dsh(?:[/.]|$)/,
  snapshots: /^(?:replay|README)(?:[/.]|$)/,
})

/** 开发实例名：不是「根/文件」形态，但同样只存在于开发仓（用户工作区是任意目录）。 */
const DEV_INSTANCE = /(?<![A-Za-z0-9_./-])research-workspace(?:\/|(?=[\s`'"）)]|$))/g
const PATH_TOKEN = new RegExp(
  `(?<![A-Za-z0-9_./-])((?:${[...FREE_DEV_ROOTS, ...Object.keys(AMBIGUOUS_DEV_ROOTS)].join('|')})/[A-Za-z0-9_./-]*)`,
  'g',
)

const tokenIsDevRef = (token) => {
  const [root, ...restParts] = token.split('/')
  const rest = restParts.join('/')
  if (root === 'research-workspace') return true
  if (rest === '') return false
  if (FREE_DEV_ROOTS.includes(root)) return true
  // 歧义根：只认本仓真实子目录，或根下直接的文件（docs/foo.md —— 避免把 release notes/ 当路径）。
  return AMBIGUOUS_DEV_ROOTS[root].test(rest) || /^[A-Za-z0-9_-]+\.(?:md|json|mjs|ts|sh)$/.test(rest)
}

/** 一段随包文本里的 dev 引用（[{ line: 1-based, ref }]）。 */
export function devRefsOf(text) {
  const out = []
  for (const [index, line] of String(text ?? '').split('\n').entries()) {
    const seen = new Set()
    for (const m of line.matchAll(PATH_TOKEN)) {
      if (!tokenIsDevRef(m[1]) || seen.has(m[1])) continue
      seen.add(m[1])
      out.push({ line: index + 1, ref: m[1] })
    }
    for (const m of line.matchAll(DEV_INSTANCE)) {
      if (seen.has(m[0])) continue
      seen.add(m[0])
      out.push({ line: index + 1, ref: m[0] })
    }
  }
  return out
}

/** 批扫随包文件：files = [{ path, text }]。 */
export function shippedTextIssues(files) {
  const issues = []
  for (const { path, text } of files) {
    for (const { line, ref } of devRefsOf(text)) issues.push(`${path}:${line} 随包文本引用开发面 ${ref}`)
  }
  return issues
}

/** README 用户段（`<details>` 折叠区之外）不得出现开发命令；维护者折叠段是显式例外。 */
export function readmeUserSectionIssues(text) {
  const withoutFolds = String(text ?? '').replace(/<details>[\s\S]*?<\/details>/g, (block) => block.replace(/[^\n]/g, ' '))
  const issues = []
  for (const { line, ref } of devRefsOf(withoutFolds)) issues.push(`README 用户段引用开发面 ${ref}（第 ${line} 行）`)
  const COMMAND = /(?:^|[\s`(（])(?:pnpm\s+(?:install|add|remove|exec|dlx|run|test|verify|build|pack|publish|link|unlink|update|why|list|outdated|store|env|config|setup)\b|npm\s+pack\b|node\s+(?:checks|tests|tools)\/|source\s+tools\/)/
  for (const [index, line] of withoutFolds.split('\n').entries()) {
    const m = COMMAND.exec(line)
    if (m) issues.push(`README 用户段出现开发命令「${m[0].trim()}」（第 ${index + 1} 行）——维护者动作放 <details> 折叠段`)
  }
  return issues
}

/** `exports.*.types` 的路径集合（去 `./` 前缀，posix 相对仓内 lib 根）。 */
export function typeEntryPathsOf(pkg) {
  return [...new Set(Object.values(pkg?.exports ?? {})
    .filter((value) => value && typeof value === 'object' && typeof value.types === 'string')
    .map((value) => value.types.replace(/^\.\//, '')))].sort()
}

/** `files` 必须显式列出每个公开类型入口，且不得用 `lib/**` / `lib/types/**` 这类广模式。 */
export function filesAllowlistIssues(pkg) {
  const files = Array.isArray(pkg?.files) ? pkg.files : []
  const positives = files.filter((entry) => typeof entry === 'string' && !entry.startsWith('!'))
  const issues = []
  for (const entry of positives) {
    if (entry === 'lib/**' || /^lib\/types\/\*\*/.test(entry) || /^lib\/types\/\*/.test(entry)) {
      issues.push(`files 的「${entry}」是广模式——公开类型面必须逐入口列出（发布清单 = exports.types 的反投影）`)
    }
  }
  const typeEntries = typeEntryPathsOf(pkg)
  if (typeEntries.length === 0) issues.push('exports 没有任何 *.types 入口——类型面合同缺席')
  for (const entry of typeEntries) {
    if (!positives.includes(entry)) issues.push(`files 缺公开类型入口 ${entry}（exports.types 声明了它）`)
  }
  const allowedLib = new Set(['lib/*.js', ...typeEntries])
  for (const entry of positives) {
    if (entry.startsWith('lib/') && !allowedLib.has(entry)) {
      issues.push(`files 的 lib 允许项「${entry}」不是入口（允许 = lib/*.js + ${typeEntries.length} 个 exports.types）`)
    }
  }
  return issues
}

/** 实际 tarball 里的 `.d.ts` 集合 vs exports.types：多/少都点名。 */
export function typeSetIssues(actualPaths, pkg) {
  const expected = new Set(typeEntryPathsOf(pkg))
  const actual = new Set(actualPaths.filter((p) => p.endsWith('.d.ts')))
  const issues = []
  for (const path of [...actual].sort()) if (!expected.has(path)) issues.push(`tarball 多出非公开类型文件 ${path}`)
  for (const path of [...expected].sort()) if (!actual.has(path)) issues.push(`tarball 缺公开类型入口 ${path}`)
  return issues
}

/** tarball 顶层允许集（README/LICENSE/package.json 由 npm 自动包含，显式登记）。 */
export const ALLOWED_TOP_LEVEL = Object.freeze([
  'LICENSE', 'README.md', 'README.zh.md', 'package.json', 'icon.svg', 'cordis.patch.yml',
  'content', 'presets', 'workers', 'scripts', 'lib',
  'locale', 'locale-content', 'locale-startup', 'locale-fetch-fallback', 'locale-method-library',
])

/** 顶层条目允许集判据（多/少都不静默：少由 pack.e2e 的必需件断言兜）。 */
export function topLevelIssues(entries) {
  const top = new Set(entries.map((entry) => entry.split('/')[0]))
  return [...top].filter((name) => !ALLOWED_TOP_LEVEL.includes(name)).sort()
    .map((name) => `tarball 顶层出现未登记条目 ${name}（允许集 = ${ALLOWED_TOP_LEVEL.join(' / ')}）`)
}
