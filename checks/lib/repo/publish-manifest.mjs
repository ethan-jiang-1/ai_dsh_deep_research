// publish-manifest.mjs — 发布 manifest 的收口（BUG-236 类级）。
//
// 为什么：npm pack 原样打包源 package.json，本仓的 devDependencies 是 `workspace:*` 协议——
// 发布物因此带 14 条 npm/pnpm 无法解析的版本声明，并把内部 dev 包清单带进发布面。
// 发布包不需要 devDependencies：导出时在 staging 副本里剥离，tarball 的 manifest 因此干净。
// 纯函数、零 fs；调用方（export-dist）负责复制目录与写盘，pack.e2e 在真 tarball 上复核。

/** 返回剥离 devDependencies 的副本（不改入参）；其余字段顺序保持不变。 */
export function stripDevDependencies(manifest) {
  const { devDependencies, ...rest } = manifest
  return rest
}

/** 发布 manifest 的协议检查：不得出现 workspace 协议（dependencies/peer/dev 任一字段）。 */
export function workspaceProtocolIssues(manifest) {
  const issues = []
  for (const field of ['dependencies', 'peerDependencies', 'devDependencies', 'optionalDependencies']) {
    for (const [name, range] of Object.entries(manifest?.[field] ?? {})) {
      if (typeof range === 'string' && range.startsWith('workspace:')) issues.push(`${field}.${name} 仍是 workspace 协议（${range}）`)
    }
  }
  return issues
}
