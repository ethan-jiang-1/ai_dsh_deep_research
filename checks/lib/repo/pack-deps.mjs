// pack-deps.mjs — 发布物依赖闭包 ↔ 声明的唯一正本（BUG-229 / 232 / 238 类级）。
//
// 为什么：`row-deps` 的判据来源是**声明文件**（preset/bundle 行的 `name:`），不是**发布物实现**。
// 于是 `lib/client.js` 的 `require('react')`、公开 `.d.ts` 的 external import、以及 peer 的版本范围，
// 都不在任何门禁的对账面上（dev 环境由根 node_modules 的 devDependencies 兜底，所以全绿）。
// 本模块把三件事收成纯函数：
//   ① 正向：发布 JS 的非相对 `require` + 发布 `.d.ts` 的 external import 的包名 ⊆ `peerDependencies`；
//   ② 反向：`peerDependencies` 的每个包必须在发布物里被用到，或在随包 YAML 行里被点名（否则是死 peer）；
//   ③ 版本：跟随 DSH tag 的 peer（`@deepseek-ai/dsh-*`）范围必须与 `engines.dsh` **同一字符串**——
//      一个包只能有一个可安装版本集（`^0.2.1-rc.2` 比 `<=0.2.1-rc.5` 宽是矛盾，BUG-238）。
// 纯函数、零 fs；文件读取与 tarball 清单由消费方（pack.e2e）提供，纯函数矩阵住 tests/checks/repo/pack-deps.test.mjs。

/** 反引号/引号之外的包名归一：`react/jsx-runtime` → `react`；`@scope/name/sub` → `@scope/name`。 */
export function packageNameOf(spec) {
  if (typeof spec !== 'string' || spec === '') return null
  if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('node:')) return null
  const parts = spec.split('/')
  return spec.startsWith('@') ? (parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null) : parts[0]
}

/** JS 里的非相对 require（[{ spec, name }]；name 为 null 的条目已过滤）。 */
export function requiresOf(text) {
  const out = []
  for (const m of String(text ?? '').matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const name = packageNameOf(m[1])
    if (name !== null) out.push({ spec: m[1], name })
  }
  return out
}

/** `.d.ts` 里的 external import（`from '…'`；相对路径与 node: 过滤）。 */
export function externalImportsOf(text) {
  const out = []
  for (const m of String(text ?? '').matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    const name = packageNameOf(m[1])
    if (name !== null) out.push({ spec: m[1], name })
  }
  return out
}

/** 随包 YAML 行里点名的包（`name:` 行 + `@deepseek-ai/…` token）。 */
export function declaredNamesOf(text) {
  const names = new Set()
  for (const line of String(text ?? '').split('\n')) {
    if (/^\s*#/.test(line)) continue
    for (const m of line.matchAll(/(['"]?)(@deepseek-ai\/[A-Za-z0-9._/-]+)\1/g)) {
      const name = packageNameOf(m[2])
      if (name !== null) names.add(name)
    }
    const row = /^\s*(?:-\s*)?name:\s*['"]?([A-Za-z0-9@._/-]+)['"]?\s*$/.exec(line)
    if (row !== null) {
      const name = packageNameOf(row[1])
      if (name !== null) names.add(name)
    }
  }
  return names
}

/** 前向：发布物实际用到的包必须都在 peers。 */
export function forwardDepIssues({ peers, requires = [], imports = [] }) {
  const declared = new Set(Object.keys(peers ?? {}))
  const issues = []
  for (const { spec } of [...requires, ...imports]) {
    const name = packageNameOf(spec)
    if (name !== null && !declared.has(name)) issues.push(`发布物 require/import「${spec}」不在 peerDependencies（包名 ${name}）`)
  }
  return issues
}

/**
 * 反向：非 host-row peer 必须被发布物用到或在随包 YAML 行里点名。
 * 边界：`@deepseek-ai/dsh-*` 是**宿主行契约**（preset 依赖的 base 行包；行以 id 引用、不以包名出现），
 * 反向"死 peer"对它们不可判——它们由 peerRangeIssues 的「= engines」正面约束；本判据只查其余 peer。
 */
export function unusedPeerIssues({ peers, requires = [], imports = [], declaredYaml = new Set(), hostRowPrefix = '@deepseek-ai/dsh-' }) {
  const used = new Set([...requires, ...imports].map(({ spec }) => packageNameOf(spec)).filter(Boolean))
  return Object.keys(peers ?? {})
    .filter((name) => !name.startsWith(hostRowPrefix))
    .filter((name) => !used.has(name) && !declaredYaml.has(name))
    .sort()
    .map((name) => `peerDependency「${name}」既没被发布物 require/import，也没在随包 YAML 行里点名——死 peer（删掉或补消费方）`)
}

/** 版本：跟随 DSH tag 的 peer 必须与 engines.dsh 同一范围字符串。 */
export function peerRangeIssues(pkg, { tagPrefix = '@deepseek-ai/dsh-' } = {}) {
  const engines = pkg?.engines?.dsh
  if (typeof engines !== 'string' || engines.trim() === '') return ['pkg.engines.dsh 缺席——版本合同没有可对账的正本']
  const issues = []
  for (const [name, range] of Object.entries(pkg.peerDependencies ?? {})) {
    if (!name.startsWith(tagPrefix)) continue
    if (range !== engines) issues.push(`peerDependency「${name}」范围 ${range} ≠ engines.dsh ${engines}——同一可安装版本集只能有一个范围`)
  }
  return issues
}

/** 汇总：消费方传发布物文本与已解析 YAML 声明名。 */
export function packDepsIssues({ pkg, jsTexts = [], dtsTexts = [], yamlTexts = [] }) {
  const peers = pkg?.peerDependencies ?? {}
  const requires = jsTexts.flatMap((text) => requiresOf(text))
  const imports = dtsTexts.flatMap((text) => externalImportsOf(text))
  const declaredYaml = new Set(yamlTexts.flatMap((text) => [...declaredNamesOf(text)]))
  return [
    ...forwardDepIssues({ peers, requires, imports }),
    ...unusedPeerIssues({ peers, requires, imports, declaredYaml }),
    ...peerRangeIssues(pkg),
  ]
}
