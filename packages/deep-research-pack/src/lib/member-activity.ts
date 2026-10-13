/**
 * member-activity.ts —— 队员 journal 事件 → 队员动作行（纯函数，keyless 单测）。
 *
 * 分工（member-activity-stream 卡定夺，2026-10-10）：activity-fold 折 lead 流（观察主面，
 * 四类行）；本件折**队员**流，只出检索/抓取/出错三类行——文件读写不入流（实测 read 最高
 * 64 次/人是噪音大头，用户定夺）。行截尾部（与 activity-fold 同窗），计数全量（折叠区
 * 摘要行用）。永不 throw。
 *
 * 事件形状 = 真实归档 journal 实证（2026-10-10 挖掘）：web_search 参数 = `queries` 数组
 * （wire 权威形状，activity-fold 快照 lane 同源）；web_fetch 参数 = `url`；失败 result =
 * `data.message.isError === true` + "Error: " 文本前缀（WebError/WEB_BLOCKED_URL 实例）。
 */

import { argValueOf, contentTextParts, normalizeQueries } from './journal-wire.ts'

/** 一条队员动作行。 */
export interface MemberActionRow {
  readonly icon: '🔍' | '🌐' | '⚠️'
  readonly text: string
  readonly time: string | undefined
}

/** 队员动作摘要：尾部动作行 + 全量计数（折叠区摘要行用）。 */
export interface MemberActivitySummary {
  readonly rows: readonly MemberActionRow[]
  readonly searchCount: number
  readonly fetchCount: number
  readonly errorCount: number
}

/** 尾部保留行数（与 activity-fold 同窗——一屏能扫完）。 */
const MAX_ROWS = 30

/** journal 事件的最小形状（wire 事件；只取折算要用的字段）。 */
interface EventLike {
  readonly type?: unknown
  readonly time?: unknown
  readonly data?: {
    readonly name?: unknown
    readonly arguments?: unknown
    readonly message?: {
      readonly isError?: unknown
      readonly content?: unknown
    } | undefined
  } | undefined
}

/** 从 call 的 arguments 取字符串字段；截断 JSON / 非字符串 / 空串 → undefined。
 *  解析核 = journal-wire.argValueOf（共享正本）；本包装保留本件的哨兵语义（空串拒收——
 *  与 activity-fold 的 argOf 分叉点，实测行为差异钉在各自测试里）。 */
function argOf(args: unknown, key: string): string | undefined {
  const value = argValueOf(args, key)
  return typeof value === 'string' && value !== '' ? value : undefined
}

/** 失败 result 的正文（content 数组 text 项拼接，剥 "Error: " 工程前缀）。 */
function errorTextOf(content: unknown): string {
  const parts = contentTextParts(content)
  const joined = parts.join(' ').replace(/^Error:\s*/, '').trim()
  return joined === '' ? '(工具失败)' : joined
}

/**
 * 折算：队员 journal 事件序列 → 动作摘要（尾部行 + 全量计数）。
 * @param events - 按 wire 顺序的事件（follow 的 snapshot 历史或实时流）。
 * @returns 摘要（永不 throw；空事件 = 空区）。
 */
export function foldMemberActivity(events: readonly unknown[]): MemberActivitySummary {
  const rows: MemberActionRow[] = []
  let searchCount = 0
  let fetchCount = 0
  let errorCount = 0
  for (const event of events) {
    if (typeof event !== 'object' || event === null) continue
    const e = event as EventLike
    const time = typeof e.time === 'string' ? e.time : undefined
    if (e.type === 'tool/call') {
      const name = e.data?.name
      if (name === 'web_search') {
        const list = normalizeQueries(argValueOf(e.data?.arguments, 'queries'))
        if (list.length > 0) {
          searchCount++
          rows.push({ icon: '🔍', text: `检索：${list.join(' · ').slice(0, 40)}`, time })
        }
      } else if (name === 'web_fetch') {
        const url = argOf(e.data?.arguments, 'url')
        if (url !== undefined) {
          fetchCount++
          rows.push({ icon: '🌐', text: `抓取：${url.slice(0, 60)}`, time })
        }
      }
      // 其他工具（read/write/edit/team_*/spawn…）：v1 不出行（用户定夺的粒度边界）
    } else if (e.type === 'tool/result') {
      if (e.data?.message?.isError === true) {
        errorCount++
        rows.push({ icon: '⚠️', text: `失败：${errorTextOf(e.data.message.content).slice(0, 70)}`, time })
      }
    }
    // 其余事件类型（step/turn/session/user/system/assistant…）：噪音，不出行
  }
  return { rows: rows.slice(-MAX_ROWS), searchCount, fetchCount, errorCount }
}
