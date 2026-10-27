// DagMap.tsx — 研究图谱的 DAG 小图（纯展示：吃 GraphNodeView[]，画 SVG，回调选中）。
//
// 从 ResearchGraphTab.tsx 原样切出（2026-10-27 卫生轮 维度2）：自包含的展示件（几何常量 +
// 两个纯格式化 + SVG 渲染），此前埋在 560 行的页签体文件里；`research-graph/` 子目录一度只装
// types.ts。切出后页签体只留数据装配与布局，DAG 的几何/交互改动只读本文件。
import type { ReactNode } from 'react'
import { wavesOf } from '../../lib/plan-graph.ts'
import type { GraphNodeView } from './types.ts'
import { shortLabel } from './format.ts'

/** DAG 小图的固定几何（SVG 坐标；side panel 窄，节点只放 id + 短标签）。 */
const NODE_W = 108
const NODE_H = 32
const NODE_GAP_X = 12
const LEVEL_GAP_Y = 28
const MAP_PAD = 8


interface DagMapProps {
  readonly nodes: readonly GraphNodeView[]
  readonly selectedId: string | null
  readonly childCounts: ReadonlyMap<string, number>
  readonly onSelect: (id: string) => void
}


/** 节点填充/描边（状态色只做左侧条 + 小圆点；卡片背景保持中性，避免整屏花）。 */
function fillOf(node: GraphNodeView): string {
  if (node.status === 'completed') return '#f0fdf4'
  if (node.status === 'in_progress') return '#eff6ff'
  if (node.status === 'unplanned') return '#f8fafc'
  return '#f8fafc'
}

/**
 * 顶部 DAG 小图：按 `wavesOf` 分层；同层节点横排；边从 blocker 底边到 dependent 顶边。
 * 没有边时不渲染（父级明确说“没有可画的 DAG”，不画假图）。
 */
export function DagMap({ nodes, selectedId, childCounts, onSelect }: DagMapProps): ReactNode {
  const waves = wavesOf(nodes)
  if (waves.length === 0) return null
  const pos = new Map<string, { x: number; y: number }>()
  let maxRow = 1
  waves.forEach((wave, row) => {
    maxRow = Math.max(maxRow, wave.tasks.length)
    wave.tasks.forEach((node, index) => {
      pos.set(node.id, {
        x: MAP_PAD + index * (NODE_W + NODE_GAP_X),
        y: MAP_PAD + row * (NODE_H + LEVEL_GAP_Y),
      })
    })
  })
  const width = MAP_PAD * 2 + maxRow * NODE_W + Math.max(0, maxRow - 1) * NODE_GAP_X
  const height = MAP_PAD * 2 + waves.length * NODE_H + Math.max(0, waves.length - 1) * LEVEL_GAP_Y
  const known = new Set(nodes.map((node) => node.id))
  return (
    <div style={{
      overflowX: 'auto', marginBottom: 6, border: '1px solid #00000012', borderRadius: 8,
      padding: '6px 8px', background: '#fafbfc',
    }}>
      <svg
        width={Math.max(300, width)}
        height={height}
        viewBox={`0 0 ${String(width)} ${String(height)}`}
        role="img"
        aria-label="研究依赖图：节点与依赖边"
        style={{ display: 'block', margin: '0 auto' }}
      >
        <defs>
          <marker id="research-graph-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#94a3b8" />
          </marker>
        </defs>
        {nodes.flatMap((node) => node.blockedBy
          .filter((dep) => dep !== node.id && known.has(dep))
          .map((dep) => {
            const from = pos.get(dep)
            const to = pos.get(node.id)
            if (from === undefined || to === undefined) return null
            const x1 = from.x + NODE_W / 2
            const y1 = from.y + NODE_H
            const x2 = to.x + NODE_W / 2
            const y2 = to.y
            const mid = (y1 + y2) / 2
            return (
              <path
                key={`${dep}->${node.id}`}
                d={`M ${String(x1)} ${String(y1)} C ${String(x1)} ${String(mid)}, ${String(x2)} ${String(mid)}, ${String(x2)} ${String(y2)}`}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={1.2}
                markerEnd="url(#research-graph-arrow)"
              />
            )
          }))}
        {nodes.map((node) => {
          const point = pos.get(node.id)
          if (point === undefined) return null
          const selected = node.id === selectedId
          return (
            <g
              key={node.id}
              transform={`translate(${String(point.x)},${String(point.y)})`}
              role="button"
              tabIndex={0}
              aria-label={`${node.id} ${node.label} ${node.state.text}`}
              style={{ cursor: 'pointer' }}
              onClick={() => { onSelect(node.id) }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(node.id)
                }
              }}
            >
              <title>{`${node.id} · ${node.label} · ${node.ownerName ?? '未指派'} · ${node.state.text}`}</title>
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={6}
                fill={fillOf(node)}
                stroke={selected ? '#6366f1' : '#cbd5e1'}
                strokeWidth={selected ? 2 : 1}
                opacity={node.status === 'unplanned' ? 0.75 : 1}
              />
              <text x={8} y={13} fontSize={10} fontWeight={600} fill="#0f172a">{node.id}</text>
              <text x={8} y={25} fontSize={9} fill="#475569">{shortLabel(node.label)}</text>
              <circle cx={NODE_W - 10} cy={10} r={3} fill={node.state.color} />
              {(childCounts.get(node.id) ?? 0) > 0 && (
                <text x={NODE_W - 8} y={28} textAnchor="end" fontSize={8} fill="#6366f1">
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
