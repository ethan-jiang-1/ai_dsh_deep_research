// GraphVersionRail.tsx — 「研究图谱」的版本轨与旧图快照（rerun 版本面，只读）。
//
// 从 ResearchGraphTab.tsx 切出（2026-10-28 Phase C/E）：只切观察、不改图不派工，是一块
// 自包含的展示（当前 plan 版本 / 看旧图 / 看差异 / 旧图节点结构）。父级持有状态与读数。
import type { ReactNode } from 'react'
import type { PlanIndex } from '../../lib/plan-graph.ts'
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
}): ReactNode {
  const { hasPlan, planVersion, snapshots, latestSnapshot, showSnapshotPlan, setShowSnapshotPlan, graphView, setGraphView, snapshotState, snapshotPlan } = props
  return (
    <>
      {/* 版本轨（rerun 版本面，只读）：只切观察，不改图/不派工。 */}
      {hasPlan && (
        <div style={{ ...MUTED_STYLE, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
          <span>版本轨（只读）：当前 plan {planVersion !== null ? `v${String(planVersion)}` : '版本未声明'}</span>
          {snapshots.length > 0 ? (
            <>
              <button type="button" style={BUTTON_STYLE} onClick={() => { setGraphView('current'); setShowSnapshotPlan(false) }}>当前图</button>
              <button type="button" style={BUTTON_STYLE} onClick={() => { setShowSnapshotPlan((current) => !current) }}>
                {showSnapshotPlan ? '收起旧图' : `看 v${String(latestSnapshot)} 旧图`}
              </button>
              <button type="button" style={BUTTON_STYLE} onClick={() => { setGraphView((current) => current === 'diff' ? 'current' : 'diff') }}>
                {graphView === 'diff' ? '收起差异' : '看差异'}
              </button>
            </>
          ) : (
            <span>· 无旧图快照，不能 diff</span>
          )}
        </div>
      )}

      {/* 旧图快照：只列节点结构（id/kind/deps），不与当前 Team 板对板。 */}
      {showSnapshotPlan && (
        <div style={BANNER_STYLE}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>旧图快照 v{String(latestSnapshot)}（只读）</div>
          {snapshotState === 'missing' && <div style={MUTED_STYLE}>读不到 plan/v{String(latestSnapshot)}.md——快照可能已移走</div>}
          {snapshotState === 'loading' && <div style={MUTED_STYLE}>读取中…</div>}
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
