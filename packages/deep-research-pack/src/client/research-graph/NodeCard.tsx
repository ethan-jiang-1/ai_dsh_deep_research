// NodeCard.tsx — 「研究图谱」的节点卡（列表里的一行 + 展开详情）。
//
// 从 ResearchGraphTab.tsx 原样切出（2026-10-28 Phase C）：卡片是自包含的展示件（吃一个
// GraphNodeView + 几个回调/上下文），此前以闭包形式埋在 400 行组件里。切出后改"卡片长什么样"
// 只读本件；父级只负责图数据与选中态。
import type { ReactNode } from 'react'
import type { UseSessions, UseSessionStatus } from '@deepseek-ai/dsh-client-ui-session/client'
import type { PlanNode } from '../../lib/plan-graph.ts'
import type { GraphNodeState } from '../../lib/graph-model.ts'
import type { GraphNodeView } from './types.ts'
import { WorkerChips } from './WorkerChips.tsx'
import { BUTTON_STYLE, CARD_STYLE, MUTED_STYLE } from './styles.ts'
import { shortLabel, severityIcon } from './format.ts'


/** plan.md 节点在 detail 里的只读摘要（只显示真实读到的列）。 */
function planLines(node: PlanNode): ReactNode {
  return (
    <>
      <div style={{ opacity: 0.8 }}>
        plan：{node.id}
        {node.kind !== undefined ? ` · ${node.kind}` : ''}
        {node.stage !== undefined ? ` · stage ${node.stage}` : ''}
        {node.depth !== undefined ? ` · depth ${node.depth}` : ''}
        {node.ownerRole !== undefined ? ` · plan owner ${node.ownerRole}` : ''}
      </div>
      {node.question !== undefined && <div style={{ opacity: 0.8 }}>question：{node.question}</div>}
      {node.deps.length > 0 && <div style={{ opacity: 0.8 }}>plan deps：{node.deps.join(', ')}</div>}
      {node.output !== undefined && <div style={{ opacity: 0.8 }}>output：{node.output}</div>}
      {node.acceptance !== undefined && <div style={{ opacity: 0.8 }}>acceptance：{node.acceptance}</div>}
    </>
  )
}

export function NodeCard(props: {
  readonly node: GraphNodeView
  readonly expanded: boolean
  readonly onToggle: () => void
  readonly copied: boolean
  readonly onCopy: () => void
  readonly onOpenOwner?: () => void
  readonly children: readonly PlanNode[]
  readonly childStateOf: (childId: string) => GraphNodeState
  readonly leadSessionId: string
  readonly useSessions: UseSessions
  readonly useSessionStatus: UseSessionStatus
  readonly boundSlug: string | null
}): ReactNode {
  const { node, expanded, onToggle, copied, onCopy, onOpenOwner, children: childNodes, childStateOf, leadSessionId, useSessions, useSessionStatus, boundSlug } = props
    const task = node.task
    const planNode = node.planNode
    const member = node.member
    return (
      <article key={node.id} id={`research-graph-${node.id}`} style={{ ...CARD_STYLE, borderLeft: `3px solid ${node.state.color}` }}>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={onToggle}
          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit' }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 13 }}>{node.id}</strong>
            {planNode?.kind !== undefined && <span style={{ fontSize: 11, opacity: 0.65 }}>{planNode.kind}</span>}
            {planNode?.stage !== undefined && <span style={{ fontSize: 10, opacity: 0.55 }}>stage {planNode.stage}</span>}
            {childNodes.length > 0 && <span style={{ fontSize: 10, color: '#6366f1' }}>内部 {String(childNodes.length)}</span>}
            <span style={{ fontSize: 12, flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{shortLabel(node.subject, 72)}</span>
            <span style={{ fontSize: 11, color: node.state.color, whiteSpace: 'nowrap' }}>{node.state.icon} {node.state.text}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, opacity: 0.65, marginTop: 2 }}>
            <span>owner：{node.ownerName ?? '未指派'}</span>
            {node.blockedBy.length > 0 && <span>deps：{node.blockedBy.join(', ')}</span>}
            {planNode?.depth !== undefined && <span>depth：{planNode.depth}</span>}
            {task !== undefined && <span>task：{task.id}</span>}
            {member !== undefined && (
              <WorkerChips memberId={member.id} useSessions={useSessions} useSessionStatus={useSessionStatus} />
            )}
          </div>
        </button>
        {expanded && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #00000010', fontSize: 12, lineHeight: 1.6 }}>
            {task?.description !== undefined && task.description !== '' && (
              <div style={{ whiteSpace: 'pre-wrap', opacity: 0.85, maxHeight: 120, overflowY: 'auto', paddingRight: 4 }}>{task.description}</div>
            )}
            <div style={{ opacity: 0.8 }}>owner：{node.ownerName ?? '未指派'}{member !== undefined ? `（${member.phase}）` : ''}</div>
            {node.blockedBy.length > 0 && <div style={{ opacity: 0.8 }}>依赖：{node.blockedBy.join(', ')}</div>}
            {task !== undefined && <div style={{ opacity: 0.8 }}>revision：{task.revision}{task.ready ? ' · ready' : ''}</div>}
            {planNode !== undefined
              ? planLines(planNode)
              : <div style={{ opacity: 0.5 }}>plan.md 未记录此节点（旧 run；rerun 时会生成 plan）</div>}
            {childNodes.length > 0 && (
              <div style={{ marginTop: 4, padding: '4px 6px', border: '1px solid #6366f126', borderRadius: 4, background: '#6366f108' }}>
                <div style={{ fontSize: 11, color: '#6366f1', marginBottom: 2 }}>内部节点（复合展开，只读）</div>
                {childNodes.map((child) => {
                  // 子节点同样走四态词表：没有映射 = 状态未知，不是未执行。
                  const childState = childStateOf(child.id)
                  return (
                    <div key={child.id} style={{ fontSize: 11, opacity: 0.85 }}>
                      <strong>{child.id}</strong>
                      {child.kind !== undefined ? ` · ${child.kind}` : ''}
                      {` · ${childState.icon} ${childState.text}`}
                      {child.ownerRole !== undefined ? ` · ${child.ownerRole}` : ''}
                      {child.deps.length > 0 ? ` · deps ${child.deps.join(', ')}` : ''}
                    </div>
                  )
                })}
              </div>
            )}
            {node.attention !== undefined && <div style={{ color: '#b45309', marginTop: 2 }}>{severityIcon(node.attention.severity)} {node.attention.message}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {onOpenOwner !== undefined && member !== undefined && member.id !== leadSessionId
                && member.phase !== 'failed' && member.phase !== 'provisioning' && (
                <button type="button" style={BUTTON_STYLE} onClick={() => { onOpenOwner?.() }}>打开负责人</button>
              )}
              <button
                type="button"
                style={BUTTON_STYLE}
                title={boundSlug !== null ? `复制 drt_${boundSlug}/${node.id}，粘贴到对话引用这个节点` : `复制 ${node.id}`}
                onClick={onCopy}
              >{copied ? '已复制' : '复制引用'}</button>
              <span style={MUTED_STYLE}>只读观察；调整请在对话里进行或 rerun。</span>
            </div>
          </div>
        )}
      </article>
    )
}
