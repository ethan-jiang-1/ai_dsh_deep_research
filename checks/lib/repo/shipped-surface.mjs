// shipped-surface.mjs — 发布面自足判据的唯一正本（BUG-219…239 类级）。
//
// 为什么：仓内门禁的存在性 oracle 是**开发仓**——`doc-paths` / `call-surface` 对
// `checks/lib/shared/plan-card.mjs` 绿，因为开发仓里有它；tarball 里没有，但没有任何门禁看发布面。
// 本模块把发布面收成三条可证伪判据：
//
//   ① 文本：随包文本不得引用开发根（`checks/` `tests/` `tools/` `probes/` `_backlog/` `_dist/`
//      `.agents/`）与开发实例名（`research-workspace`）。路径 token 先归一（`./` `../` 前导 `/`
//      反斜杠）再判根——前缀不能成为绕过（BUG-230）；裸根按开发根闭集判。`docs/` `notes/`
//      `runtime/` `vendor/` `snapshots/` 这类有自然语言歧义的词只认本仓真实子目录
//      （`docs/design/` 是，`release notes/` 不是）；绝对 URL 是外部导航，不按包内路径判。
//   ② 集合：`files` = 发布允许集；`lib/types/**/*.d.ts` = `exports.*.types` 的**可达相对闭包**
//      （入口本身带相对 import；只带入口会让消费者 TS2307，BUG-239）；tarball 顶层 = 允许集。
//   ③ 源侧覆盖：keyless 扫描集由 `files` 允许集派生（不再手工挑目录，BUG-231），并由 pack.e2e
//      断言「发布文本集 ⊆ 源侧扫描集」。
//
// 消费方：tests/checks/repo/shipped-surface.test.mjs（keyless：随包源码文本 + manifest 不动量）
// 与 checks/smoke/pack.e2e.mjs（真 tarball：集合 + 构建产物文本）。纯函数、零 fs/子进程；
// 树遍历、声明读取与 tarball 读取由消费方注入。
//
// 显式边界：运行期词（`content/` `presets/` `lib/` `scripts/` `workers/` `locale*` `drt_`
// `research_pack_root` `@deepseek-ai/`）不是 dev 引用；README 的维护者折叠段（`<details>` 内）
// 是显式维护者语境，只约束用户段。

import { posix } from 'node:path'

/** 无自然语言歧义的开发根：出现 `<root>/`（含裸根）即 dev 引用。 */
export const FREE_DEV_ROOTS = Object.freeze(['checks', 'tests', 'tools', 'probes', '_backlog', '_dist', '.agents', 'src', 'packages'])

/** 有自然语言歧义的开发根：只认本仓真实子目录（`release notes/` 不是路径）。 */
export const AMBIGUOUS_DEV_ROOTS = Object.freeze({
  docs: /^(?:contracts|guides|reference|assets|README|AGENTS|architecture|decisions|testing|policy|design|postmortem|terms|evaluation|project-map|00-index|external-materials|discipline-map)(?:[/.]|$)/,
  notes: /^(?:implemented|archived|proposed|rejected|README)(?:[/.]|$)/,
  runtime: /^(?:harness-home|smoke-workspace|ci-home|ci-state|build)(?:[/.]|$)/,
  vendor: /^dsh(?:[/.]|$)/,
  snapshots: /^(?:replay|README)(?:[/.]|$)/,
})

const ALL_ROOTS = [...FREE_DEV_ROOTS, ...Object.keys(AMBIGUOUS_DEV_ROOTS)]
// token 根 = 开发根 + 开发实例名；**必须带 `/`**（裸词 `tools` 是自然语言，不是路径）。
// 前缀（`./` `../` 前导 `/`）进入捕获组：归一后再判根，前缀不能成为绕过。
const TOKEN_ROOTS = [...ALL_ROOTS, 'research-workspace']
const PATH_TOKEN = new RegExp(
  `(?<![A-Za-z0-9_-])((?:\\.{1,2}\\/)*\\/?(?:${TOKEN_ROOTS.join('|')})\\/[A-Za-z0-9_.\\/-]*)`,
  'g',
)
const DEV_INSTANCE = /(?<![A-Za-z0-9_./-])research-workspace(?![A-Za-z0-9_])/g

