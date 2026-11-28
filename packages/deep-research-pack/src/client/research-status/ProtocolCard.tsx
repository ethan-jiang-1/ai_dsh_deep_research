import type { ReactNode } from 'react'
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { ProtocolFace } from '../../lib/run/protocol-fold.ts'
import type { Authority, EffortBand, Recency, SourceFamily } from '../../lib/workspace/research-defaults.ts'
import { displayNameOf } from '../builtin-display.ts'
import { AUTHORITY_LABEL, DEPTH_LABEL, FAMILY_LABEL, RECENCY_LABEL } from '../defaults/labels.ts'
import css from './status.module.css'

function protocolStatusText(status: string, t: TranslateNS<'deepResearchPack'>): string {
  if (status === 'approved') return t('statusProtocolApproved')
  if (status === 'draft') return t('statusProtocolDraft')
  if (status === 'superseded') return t('statusProtocolSuperseded')
  return status
}

function protocolEffortText(band: string, t: TranslateNS<'deepResearchPack'>): string {
  const key = (DEPTH_LABEL as Readonly<Record<string, typeof DEPTH_LABEL[EffortBand]>>)[band]
  return key !== undefined ? t(key) : band
}

function protocolScopeText(
  scope: NonNullable<NonNullable<ProtocolFace['contract']>['sourceScope']>,
  t: TranslateNS<'deepResearchPack'>,
): string {
  const familyMap = FAMILY_LABEL as Readonly<Record<string, typeof FAMILY_LABEL[SourceFamily]>>
  const authMap = AUTHORITY_LABEL as Readonly<Record<string, typeof AUTHORITY_LABEL[Authority]>>
  const recencyMap = RECENCY_LABEL as Readonly<Record<string, typeof RECENCY_LABEL[Recency]>>
  const parts: string[] = []
  for (const f of scope.families) {
    const k = familyMap[f]
    parts.push(k !== undefined ? t(k) : f)
  }
  if (scope.authority !== null) {
    const k = authMap[scope.authority]
    parts.push(k !== undefined ? t(k) : scope.authority)
  }
  if (scope.recency !== null) {
    const k = recencyMap[scope.recency]
    parts.push(k !== undefined ? t(k) : scope.recency)
  }
  return parts.join(' · ') || t('statusProtocolAuto')
}

function protocolCriticText(critic: string, t: TranslateNS<'deepResearchPack'>): string {
  if (critic === 'both') return t('statusProtocolCriticBoth')
  if (critic === 'report') return t('statusProtocolCriticReport')
  if (critic === 'claim') return t('statusProtocolCriticClaim')
  if (critic === 'light') return t('statusProtocolCriticLight')
  if (critic === 'none') return t('statusProtocolCriticNone')
  return critic
}

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
  const methodLabel = c.method === null
    ? null
    : (c.method.libraryName !== null && c.method.libraryName !== ''
      ? c.method.libraryName
      : displayNameOf(c.method.id, t))
  const gateParts = c.gates === null
    ? []
    : [
        c.gates.evidenceThreshold !== null ? `≥${c.gates.evidenceThreshold}` : null,
        c.gates.claimVerification === 'on' ? t('statusProtocolClaimsOn') : null,
        c.gates.critic !== null ? protocolCriticText(c.gates.critic, t) : null,
      ].filter((item): item is string => item !== null && item !== '')
  return (
    <div className={css.protocolCard} data-testid="research-protocol-card" data-protocol-state="ok">
      <div className={css.protocolHeader}>
        <strong className={css.protocolTitle}>{t('statusProtocolTitle')}</strong>
        <Tag tone={statusTone}>{protocolStatusText(c.status, t)}</Tag>
        {c.version !== null && <span className={css.versionTag}>v{String(c.version)}</span>}
      </div>
      <div className={css.protocolGrid}>
        {methodLabel !== null && (
          <div><span className={css.protocolKey}>{t('statusProtocolMethod')}</span> {methodLabel}</div>
        )}
        {c.effort?.band !== null && c.effort?.band !== undefined && (
          <div>
            <span className={css.protocolKey}>{t('statusProtocolEffort')}</span> {protocolEffortText(c.effort.band, t)}
            {c.effort.nodesMax !== null ? ` (${t('statusProtocolNodesMax', { count: String(c.effort.nodesMax) })})` : ''}
          </div>
        )}
        {c.sourceScope !== null && (
          <div>
            <span className={css.protocolKey}>{t('statusProtocolScope')}</span> {protocolScopeText(c.sourceScope, t)}
          </div>
        )}
        {gateParts.length > 0 && (
          <div>
            <span className={css.protocolKey}>{t('statusProtocolGates')}</span> {gateParts.join(' · ')}
          </div>
        )}
      </div>
    </div>
  )
}
