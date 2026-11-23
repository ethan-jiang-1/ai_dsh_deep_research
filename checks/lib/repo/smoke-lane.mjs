// Smoke 车道选择（W0-10 / 命名对齐）——纯函数，服务 `pnpm test:e2e` / `test:entry`。
//
// 命名即车道：`checks/smoke/<target>.e2e.mjs` = 真进程；`*.entry.mjs` = 真浏览器/profile/
// tarball；`*.support.mjs` = 支援件（不属于任何车道）。registry 的 `lane` 必须与后缀一致。
// 频率 = registry 的 `tier`（D54 拆分）：`ci` = push/required、`nightly` = 夜间承重、`dev-only` = 手动。
// 车道默认跑**自动挂载面**（ci ∪ nightly，可无人值守、keyless），`--all` 才带 dev-only。
const AUTO_TIERS = new Set(['ci', 'nightly'])

/**
 * @param {Record<string, any>} registry
 * @param {{ lane?: string, includeDevOnly?: boolean, only?: string }} [opts]
 */
export function selectSmokeLane(registry, { lane, includeDevOnly = false, only } = {}) {
  if (lane !== 'e2e' && lane !== 'entry') throw new Error(`未知 smoke 车道：${String(lane)}（只认 e2e / entry）`)
  return Object.entries(registry)
    .filter(([, entry]) => entry?.lane === lane)
    .filter(([, entry]) => includeDevOnly || AUTO_TIERS.has(entry?.tier))
    .map(([file, entry]) => ({ file: `checks/smoke/${file}`, ...entry }))
    .filter((entry) => only === undefined || entry.file.includes(only))
    .sort((a, b) => a.file.localeCompare(b.file))
}

/**
 * 无匹配条目的失败信息：给出对象 + 规则 + 修正入口（--all 是带 dev-only 的唯一开关）。
 * @param {{ lane?: string, only?: string }} [opts]
 */
export function noMatchMessage({ lane, only } = {}) {
  const scope = only === undefined ? '' : `; --only ${only}`
  return `run-lane: ${lane} 车道无匹配条目（tier: ci|nightly${scope}）——dev-only 件加 --all（run-lane --list 看 tier）`
}
