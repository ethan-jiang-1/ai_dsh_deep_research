/**
 * journal-wire.ts —— journal wire 事件的入参/正文解析共享核（零依赖叶模块）。
 *
 * 来源：五文件六处手抄的「JSON 字符串或对象 + 截断容错」解析家族收敛（2026-10-13 结构重构）——
 * 同一 wire 形态多处实现是漂移病：vendor schema 变形时要逐一找齐改漏即红。收敛后各消费方
 * 保留自己的**失败哨兵**（null / undefined / false / 0 / 'unknown'——共享核统一返回 null，
 * 消费方薄包装在原地翻译），行为由各 1:1 keyless 测试与 tests/journal-wire.test.mjs 钉住。
 *
 * 刻意不收的：hitl-fold 的 resultTextOf/resultBlockText（嵌套 tool-result 块 + 递归语义，
 * 与本模块的平铺 text 项骨架不同）与各文件私有的 EventLike 最小形状（= 各折算自己读哪些
 * 字段的局部契约，非逻辑重复）。
 */

/** wire 入参（JSON 字符串或对象）→ 对象形态。截断 JSON（流式前缀）/ 非对象 → null。
 *  数组按对象放行（与原手抄家族一致——查不存在的键得 undefined，不特殊拒数组；
 *  需要拒数组的消费方如 tool-card.parseArgsObject 在自己包装里加检）。 */
export function argsObjectOf(args: unknown): Record<string, unknown> | null {
  let obj: unknown = args
  if (typeof args === 'string') {
    try { obj = JSON.parse(args) } catch { return null }
  }
  if (typeof obj !== 'object' || obj === null) return null
  return obj as Record<string, unknown>
}

/** 从 call 的 arguments（JSON 字符串或对象）取字段原值；截断 JSON / 非对象 / 字段缺席 → null。 */
export function argValueOf(args: unknown, key: string): unknown {
  const obj = argsObjectOf(args)
  return obj === null ? null : obj[key] ?? null
}

/** web_search 的 queries 归一（wire 权威形状 = queries 数组，vendor tool-web search schema；
 *  非字符串与纯空白项剔除；非数组 → 空数组）。 */
export function normalizeQueries(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((q): q is string => typeof q === 'string' && q.trim() !== '') : []
}

/** content 数组（wire 消息/结果体的标准形状）里 type=text 项的文本收集；非数组 → 空数组。
 *  只做收集——拼接/剥前缀/截断等后处理语义归各消费方。 */
export function contentTextParts(content: unknown): readonly string[] {
  if (!Array.isArray(content)) return []
  const parts: string[] = []
  for (const c of content) {
    if (typeof c === 'object' && c !== null && (c as { type?: unknown }).type === 'text') {
      const t = (c as { text?: unknown }).text
      if (typeof t === 'string') parts.push(t)
    }
  }
  return parts
}
