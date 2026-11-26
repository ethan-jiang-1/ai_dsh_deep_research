import type { ReactNode } from 'react'
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { ProtocolFace } from '../../lib/run/protocol-fold.ts'
import css from './status.module.css'

/**
 * HITL1 研究契约摘要卡：展示 `protocol.json` 解码后的研究方法、信源范围、深度预算与质量门槛；
 * 当读取异常/空/非法时显性降级并带重试入口。
 */
export function ProtocolCard(props: {
  readonly protocol: ProtocolFace
  readonly hitlPending: boolean
  readonly onRetry: () => void
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { protocol, hitlPending, onRetry, t } = props
  if (protocol.state === 'absent') {
    if (!hitlPending) return null
    return (
      <div className={css.protocolCard} data-testid="research-protocol-card" data-protocol-state="absent">
        <div className={css.protocolHeader}>
          <strong className={css.protocolTitle}>{t('statusProtocolTitle')}</strong>
          <Tag tone="warning">{t('statusProtocolDraft')}</Tag>
        </div>
        <div className={css.mutedInline}>{t('statusProtocolAbsent')}</div>
      </div>
    )
  }
  if (protocol.state !== 'ok' || protocol.contract === null) {
    const isEmpty = protocol.state === 'empty'
    const isUnreadable = protocol.state === 'unreadable'
    const tagTone = isEmpty ? 'warning' : 'danger'
    const tagKey = isEmpty
      ? 'statusProtocolEmptyTag'
      : isUnreadable
        ? 'statusProtocolUnreadableTag'
        : 'statusProtocolInvalid'
    const bodyKey = isEmpty
      ? 'statusProtocolEmpty'
      : isUnreadable
        ? 'statusProtocolUnreadable'
        : 'statusProtocolInvalidBody'
    return (
      <div className={css.protocolCard} data-testid="research-protocol-card" data-protocol-state={protocol.state}>
        <div className={css.protocolHeader}>
          <strong className={css.protocolTitle}>{t('statusProtocolTitle')}</strong>
          <Tag tone={tagTone}>{t(tagKey)}</Tag>
          <Button variant="ghost" size="sm" onClick={onRetry}>{t('retry')}</Button>
        </div>
        <div className={css.warnText}>{t(bodyKey)}</div>
      </div>
    )
  }
  const c = protocol.contract
  const statusTone = c.status === 'approved' ? 'success' : 'warning'
  return (
    <div className={css.protocolCard} data-testid="research-protocol-card" data-protocol-state="ok">
      <div className={css.protocolHeader}>
        <strong className={css.protocolTitle}>{t('statusProtocolTitle')}</strong>
        <Tag tone={statusTone}>{c.status}</Tag>
        {c.version !== null && <span className={css.versionTag}>v{String(c.version)}</span>}
      </div>
      <div className={css.protocolGrid}>
        {c.method !== null && (
          <div><span className={css.protocolKey}>{t('statusProtocolMethod')}</span> {c.method.id}</div>
        )}
        {c.effort?.band !== null && c.effort?.band !== undefined && (
          <div>
            <span className={css.protocolKey}>{t('statusProtocolEffort')}</span> {c.effort.band}
            {c.effort.nodesMax !== null ? ` (≤${String(c.effort.nodesMax)} nodes)` : ''}
          </div>
        )}
        {c.sourceScope !== null && (
          <div>
            <span className={css.protocolKey}>{t('statusProtocolScope')}</span> {[...c.sourceScope.families, c.sourceScope.authority, c.sourceScope.recency].filter(Boolean).join(' · ') || 'auto'}
          </div>
        )}
        {c.gates !== null && (
          <div>
            <span className={css.protocolKey}>{t('statusProtocolGates')}</span> {[c.gates.evidenceThreshold !== null ? `>=${c.gates.evidenceThreshold}` : null, c.gates.claimVerification === 'on' ? 'claims' : null, c.gates.critic].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    </div>
  )
}
