// TrackRail.tsx — 「研究状态」页签的流程轨道（②）：◆立项确认 + 主轨 + ◆交付审阅 + 交付，
// 外加 rerun 回边的 U 形连线与图例。
//
// 从 ResearchStatusTab.tsx 原样切出（2026-10-28 卫生轮 维度2）：轨道的取色/步态符号/列位/回边
// 几何是一整块自成体系的呈现逻辑，此前与页签体的数据装配混在一个 424 行函数里。切出后改"轨道
// 长什么样"只读本文件；页签体只回答"数据是什么"。
//
// 输入刻意收窄成三样：锚点、步骤、交付版本数——父级的 face/hitl 细节不进本层（传 null 即"尚未
// 绑定/未读到"，与 face===null 同义）。步态符号语法与图例文案逐字保留（2026-09-28 trial 的实红
// 教训：done 与 pending 都读成"没走过"，回边 ▲ 紧贴芯片造成"挖掘被点亮"的误读）。
import type { ReactNode } from 'react'
import type { RunAnchor } from '../../lib/hitl-fold.ts'
import type { RunStep } from '../../lib/run-fold.ts'

/** 列位（1 起）：a1=1，steps[0..5]=2..7，a2=8，final=9；回边跨"挖掘列 → a2 列"。 */
const EV_COL = 5
const A2_COL = 8

export function TrackRail(props: {
  readonly anchors: readonly RunAnchor[]
  readonly steps: readonly RunStep[]
  /** `final/` 记录的版本数；null = 尚未读到绑定面（与"无版本"不同形）。 */
  readonly faceVersions: number | null
  readonly hitlPending: boolean
}): ReactNode {
  const { anchors, steps, faceVersions, hitlPending } = props
  const hasFace = faceVersions !== null
  const railVisible = hasFace || hitlPending || anchors.some((a) => a.state !== 'upcoming')
  if (!railVisible) return null

  const anchorChip = (a: RunAnchor): ReactNode => (
    <span key={a.key} style={{ padding: '2px 8px', borderRadius: 4, fontWeight: a.state === 'pending' ? 700 : 400, background: a.state === 'pending' ? '#f59e0b33' : a.state === 'passed' ? '#22c55e22' : '#0000000d', color: a.state === 'pending' ? '#b45309' : a.state === 'passed' ? '#16a34a' : '#888' }}>
      ◆{a.label}{a.state === 'pending' && a.questions > 0 ? `（${a.questions} 问）` : ''} {a.state === 'pending' ? '⏳' : a.state === 'passed' ? '✓' : '·'}
    </span>
  )
  // 步态符号（✓ 已过 / ● 进行中 / ○ 未到）与重入点虚线描边 = 既有视觉契约，逐字保留。
  const loopOn = anchors[1] !== undefined && anchors[1].state !== 'upcoming'
  const stepChip = (s: RunStep): ReactNode => {
    const reentry = hasFace && loopOn && s.key === 'evidence'
    return (
      <span key={s.key} style={{ padding: '2px 8px', borderRadius: 4, opacity: !hasFace ? 0.35 : s.state === 'pending' ? 0.4 : 1, fontWeight: hasFace && s.state === 'current' ? 700 : 400, background: hasFace && s.state === 'current' ? '#f59e0b33' : hasFace && s.state === 'done' ? '#22c55e22' : '#0000000d', color: hasFace && s.state === 'done' ? '#16a34a' : undefined, outline: reentry ? '1.5px dashed #c08a2e' : undefined, outlineOffset: reentry ? 1 : undefined }}>{s.state === 'done' ? '✓ ' : s.state === 'current' ? '● ' : '○ '}{s.label}</span>
    )
  }

  const railNodes: { key: string; chip: ReactNode }[] = [
    { key: 'anchor-1', chip: anchorChip(anchors[0] ?? { key: 'anchor-1', label: '立项确认', state: 'upcoming', questions: 0 }) },
    ...steps.slice(0, 6).map((s) => ({ key: s.key, chip: stepChip(s) })),
    { key: 'anchor-2', chip: anchorChip(anchors[1] ?? { key: 'anchor-2', label: '交付审阅', state: 'upcoming', questions: 0 }) },
    ...steps.slice(6).map((s) => ({ key: s.key, chip: stepChip(s) })),
    ...anchors.slice(2).map((a) => ({ key: a.key, chip: anchorChip(a) })),
  ]

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${railNodes.length}, auto)`, alignItems: 'start', marginBottom: 8, fontSize: 12 }}>
        {railNodes.map((n, i) => (
          <div key={n.key} style={{ gridRow: 1, gridColumn: i + 1 }}>{n.chip}</div>
        ))}
        {loopOn && (
          <div style={{ gridRow: 2, gridColumn: `${EV_COL} / ${A2_COL + 1}`, position: 'relative', margin: '4px 6px 0', border: '1px dashed #c08a2e', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '2px 6px 3px', color: '#b45309', textAlign: 'center', minWidth: 0, lineHeight: 1.4, whiteSpace: 'normal' }}>
            <span style={{ position: 'absolute', top: -9, left: 3, fontSize: 10, color: '#b45309' }}>▲</span>
            ↻ rerun 图例（非执行记录）：补研究 = 同 bundle 回挖掘、final/ vN+1；表述修订 = 原位改、版本不变；结构性重构 = 另起新 bundle{faceVersions !== null && faceVersions >= 2 ? ` · 本 bundle 已有 v${faceVersions}（证据扩张）` : ''}
          </div>
        )}
      </div>
      {hasFace && (
        <div style={{ fontSize: 11, opacity: 0.55, marginBottom: 8 }}>✓ 已过 · ● 进行中 · ○ 未到 · 虚线描边 = ↻ 回边落点（重入点）</div>
      )}
    </>
  )
}
