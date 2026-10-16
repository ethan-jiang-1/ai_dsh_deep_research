// frontmatter.mjs — `---` frontmatter 拆分的**唯一正本**（keyless 纯逻辑，零依赖）。
//
// 为什么收敛（2026-10-16 结构收敛 round3 §A）：run-dashboard-core 与 evidence-audit-core 各持一份
// **逐字相同**的实现；evidence-audit 侧当年"独立副本——audit 不依赖 dashboard 的副作用面"的理由，
// 在两核都纯化为 lib 纯件之后已经失效——中立第三方模块比任一消费方更小，也不会被某一方的
// 副作用面牵连。
//
// 契约（2026-09-26 起逐字未变，本件是它的搬运不是改写）：按首个 `---` 块拆分；块内只认
// `key: value` 单行标量（扁平映射，重复键后者覆盖）；无 frontmatter 时返回 `{ fm: null, body: text }`
// ——调用方按 null 走各自的"契约不符"分支，本件不判语义。
//
// 消费方：scripts/lib/run-dashboard-core.mjs、scripts/lib/evidence-audit-core.mjs。

/** 拆 frontmatter → `{ fm: Record<string,string> | null, body: string }`。 */
export function splitFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text)
  if (!m) return { fm: null, body: text }
  const fm = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line)
    if (kv) fm[kv[1]] = kv[2].trim()
  }
  return { fm, body: m[2] }
}
