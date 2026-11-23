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

/** JS 里的动态 `import('…')`（打包器可能保留；只抽 require 会漏，BUG-247）。 */
export function dynamicImportsOf(text) {
  const out = []
  for (const m of String(text ?? '').matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
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

/**
 * 前向：发布物实际用到的包必须都在 peers。
 * @param {{ peers: any, requires?: Array<{ spec: string, name?: string }>, imports?: Array<{ spec: string, name?: string }> }} input
 */
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
 * 显式 host-row allowlist（BUG-246）：preset 行以 id 引用 base 行，包名不出现在 YAML 里，
 * 反向"死 peer"对它们不可判——但**不允许前缀豁免**：每个未消费的 host peer 必须在此逐条登记理由。
 * 键 = peer 名；值 = 为什么它是合法的宿主行契约（空理由 = 红）。
 */
export const HOST_ROW_PEERS = Object.freeze({
  '@deepseek-ai/dsh-agent': 'preset 行依赖的 agent 主行（base 提供，本包按 id replace/config）',
  '@deepseek-ai/dsh-api-session-controller': '驾驶舱数据通道依赖的 session controller 行（base web 组合）',
  '@deepseek-ai/dsh-experimental-client-ui-agent-team': '团队层 Web 可视面由团队 profile 提供（D18 有界例外）',
  '@deepseek-ai/dsh-workspace': 'workspace 服务行（startup 半登记工作区所依赖的 base 行）',
  '@deepseek-ai/dsh-session': 'session 服务行（preset 行按 id 依赖的 base 行）',
  '@deepseek-ai/dsh-session-projection': '会话投影服务行（驾驶舱数据面按 id 依赖的 base 行）',
  '@deepseek-ai/dsh-tools': '工具注册表行（角色工具面按 id 依赖的 base 行）',
  '@deepseek-ai/dsh-web': 'web 行（cordis.patch.yml 按 id 重述 search/fetch provider）',
  '@deepseek-ai/dsh-web-deepseek-api': '搜索 provider 行（web 行 searchProvider 按 id 指向它）',
  '@deepseek-ai/dsh-web-fetch-http': '本地抓取 provider 行（fetch 回退链第一腿，按 id 组合）',
})

/** allowlist 自身的守卫：键必须仍是 peer，理由非空（防止 allowlist 腐烂成第二份死名单）。 */
export function hostRowIssues(pkg, hostRowPeers = HOST_ROW_PEERS) {
  const peers = new Set(Object.keys(pkg?.peerDependencies ?? {}))
  const issues = []
  for (const [name, reason] of Object.entries(hostRowPeers)) {
    if (!peers.has(name)) issues.push(`host-row allowlist 条目「${name}」已不是 peerDependency——删条目或补 peer`)
    if (typeof reason !== 'string' || reason.trim() === '') issues.push(`host-row allowlist 条目「${name}」缺理由`)
  }
  return issues
}

/**
 * 反向：每个 peer 必须被发布物用到、在随包 YAML 行里点名，或在显式 host-row allowlist 里（BUG-246）。
 * @param {{ peers: any, requires?: Array<{ spec: string, name?: string }>, imports?: Array<{ spec: string, name?: string }>, declaredYaml?: Set<string>, hostRowPeers?: Record<string, string> }} input
 */
export function unusedPeerIssues({ peers, requires = [], imports = [], declaredYaml = new Set(), hostRowPeers = HOST_ROW_PEERS }) {
  const used = new Set([...requires, ...imports].map(({ spec }) => packageNameOf(spec)).filter(Boolean))
  return Object.keys(peers ?? {})
    .filter((name) => !used.has(name) && !declaredYaml.has(name) && !Object.hasOwn(hostRowPeers, name))
    .sort()
    .map((name) => `peerDependency「${name}」既没被发布物 require/import，也没在随包 YAML 行里点名，且不在 host-row allowlist——死 peer（删掉或补消费方/登记理由）`)
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

/**
 * 汇总：消费方传发布物文本与已解析 YAML 声明名。
 * @param {{ pkg: any, jsTexts?: string[], dtsTexts?: string[], yamlTexts?: string[] }} input
 */
export function packDepsIssues({ pkg, jsTexts = [], dtsTexts = [], yamlTexts = [] }) {
  const peers = pkg?.peerDependencies ?? {}
  const requires = jsTexts.flatMap((text) => [...requiresOf(text), ...dynamicImportsOf(text)])
  const imports = dtsTexts.flatMap((text) => externalImportsOf(text))
  const declaredYaml = new Set(yamlTexts.flatMap((text) => [...declaredNamesOf(text)]))
  return [
    ...forwardDepIssues({ peers, requires, imports }),
    ...unusedPeerIssues({ peers, requires, imports, declaredYaml }),
    ...hostRowIssues(pkg),
    ...peerRangeIssues(pkg),
  ]
}
