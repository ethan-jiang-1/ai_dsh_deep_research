// redirect-ledger.mjs — 搬家账本的链式解析（2026-11-17 维护层对齐）。
//
// 为什么：账本改为 append-only 后，旧条目的 `to` 可能又被下一次搬家登记为 `from`；解析必须
// 走到**最终落点**，否则每次搬家都要重写全部历史条目（537 条的税），且漏改一条就假红。
// 环 / 过深 / 重复 from 一律 fail-loud——账本腐烂比断链更难查。
// 纯函数：不读盘；from/to 的存在性与 git 跟踪由消费门禁注入。
export const MAX_REDIRECT_DEPTH = 10

/**
 * @param {{from?: unknown, to?: unknown}[]} entries
 * @returns {{map: Map<string,string>, problems: string[]}}
 */
export function indexRedirects(entries) {
  const map = new Map()
  const problems = []
  for (const entry of entries ?? []) {
    if (typeof entry?.from !== 'string' || typeof entry?.to !== 'string') {
      problems.push('重定向登记簿条目缺 from/to 字符串')
      continue
    }
    if (map.has(entry.from)) {
      problems.push(`重定向登记簿重复 from：${entry.from}（每条旧路径只许一条）`)
      continue
    }
    map.set(entry.from, entry.to)
  }
  return { map, problems }
}

/**
 * 从 rel 起沿账本走到最终落点。`to` 不再被登记时即终点。
 * @returns {{final: string, depth: number, cycle: boolean, tooDeep: boolean}}
 */
export function resolveRedirect(map, rel) {
  let cur = rel
  const seen = new Set()
  for (let depth = 1; depth <= MAX_REDIRECT_DEPTH; depth++) {
    if (!map.has(cur)) return { final: cur, depth: depth - 1, cycle: false, tooDeep: false }
    if (seen.has(cur)) return { final: cur, depth: depth - 1, cycle: true, tooDeep: false }
    seen.add(cur)
    cur = map.get(cur)
  }
  return { final: cur, depth: MAX_REDIRECT_DEPTH, cycle: false, tooDeep: true }
}
