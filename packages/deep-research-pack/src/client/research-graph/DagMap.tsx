// DagMap.tsx — 研究图谱的 DAG 小图（纯展示：吃 GraphNodeView[]，画 SVG，回调选中；支持全屏宽画布舒展）。
import type { ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { wavesOf } from '../../lib/plan/plan-graph.ts'
import type { GraphNodeView } from './types.ts'
import { shortLabel } from './format.ts'
import styles from './graph.module.css'

const COMPACT_GEOM = { w: 146, h: 44, gapX: 12, gapY: 28, pad: 8, summaryChars: 16, ownerChars: 11 } as const
const WIDE_GEOM = { w: 212, h: 54, gapX: 20, gapY: 36, pad: 12, summaryChars: 26, ownerChars: 16 } as const

interface DagMapProps {
  readonly nodes: readonly GraphNodeView[]
  readonly selectedId: string | null
  readonly childCounts: ReadonlyMap<string, number>
  readonly fullscreen?: boolean
  readonly onSelect: (id: string) => void
  readonly t: TranslateNS<'deepResearchPack'>
}

function fillOf(node: GraphNodeView): string {
  if (node.status === 'completed') return 'var(--dsw-alias-state-success-tertiary)'
  if (node.status === 'in_progress') return 'var(--dsw-alias-state-business-tertiary)'
  return 'var(--dsw-alias-bg-layer-1)'
}

/**
 * 顶部 DAG 小图：按 `wavesOf` 分层；同层节点横排；展示节点 ID、负责角色与子问题短摘要，
 * 并在 `fullscreen` 态自适应展开宽画布。
 */
export function DagMap({ nodes, selectedId, childCounts, fullscreen = false, onSelect, t }: DagMapProps): ReactNode {
  const waves = wavesOf(nodes)
  if (waves.length === 0) return null
  const geom = fullscreen ? WIDE_GEOM : COMPACT_GEOM
  const pos = new Map<string, { x: number; y: number }>()
  let maxRow = 1
  waves.forEach((wave, row) => {
    maxRow = Math.max(maxRow, wave.tasks.length)
    wave.tasks.forEach((node, index) => {
      pos.set(node.id, {
        x: geom.pad + index * (geom.w + geom.gapX),
        y: geom.pad + row * (geom.h + geom.gapY),
      })
    })
  })
  const width = geom.pad * 2 + maxRow * geom.w + Math.max(0, maxRow - 1) * geom.gapX
  const height = geom.pad * 2 + waves.length * geom.h + Math.max(0, waves.length - 1) * geom.gapY
  const known = new Set(nodes.map((node) => node.id))
  return (
    <div className={styles.dagWrap} data-dag-mode={fullscreen ? 'wide' : 'compact'}>
      <svg
        width={Math.max(fullscreen ? 640 : 320, width)}
        height={height}
        viewBox={`0 0 ${String(width)} ${String(height)}`}
        role="img"
        aria-label={t('graphDagAria')}
        className={styles.dagSvg}
      >
        <defs>
          <marker id="research-graph-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--dsw-alias-label-tertiary)" />
          </marker>
          <marker id="research-graph-arrow-active" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--dsw-alias-brand-primary)" />
          </marker>
        </defs>
        {nodes.flatMap((node) => node.blockedBy
          .filter((dep) => dep !== node.id && known.has(dep))
          .map((dep) => {
            const from = pos.get(dep)
            const to = pos.get(node.id)
            if (from === undefined || to === undefined) return null
            const adjacent = selectedId !== null && (dep === selectedId || node.id === selectedId)
            const dimmed = selectedId !== null && !adjacent
            const x1 = from.x + geom.w / 2
            const y1 = from.y + geom.h
            const x2 = to.x + geom.w / 2
            const y2 = to.y
            const mid = (y1 + y2) / 2
            return (
              <path
                key={`${dep}->${node.id}`}
                d={`M ${String(x1)} ${String(y1)} C ${String(x1)} ${String(mid)}, ${String(x2)} ${String(mid)}, ${String(x2)} ${String(y2)}`}
                fill="none"
                stroke={adjacent ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-tertiary)'}
                strokeWidth={adjacent ? 2 : 1.2}
                opacity={dimmed ? 0.28 : 1}
                markerEnd={adjacent ? 'url(#research-graph-arrow-active)' : 'url(#research-graph-arrow)'}
              />
            )
          }))}
        {nodes.map((node) => {
          const point = pos.get(node.id)
          if (point === undefined) return null
          const selected = node.id === selectedId
          const summaryText = shortLabel(node.subject !== '' ? node.subject : node.label, geom.summaryChars)
          const ownerBadge = node.ownerName !== undefined ? shortLabel(node.ownerName, geom.ownerChars) : null
          return (
            <g
              key={node.id}
              transform={`translate(${String(point.x)},${String(point.y)})`}
              role="button"
              tabIndex={0}
              aria-label={`${node.id} ${summaryText} ${node.state.text}`}
              className={styles.dagNode}
              onClick={() => { onSelect(node.id) }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(node.id)
                }
              }}
            >
              <title>{t('graphNodeTitle', { id: node.id, label: node.subject !== '' ? node.subject : node.label, owner: node.ownerName ?? t('graphUnassignedOwner'), state: node.state.text })}</title>
              <rect
                width={geom.w}
                height={geom.h}
                rx={7}
                fill={fillOf(node)}
                stroke={selected ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)'}
                strokeWidth={selected ? 2 : 1}
                opacity={node.status === 'unplanned' ? 0.75 : 1}
              />
              <circle cx={11} cy={13} r={3.2} fill={node.state.color} />
              <text x={19} y={16} fontSize={10.5} fontWeight={600} fill="var(--dsw-alias-label-primary)">{node.id}</text>
              {ownerBadge !== null && (
                <text x={geom.w - 8} y={16} textAnchor="end" fontSize={9} fill="var(--dsw-alias-label-tertiary)">
                  {ownerBadge}
                </text>
              )}
              <text x={10} y={fullscreen ? 36 : 31} fontSize={fullscreen ? 10.5 : 9.5} fill="var(--dsw-alias-label-secondary)">
                {summaryText}
              </text>
              {(childCounts.get(node.id) ?? 0) > 0 && (
                <text x={geom.w - 8} y={geom.h - 6} textAnchor="end" fontSize={8.5} fontWeight={600} fill="var(--dsw-alias-brand-primary)">
                  +{String(childCounts.get(node.id))}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
