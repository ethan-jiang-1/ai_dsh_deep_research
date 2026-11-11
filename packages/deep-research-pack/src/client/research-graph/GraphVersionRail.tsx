// GraphVersionRail.tsx — 「研究图谱」的版本轨与旧图快照（rerun 版本面，只读）。
//
// 从 ResearchGraphTab.tsx 切出（2026-10-28 Phase C/E）：只切观察、不改图不派工，是一块
// 自包含的展示（当前 plan 版本 / 看旧图 / 看差异 / 旧图节点结构）。父级持有状态与读数。
import type { ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { PlanIndex } from '../../lib/plan-index.ts'
import { BUTTON_STYLE, MUTED_STYLE, BANNER_STYLE } from './styles.ts'

export function GraphVersionRail(props: {
  readonly hasPlan: boolean
  readonly planVersion: number | null
  readonly snapshots: readonly number[]
  readonly latestSnapshot: number | null
  readonly showSnapshotPlan: boolean
  readonly setShowSnapshotPlan: (update: boolean | ((current: boolean) => boolean)) => void
  readonly graphView: 'current' | 'diff'
  readonly setGraphView: (update: 'current' | 'diff' | ((current: 'current' | 'diff') => 'current' | 'diff')) => void
  readonly snapshotState: 'idle' | 'loading' | 'ready' | 'missing'
  readonly snapshotPlan: PlanIndex | null
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { hasPlan, planVersion, snapshots, latestSnapshot, showSnapshotPlan, setShowSnapshotPlan, graphView, setGraphView, snapshotState, snapshotPlan, t } = props
  return (
    <>
      {/* 版本轨（rerun 版本面，只读）：只切观察，不改图/不派工。 */}
      {hasPlan && (
        <div style={{ ...MUTED_STYLE, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
          {t('graphVersionRailTitle', { version: planVersion !== null ? `v${String(planVersion)}` : t('graphVersionUnset') })}
          {snapshots.length > 0 ? (
            <>
              <button type="button" style={BUTTON_STYLE} onClick={() => { setGraphView('current'); setShowSnapshotPlan(false) }}>{t('graphCurrent')}</button>
              <button type="button" style={BUTTON_STYLE} onClick={() => { setShowSnapshotPlan((current) => !current) }}>
                {showSnapshotPlan ? t('graphHideOld') : t('graphShowOld', { version: String(latestSnapshot) })}
              </button>
              <button type="button" style={BUTTON_STYLE} onClick={() => { setGraphView((current) => current === 'diff' ? 'current' : 'diff') }}>
                {graphView === 'diff' ? t('graphHideDiff') : t('graphShowDiff')}
              </button>
            </>
          ) : (
            <span>{t('graphNoSnapshot')}</span>
          )}
        </div>
      )}

      {/* 旧图快照：只列节点结构（id/kind/deps），不与当前 Team 板对板。 */}
      {showSnapshotPlan && (
        <div style={BANNER_STYLE}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{t('graphOldSnapshotTitle', { version: String(latestSnapshot) })}</div>
          {snapshotState === 'missing' && <div style={MUTED_STYLE}>{t('graphSnapshotMissing', { version: String(latestSnapshot) })}</div>}
          {snapshotState === 'loading' && <div style={MUTED_STYLE}>{t('graphLoading')}</div>}
          {snapshotPlan !== null && snapshotPlan.topLevel.map((node) => (
            <div key={node.id} style={{ fontSize: 11, opacity: 0.85 }}>
              <strong>{node.id}</strong>{node.kind !== undefined ? ` · ${node.kind}` : ''}{node.deps.length > 0 ? ` · deps ${node.deps.join(', ')}` : ''}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
