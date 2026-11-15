// Smoke 车道选择（W0-10 / 命名对齐）——纯函数，服务 `pnpm test:e2e` / `test:entry`。
//
// 命名即车道：`scripts/smoke/<target>.e2e.mjs` = 真进程；`*.entry.mjs` = 真浏览器/profile/
// tarball；`*.support.mjs` = 支援件（不属于任何车道）。registry 的 `lane` 必须与后缀一致；
// 默认只选 `tier: ci`（可无人值守、keyless/CI 成员），`--all` 才带 dev-only。
export function selectSmokeLane(registry, { lane, includeDevOnly = false, only } = {}) {
  if (lane !== 'e2e' && lane !== 'entry') throw new Error(`未知 smoke 车道：${String(lane)}（只认 e2e / entry）`)
  return Object.entries(registry)
    .filter(([, entry]) => entry?.lane === lane)
    .filter(([, entry]) => includeDevOnly || entry?.tier === 'ci')
    .map(([file, entry]) => ({ file: `scripts/smoke/${file}`, ...entry }))
    .filter((entry) => only === undefined || entry.file.includes(only))
    .sort((a, b) => a.file.localeCompare(b.file))
}
