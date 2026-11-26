// GraphVersionRail.tsx — 「研究图谱」的版本轨与旧图快照（rerun 版本面，只读）。
//
// 从 ResearchGraphTab.tsx 切出（2026-10-28 Phase C/E）：只切观察、不改图不派工，是一块
// 自包含的展示（当前 plan 版本 / 看旧图 / 看差异 / 旧图节点结构）。父级持有状态与读数。
import type { ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { PlanIndex } from '../../lib/plan/plan-index.ts'
import styles from './graph.module.css'

export function GraphVersionRail(props: {
  readonly hasPlan: boolean
  readonly planVersion: number | null
  readonly snapshots: readonly number[]
  readonly latestSnapshot: number | null
  readonly showSnapshotPlan: boolean
  readonly setShowSnapshotPlan: (update: boolean | ((current: boolean) => boolean)) => void
  readonly graphView: 'current' | 'diff'
  readonly setGraphView: (update: 'current' | 'diff' | ((current: 'current' | 'diff') => 'current' | 'diff')) => void
  readonly snapshotState: 'idle' | 'loading' | 'ready' | 'empty' | 'invalid' | 'missing' | 'unreadable'
  /** plan/ 目录读取态（BUG-390）；unreadable 不得显示成「无旧图快照」。 */
  readonly snapshotsState: 'ok' | 'absent' | 'unreadable'
  readonly snapshotPlan: PlanIndex | null
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { hasPlan, planVersion, snapshots, latestSnapshot, showSnapshotPlan, setShowSnapshotPlan, graphView, setGraphView, snapshotState, snapshotPlan, snapshotsState, t } = props
  return (
    <>
      {/* 版本轨（rerun 版本面，只读）：只切观察，不改图/不派工。 */}
      {hasPlan && (
        <div className={styles.versionRailRow}>
          {t('graphVersionRailTitle', { version: planVersion !== null ? `v${String(planVersion)}` : t('graphVersionUnset') })}
          {snapshots.length > 0 ? (
            <>
              <button type="button" className={styles.actionButton} onClick={() => { setGraphView('current'); setShowSnapshotPlan(false) }}>{t('graphCurrent')}</button>
              <button type="button" className={styles.actionButton} onClick={() => { setShowSnapshotPlan((current) => !current) }}>
                {showSnapshotPlan ? t('graphHideOld') : t('graphShowOld', { version: String(latestSnapshot) })}
              </button>
              <button type="button" className={styles.actionButton} onClick={() => { setGraphView((current) => current === 'diff' ? 'current' : 'diff') }}>
                {graphView === 'diff' ? t('graphHideDiff') : t('graphShowDiff')}
              </button>
            </>
          ) : snapshotsState === 'unreadable' ? (
            <span className={styles.warnText}>{t('graphSnapshotListFailed')}</span>
          ) : (
            <span>{t('graphNoSnapshot')}</span>
          )}
        </div>
      )}

      {/* 旧图快照：只列节点结构（id/kind/deps），不与当前 Team 板对板。 */}
      {showSnapshotPlan && (
        <div className={styles.snapshotBanner}>
          <div className={styles.diffHeading}>{t('graphOldSnapshotTitle', { version: String(latestSnapshot) })}</div>
          {snapshotState === 'missing' && <div className={styles.mutedLine}>{t('graphSnapshotMissing', { version: String(latestSnapshot) })}</div>}
          {snapshotState === 'unreadable' && <div className={styles.mutedLine}>{t('graphSnapshotUnreadable', { version: String(latestSnapshot) })}</div>}
          {snapshotState === 'empty' && <div className={styles.mutedLine}>{t('graphSnapshotEmpty', { version: String(latestSnapshot) })}</div>}
          {snapshotState === 'invalid' && <div className={styles.mutedLine}>{t('graphSnapshotInvalid', { version: String(latestSnapshot) })}</div>}
          {snapshotState === 'loading' && <div className={styles.mutedLine}>{t('graphLoading')}</div>}
          {snapshotPlan !== null && snapshotPlan.topLevel.map((node) => (
            <div key={node.id} className={styles.snapshotNodeRow}>
              <strong>{node.id}</strong>{node.kind !== undefined ? ` · ${node.kind}` : ''}{node.deps.length > 0 ? ` · deps ${node.deps.join(', ')}` : ''}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
