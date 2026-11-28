// research-graph/format.ts — 「研究图谱」的纯格式化件（无 DOM、无投影）。
//
// 为什么单列：DAG 小图（DagMap.tsx）与节点列表（ResearchGraphTab.tsx）都要短标签——
// 放任一组件里都会让另一个反向依赖组件。2026-10-27 卫生轮切分时从页签体拆出。
/** 短标签（SVG 内不换行，避免撑爆侧栏）。 */
export function shortLabel(text: string, max = 15): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

function charDisplayWidth(ch: string): number {
  const cp = ch.codePointAt(0)
  if (cp === undefined) return 0
  if (
    (cp >= 0x1100 && cp <= 0x115f)
    || (cp >= 0x2e80 && cp <= 0x303e)
    || (cp >= 0x3040 && cp <= 0x33ff)
    || (cp >= 0x3400 && cp <= 0x4dbf)
    || (cp >= 0x4e00 && cp <= 0xa4cf)
    || (cp >= 0xac00 && cp <= 0xd7a3)
    || (cp >= 0xf900 && cp <= 0xfaff)
    || (cp >= 0xfe10 && cp <= 0xfe6f)
    || (cp >= 0xff00 && cp <= 0xff60)
    || (cp >= 0xffe0 && cp <= 0xffe6)
    || (cp >= 0x20000 && cp <= 0x2fffd)
    || (cp >= 0x30000 && cp <= 0x3fffd)
    || (cp >= 0x1f300 && cp <= 0x1faff)
  ) {
    return 2
  }
  return 1
}

/** 东亚宽字形显示宽度（CJK / 全角 = 2，ASCII = 1；用于 SVG 卡片防溢出，BUG-477）。 */
export function displayWidthOf(text: string): number {
  let total = 0
  for (const ch of text) total += charDisplayWidth(ch)
  return total
}

/** 按显示宽度截断（CJK 计 2 单位，ASCII 计 1 单位，避免中文溢出 SVG 卡片）。 */
export function truncateByDisplayWidth(text: string, maxUnits: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (maxUnits <= 0 || clean === '') return ''
  if (displayWidthOf(clean) <= maxUnits) return clean
  const budget = Math.max(1, maxUnits - 1)
  let out = ''
  let used = 0
  for (const ch of clean) {
    const w = charDisplayWidth(ch)
    if (used + w > budget) break
    out += ch
    used += w
  }
  return `${out}…`
}

/** 本地时钟 `HH:MM:SS`（“最后刷新”用；不引入日期库）。 */
export function formatClock(ms: number): string {
  const date = new Date(ms)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** 注意力条目的严重度图标（卡片与「需要你注意」列表共用）。 */
export function severityIcon(severity: 'critical' | 'warning' | 'info'): string {
  return severity === 'critical' ? '✕' : severity === 'warning' ? '⚠' : '·'
}