/** 归一一条路径 ref：反斜杠 → `/`，剥 `./` `../` 链与前导 `/`。 */
export function normalizeRef(raw) {
  return String(raw).replace(/\\/g, '/').replace(/^(?:\.{1,2}\/)+/, '').replace(/^\/+/, '')
}

const tokenIsDevRef = (token) => {
  const [root, ...restParts] = token.split('/')
  const rest = restParts.join('/')
  if (root === 'research-workspace') return true
  if (FREE_DEV_ROOTS.includes(root)) return true
  if (rest === '') return false // 歧义根的裸目录名是讨论，不是引用
  // 歧义根：只认本仓真实子目录，或根下直接的文件（docs/foo.md —— 避免把 release notes/ 当路径）。
  return AMBIGUOUS_DEV_ROOTS[root].test(rest) || /^[A-Za-z0-9_-]+\.(?:md|json|mjs|ts|sh)$/.test(rest)
}

/** 一段随包文本里的 dev 引用（[{ line: 1-based, ref }]，ref 已归一）。 */
export function devRefsOf(text) {
  const out = []
  for (const [index, line0] of String(text ?? '').split('\n').entries()) {
    // 绝对 URL 是外部导航（模型/用户点开的是浏览器），不按包内路径判。
    const line = line0.replace(/https?:\/\/\S+/g, ' ').replace(/\\/g, '/')
    const seen = new Set()
    for (const m of line.matchAll(PATH_TOKEN)) {
      const ref = normalizeRef(m[1])
      if (!tokenIsDevRef(ref) || seen.has(ref)) continue
      seen.add(ref)
      out.push({ line: index + 1, ref })
    }
    for (const m of line.matchAll(DEV_INSTANCE)) {
      const ref = m[0]
      if (seen.has(ref)) continue
      seen.add(ref)
      out.push({ line: index + 1, ref })
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

/** 发布文本扩展名（与 pack.e2e 的扫描面同源）。 */
export const SHIPPED_TEXT_EXT = /\.(?:md|mjs|cjs|js|ts|tsx|json|ya?ml)$/

/** 最小 glob：`dir/**`、`dir/*.ext`、精确路径（覆盖本仓 `files` 用到的全部形态）。 */
export function matchesFilesPattern(rel, pattern) {
  const p = pattern.replace(/^!/, '')
  if (p.endsWith('/**')) {
    const base = p.slice(0, -3)
    return rel === base || rel.startsWith(`${base}/`)
  }
  if (p.includes('*')) {
    const re = new RegExp(`^${p.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')}$`)
    return re.test(rel)
  }
  return rel === p
}

/** `files` 允许集判定（正/负模式；npm 自动包含的 README/LICENSE/package.json 也显式列在 files 里）。 */
export function isShippedFile(rel, pkg) {
  const entries = Array.isArray(pkg?.files) ? pkg.files : []
  const positive = entries.filter((entry) => !entry.startsWith('!'))
  const negative = entries.filter((entry) => entry.startsWith('!'))
  return positive.some((p) => matchesFilesPattern(rel, p)) && !negative.some((p) => matchesFilesPattern(rel, p))
}

/**
 * 源侧扫描集：由 `files` 允许集派生（排除构建产物 `lib/`，它由 pack.e2e 在真 tarball 上扫）。
 * allFiles = 仓内相对路径清单（消费方遍历提供）；返回值可直接喂 shippedTextIssues。
 */
export function shippedSourceFilesOf(pkg, allFiles) {
  return allFiles
    // package.json 的 repository.directory 是 npm 元数据契约（指向本包在仓库中的位置），
    // 不是 agent 可读的路径指令；机器清单由 files/exports 判据负责，不做散文扫描。
    .filter((rel) => rel !== 'package.json')
    .filter((rel) => !rel.startsWith('lib/') && SHIPPED_TEXT_EXT.test(rel) && isShippedFile(rel, pkg))
    .sort()
}

/** `exports.*.types` 的入口路径（去 `./` 前缀）。 */
export function typeEntryPathsOf(pkg) {
  return [...new Set(Object.values(pkg?.exports ?? {})
    .filter((value) => value && typeof value === 'object' && typeof value.types === 'string')
    .map((value) => value.types.replace(/^\.\//, '')))].sort()
}

const resolveTypeSpecifier = (fromRel, spec, exists) => {
  const base = posix.normalize(posix.join(posix.dirname(fromRel), spec))
  const candidates = [base]
  if (/\.tsx?$/.test(base)) candidates.push(base.replace(/\.tsx?$/, '.d.ts'))
  if (/\.js$/.test(base)) candidates.push(base.replace(/\.js$/, '.d.ts'))
  candidates.push(`${base}.d.ts`, `${base}/index.d.ts`)
  return candidates.find((candidate) => exists(candidate))
}

/**
 * 公开类型面的**可达相对闭包**：从 exports.types 入口出发，沿相对 import 递归
 * （`.ts`/`.js` specifier 归一为 `.d.ts`；无扩展名试 `.d.ts` 与 `index.d.ts`）。
 * read/exists 由消费方注入（keyless 测试可注入内存树；pack.e2e 读盘）。
 */
export function typeClosureOf(pkg, { read, exists }) {
  const entries = typeEntryPathsOf(pkg)
  const seen = new Set()
  const unresolved = []
  const queue = [...entries]
  while (queue.length > 0) {
    const rel = queue.pop()
    if (seen.has(rel)) continue
    if (!exists(rel)) { unresolved.push(rel); continue }
    seen.add(rel)
    for (const m of read(rel).matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
      const target = resolveTypeSpecifier(rel, m[1], exists)
      if (target === undefined) unresolved.push(`${rel} → ${m[1]}`)
      else queue.push(target)
    }
  }
  return { entries, files: [...seen].sort(), unresolved }
}

/**
 * `files` 必须逐条列出每个公开类型文件（入口 + 闭包），且不得用 `lib/**` / `lib/types/**` 这类广模式。
 * typeClosure 缺省 = 入口集合（兼容无构建产物的场景）；调用方应传 typeClosureOf(...).files。
 * @param {any} pkg
 * @param {{ typeClosure?: string[] }} [opts]
 */
export function filesAllowlistIssues(pkg, { typeClosure } = {}) {
  const files = Array.isArray(pkg?.files) ? pkg.files : []
  const positives = files.filter((entry) => typeof entry === 'string' && !entry.startsWith('!'))
  const issues = []
  for (const entry of positives) {
    if (entry === 'lib/**' || /^lib\/types\/\*\*/.test(entry) || /^lib\/types\/\*/.test(entry)) {
      issues.push(`files 的「${entry}」是广模式——公开类型面必须逐文件列出（发布清单 = exports.types 可达闭包的反投影）`)
    }
  }
  const typeEntries = typeEntryPathsOf(pkg)
  if (typeEntries.length === 0) issues.push('exports 没有任何 *.types 入口——类型面合同缺席')
  const expectedTypes = typeClosure ?? typeEntries
  for (const entry of expectedTypes) {
    if (!positives.includes(entry)) issues.push(`files 缺公开类型文件 ${entry}（exports.types 可达闭包成员）`)
  }
  if (typeClosure === undefined) {
    issues.push('类型闭包未提供——入口带相对 import 时会漏发依赖（BUG-239）；调用方须传 typeClosureOf(...).files')
  }
  const allowedLib = new Set(['lib/*.js', ...expectedTypes])
  for (const entry of positives) {
    if (entry.startsWith('lib/') && !allowedLib.has(entry)) {
      issues.push(`files 的 lib 允许项「${entry}」不是入口/闭包成员（允许 = lib/*.js + ${expectedTypes.length} 个类型文件）`)
    }
  }
  return issues
}

/** 实际 tarball 里的 `.d.ts` 集合 vs 期望闭包：多/少都点名。 */
export function typeSetIssues(actualPaths, expectedPaths) {
  const expected = new Set(expectedPaths)
  const actual = new Set(actualPaths.filter((p) => p.endsWith('.d.ts')))
  const issues = []
  for (const path of [...actual].sort()) if (!expected.has(path)) issues.push(`tarball 多出非公开类型文件 ${path}`)
  for (const path of [...expected].sort()) if (!actual.has(path)) issues.push(`tarball 缺公开类型文件 ${path}`)
  return issues
}

/** tarball 顶层允许集（README/LICENSE/package.json 由 npm 自动包含，显式登记）。 */
export const ALLOWED_TOP_LEVEL = Object.freeze([
  'LICENSE', 'README.md', 'README.zh.md', 'package.json', 'icon.svg', 'cordis.patch.yml',
  'content', 'presets', 'workers', 'scripts', 'lib',
  'locale', 'locale-content', 'locale-startup', 'locale-fetch-fallback', 'locale-method-library', 'locale-defaults',
])

/** 顶层条目允许集判据（多/少都不静默：少由 pack.e2e 的必需件断言兜）。 */
export function topLevelIssues(entries) {
  const top = new Set(entries.map((entry) => entry.split('/')[0]))
  return [...top].filter((name) => !ALLOWED_TOP_LEVEL.includes(name)).sort()
    .map((name) => `tarball 顶层出现未登记条目 ${name}（允许集 = ${ALLOWED_TOP_LEVEL.join(' / ')}）`)
}

/** 从 pkg.exports 派生全部运行时 JS 产物路径（lib/*.js，按字母序去重）。 */
export function runtimeJsPathsOf(pkg) {
  const out = new Set()
  for (const spec of Object.values(pkg?.exports ?? {})) {
    const target = typeof spec === 'string' ? spec : spec?.default
    if (typeof target === 'string' && /^\.\/lib\/[^/]+\.js$/.test(target)) {
      out.add(target.slice(2))
    }
  }
  return [...out].sort()
}

/** 从随包 YAML 文本派生全部被挂载引用的本包 specifier（根包名 + 各子路径）。 */
export function packSpecifiersOf(yamlTexts, packName = 'dsh-deep-research-pack') {
  const escaped = packName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^\\s*name:\\s*['"]?(${escaped}(?:\\/[a-z0-9-]+)?)['"]?\\s*$`, 'gm')
  const specs = new Set()
  for (const text of yamlTexts ?? []) {
    for (const m of String(text ?? '').matchAll(re)) specs.add(m[1])
  }
  return [...specs].sort()
}

/** 从随包 YAML 文本派生本包新增（`- insert:` 顶层行）的全部行 ID（不含 preset 内嵌 plugins 子列表）。 */
export function insertedRowIdsOf(yamlTexts) {
  const ids = []
  const seen = new Set()
  for (const text of yamlTexts ?? []) {
    const lines = String(text ?? '').split('\n')
    let inInsert = false
    for (const line of lines) {
      if (/^- insert:\s*$/.test(line)) { inInsert = true; continue }
      if (/^- /.test(line)) { inInsert = false; continue }
      if (!inInsert) continue
      const m = /^ {4}- id:\s*([a-z0-9-]+)\s*$/.exec(line)
      if (m !== null && !seen.has(m[1])) {
        seen.add(m[1])
        ids.push(m[1])
      }
    }
  }
  return ids
}

/**
 * 为每个本包 specifier 派生宿主 `readPluginMeta` 所需的 exports 键与对应 locale 目录。
 * @param {string[]} specifiers
 * @param {any} pkg
 * @param {string} [packName]
 */
export function displayMetaTargetsOf(specifiers, pkg, packName = 'dsh-deep-research-pack') {
  const exportsMap = pkg?.exports ?? {}
  return (specifiers ?? []).map((spec) => {
    const sub = spec === packName ? '' : spec.slice(packName.length)
    const localeKey = `.${sub}/locale/*.json`
    const iconKey = `.${sub}/icon`
    const rawTarget = typeof exportsMap[localeKey] === 'string' ? exportsMap[localeKey] : null
    const dirMatch = rawTarget === null ? null : /^\.\/([^/]+)\/\*\.json$/.exec(rawTarget)
    const localeDir = dirMatch !== null ? dirMatch[1] : (sub === '' ? 'locale' : `locale-${sub.slice(1)}`)
    return { spec, localeKey, iconKey, localeDir, filesGlob: `${localeDir}/**` }
  })
}
