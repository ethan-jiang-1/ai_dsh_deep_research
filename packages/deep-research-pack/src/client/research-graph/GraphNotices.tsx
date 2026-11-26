// GraphNotices.tsx — 「研究图谱」的两条只读提示带（plan 结构提示 / 需要你注意）。
//
// 从 ResearchGraphTab.tsx 切出（2026-10-28 Phase C）：两条都是"把折叠里的问题捞到面上"的展示，
// 数据由父级算好（planIssues / attention），本件只管排序、截断与点击定位。
import type { ReactNode } from 'react'
import type { PlanIssue } from '../../lib/plan/plan-index.ts'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { AttentionItem } from '../../lib/plan/plan-graph.ts'
import { ATTENTION_ROW_STYLE, BANNER_STYLE, MUTED_STYLE } from './styles.ts'
import { severityIcon } from './format.ts'
import styles from './graph.module.css'

export function GraphNotices(props: {
  readonly planIssues: readonly PlanIssue[]
  readonly attention: readonly AttentionItem[]
  readonly onFocusTask: (taskId: string) => void
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { planIssues, attention, onFocusTask, t } = props
  return (
    <>
      {planIssues.length > 0 && (
        <div className={styles.errorBanner} style={BANNER_STYLE}>
          <div className={`${styles.bannerTitle} ${styles.errorText}`}>{t('graphPlanIssues')}</div>
          {planIssues.slice(0, 6).map((issue) => (
            <div key={`${issue.kind}:${issue.nodeId}:${issue.message}`} className={styles.errorText} style={MUTED_STYLE}>{issue.message}</div>
          ))}
          {planIssues.length > 6 && <div style={MUTED_STYLE}>{t('graphMoreIssues', { count: String(planIssues.length - 6) })}</div>}
        </div>
      )}


      {attention.length > 0 && (
        <div className={styles.attentionBanner}>
          <div className={styles.bannerTitle}>{t('graphAttention')}</div>
          {attention.slice(0, 8).map((item) => (
            <button
              key={`${item.taskId}:${item.reason}`}
              type="button"
              style={ATTENTION_ROW_STYLE}
              onClick={() => { onFocusTask(item.taskId) }}
            >{severityIcon(item.severity)} {item.taskId} · {item.message}</button>
          ))}
          {attention.length > 8 && <div style={MUTED_STYLE}>{t('graphMoreIssues', { count: String(attention.length - 8) })}</div>}
        </div>
      )}
    </>
  )
}
