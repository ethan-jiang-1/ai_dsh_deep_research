// NodeCard.tsx — 「研究图谱」的节点卡（列表里的一行 + 展开详情）。
//
// 从 ResearchGraphTab.tsx 原样切出（2026-10-28 Phase C）：卡片是自包含的展示件（吃一个
// GraphNodeView + 几个回调/上下文），此前以闭包形式埋在 400 行组件里。切出后改"卡片长什么样"
// 只读本件；父级只负责图数据与选中态。
import type { ReactNode } from 'react'
import type { UseSessions, UseSessionStatus } from '@deepseek-ai/dsh-client-ui-session/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { PlanNode } from '../../lib/plan/plan-index.ts'
import type { GraphNodeState } from '../../lib/plan/graph-model.ts'
import type { GraphNodeView } from './types.ts'
import { WorkerChips } from './WorkerChips.tsx'
import { shortLabel, severityIcon } from './format.ts'
import styles from './graph.module.css'


/** plan.md 节点在 detail 里的只读摘要（只显示真实读到的列）。 */
function planLines(node: PlanNode): ReactNode {
  return (
    <>
      <div className={styles.nodeDetailLine}>
        plan: {node.id}
        {node.kind !== undefined ? ` · ${node.kind}` : ''}
        {node.stage !== undefined ? ` · stage ${node.stage}` : ''}
        {node.depth !== undefined ? ` · depth ${node.depth}` : ''}
        {node.ownerRole !== undefined ? ` · plan owner ${node.ownerRole}` : ''}
      </div>
      {node.question !== undefined && <div className={styles.nodeDetailLine}>question: {node.question}</div>}
      {node.deps.length > 0 && <div className={styles.nodeDetailLine}>plan deps: {node.deps.join(', ')}</div>}
      {node.output !== undefined && <div className={styles.nodeDetailLine}>output: {node.output}</div>}
      {node.acceptance !== undefined && <div className={styles.nodeDetailLine}>acceptance: {node.acceptance}</div>}
    </>
  )
}

export function NodeCard(props: {
  readonly node: GraphNodeView
  readonly expanded: boolean
  readonly onToggle: () => void
  readonly copied: boolean
  readonly onCopy: () => void
  readonly inserted?: boolean
  readonly onInsertRef?: () => void
  readonly onOpenOwner?: () => void
  readonly cardRef?: (el: HTMLElement | null) => void
  readonly children: readonly PlanNode[]
  readonly childStateOf: (childId: string) => GraphNodeState
  readonly leadSessionId: string
  readonly useSessions: UseSessions
  readonly useSessionStatus: UseSessionStatus
  readonly boundSlug: string | null
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { node, expanded, onToggle, copied, onCopy, inserted = false, onInsertRef, onOpenOwner, cardRef, children: childNodes, childStateOf, leadSessionId, useSessions, useSessionStatus, boundSlug, t } = props
    const task = node.task
    const planNode = node.planNode
    const member = node.member
    return (
      <article key={node.id} ref={cardRef} className={styles.cardBox} style={{ borderLeft: `3px solid ${node.state.color}` }}>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={onToggle}
          className={styles.nodeCardBtn}
        >
          <div className={styles.nodeCardHead}>
            <strong className={styles.nodeId}>{node.id}</strong>
            {planNode?.kind !== undefined && <span className={styles.nodeKind}>{planNode.kind}</span>}
            {planNode?.stage !== undefined && <span className={styles.nodeStage}>stage {planNode.stage}</span>}
            {childNodes.length > 0 && <span className={styles.internalCount}>{t('graphInternalCount', { count: String(childNodes.length) })}</span>}
            <span className={styles.nodeSubject}>{shortLabel(node.subject, 72)}</span>
            <span className={styles.nodeStateLabel} style={{ color: node.state.color }}>{node.state.icon} {node.state.text}</span>
          </div>
          <div className={styles.nodeMetaRow}>
            <span>{t('graphOwner', { name: node.ownerName ?? t('graphUnassignedOwner') })}</span>
            {node.blockedBy.length > 0 && <span>deps: {node.blockedBy.join(', ')}</span>}
            {planNode?.depth !== undefined && <span>depth: {planNode.depth}</span>}
            {task !== undefined && <span>task: {task.id}</span>}
            {member !== undefined && (
              <WorkerChips memberId={member.id} useSessions={useSessions} useSessionStatus={useSessionStatus} />
            )}
          </div>
        </button>
        {expanded && (
          <div className={styles.planBody}>
            {task?.description !== undefined && task.description !== '' && (
              <div className={styles.nodeDesc}>{task.description}</div>
            )}
            <div className={styles.nodeDetailLine}>{t('graphOwner', { name: node.ownerName ?? t('graphUnassignedOwner') })}{member !== undefined ? ` (${member.phase})` : ''}</div>
            {node.blockedBy.length > 0 && <div className={styles.nodeDetailLine}>{t('graphDependency', { ids: node.blockedBy.join(', ') })}</div>}
            {task !== undefined && <div className={styles.nodeDetailLine}>revision: {task.revision}{task.ready ? ' · ready' : ''}</div>}
            {planNode !== undefined
              ? planLines(planNode)
              : <div className={styles.mutedSlug}>{t('graphNodeNotInPlan')}</div>}
            {childNodes.length > 0 && (
              <div className={styles.internalBox}>
                <div className={styles.internalLabel}>{t('graphInternalNodes')}</div>
                {childNodes.map((child) => {
                  // 子节点同样走四态词表：没有映射 = 状态未知，不是未执行。
                  const childState = childStateOf(child.id)
                  return (
                    <div key={child.id} className={styles.nodeChildRow}>
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
            {node.attention !== undefined && <div className={`${styles.warnText} ${styles.nodeAttentionGap}`}>{severityIcon(node.attention.severity)} {node.attention.message}</div>}
            <div className={styles.nodeActionsRow}>
              {onOpenOwner !== undefined && member !== undefined && member.id !== leadSessionId
                && member.phase !== 'failed' && member.phase !== 'provisioning' && (
                <button type="button" className={styles.actionButton} onClick={() => { onOpenOwner?.() }}>{t('graphOpenOwner')}</button>
              )}
              {onInsertRef !== undefined && (
                <button
                  type="button"
                  className={styles.actionButton}
                  data-testid="graph-insert-ref"
                  onClick={onInsertRef}
                >{inserted ? t('graphInsertedRef') : t('graphInsertRef')}</button>
              )}
              <button
                type="button"
                className={styles.actionButton}
                title={boundSlug !== null ? t('graphCopyRefTitle', { slug: boundSlug, id: node.id }) : t('graphCopyRefTitleBare', { id: node.id })}
                onClick={onCopy}
              >{copied ? t('graphCopied') : t('graphCopyRef')}</button>
              <span className={styles.mutedLine}>{t('graphReadOnlyHint')}</span>
            </div>
          </div>
        )}
      </article>
    )
}
