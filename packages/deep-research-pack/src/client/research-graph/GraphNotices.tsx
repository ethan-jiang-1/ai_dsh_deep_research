// GraphNotices.tsx — 「研究图谱」的两条只读提示带（plan 结构提示 / 需要你注意）。
//
// 从 ResearchGraphTab.tsx 切出（2026-10-28 Phase C）：两条都是"把折叠里的问题捞到面上"的展示，
// 数据由父级算好（planIssues / attention），本件只管排序、截断与点击定位。
import type { ReactNode } from 'react'
import type { PlanIssue } from '../../lib/plan-graph.ts'
import type { AttentionItem } from '../../lib/plan-graph.ts'
import { ATTENTION_ROW_STYLE, BANNER_STYLE, MUTED_STYLE } from './styles.ts'
import { severityIcon } from './format.ts'

export function GraphNotices(props: {
  readonly planIssues: readonly PlanIssue[]
  readonly attention: readonly AttentionItem[]
  readonly onFocusTask: (taskId: string) => void
}): ReactNode {
  const { planIssues, attention, onFocusTask } = props
  return (
    <>
      {planIssues.length > 0 && (
        <div style={{ ...BANNER_STYLE, background: '#dc262610', borderColor: '#dc262640' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, color: '#b91c1c' }}>plan 结构提示（只读）</div>
          {planIssues.slice(0, 6).map((issue) => (
            <div key={`${issue.kind}:${issue.nodeId}:${issue.message}`} style={{ ...MUTED_STYLE, color: '#b91c1c' }}>{issue.message}</div>
          ))}
          {planIssues.length > 6 && <div style={MUTED_STYLE}>…另有 {String(planIssues.length - 6)} 条</div>}
        </div>
      )}


      {attention.length > 0 && (
        <div style={{ marginBottom: 10, padding: '6px 10px', borderRadius: 6, background: '#f59e0b14', border: '1px solid #f59e0b40' }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>需要你注意（只读）</div>
          {attention.slice(0, 8).map((item) => (
            <button
              key={`${item.taskId}:${item.reason}`}
              type="button"
              style={ATTENTION_ROW_STYLE}
              onClick={() => { onFocusTask(item.taskId) }}
            >{severityIcon(item.severity)} {item.taskId} · {item.message}</button>
          ))}
          {attention.length > 8 && <div style={MUTED_STYLE}>…另有 {String(attention.length - 8)} 条</div>}
        </div>
      )}
    </>
  )
}
