/**
 * 研究语义工具卡（S2 + R2.3 富语义升级）：
 * - `web_search` / `web_fetch`：用 DSH 原生 `<WebBlock>` 渲染命中网页列表、站点图标与状态码；
 * - 组队与子代理委派：渲染角色徽章、波次/复核标记、目标摘要与一键跳转队员子会话按钮；
 * - 进行中 / 异常 / 非标载荷：有界纯文本回退，彻底告别裸 JSON `<pre>` 堆砌。
 */
import { useMemo, useState, type ReactNode } from 'react'
import {
  Button,
  DisclosureRow,
  IconRightUpOutlineRegular,
  StateDot,
  Tag,
  WebBlock,
  type StateDotState,
  type WebBlockLabels,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type { TeamProjection } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { cardStateOf, cardTitleOf, parseArgsObject, toolResultBodyOf } from '../lib/events/tool-card.ts'
import css from './ResearchToolCard.module.css'

export interface ResearchToolCardInjected {
  readonly openMember?: (leadSessionId: SessionId, memberId: SessionId) => void
}

type ResearchToolCardProps = ToolCallViewProps
  & PropsLocale<'deepResearchPack'>
  & ResearchToolCardInjected
  & {
    readonly useSessions?: <T>(selector: (state: {
      readonly projectionsBySession?: Readonly<Record<string, { readonly values?: { readonly agentTeam?: TeamProjection } }>>
    }) => T) => T
  }

const DOT_STATE: Record<string, StateDotState | undefined> = {
  running: 'ongoing',
  ok: 'done',
  error: 'error',
  stopped: 'warning',
}

function useEmptyTeam<T>(selector: (state: {
  readonly projectionsBySession?: Readonly<Record<string, { readonly values?: { readonly agentTeam?: TeamProjection } }>>
}) => T): T {
  return selector({})
}

export function ResearchToolCard(props: ResearchToolCardProps): ReactNode {
  const { t } = props
  const [open, setOpen] = useState(false)
  const state = cardStateOf(props.block)
  const unknown = state === 'stopped'
  const settled = 'kind' in props.block
  const source = settled ? props.block.call : props.block
  const argsRaw = (source !== undefined && source !== null && 'argsRaw' in source ? source.argsRaw : undefined) ?? ''
  const parsedArgs = useMemo(() => parseArgsObject(argsRaw), [argsRaw])
  const title = unknown
    ? t('toolOutcomeUnknown')
    : cardTitleOf(props.toolName, parsedArgs, argsRaw, t)
  const richBody = useMemo(
    () => (unknown ? null : toolResultBodyOf(props.toolName, props.block, parsedArgs, argsRaw)),
    [unknown, props.toolName, props.block, parsedArgs, argsRaw],
  )
  const useSessionsHook = props.useSessions ?? useEmptyTeam
  const team: TeamProjection | undefined = useSessionsHook(
    (s) => props.sessionId === undefined ? undefined : s.projectionsBySession?.[props.sessionId]?.values?.agentTeam,
  )

  const webLabels: WebBlockLabels = useMemo(() => ({
    noResults: t('toolWebNoResults'),
    sourcesTruncated: t('toolWebSourcesTruncated'),
    http: 'HTTP',
    contentTruncated: t('toolWebContentTruncated'),
    markdown: {
      code: {
        copyLabel: t('copy'),
        copiedLabel: t('copied'),
        toolbarLabels: {
          codeLabel: t('codeLabel'),
          wrapLabel: t('wrapLabel'),
          unwrapLabel: t('unwrapLabel'),
        },
      },
      footnotes: t('footnotes'),
    },
  }), [t])

  const matchedMember = richBody?.kind === 'delegation' && team !== undefined
    ? team.members.find((m) => m.name === richBody.roleName)
    : undefined

  const expandable = richBody !== null
  return (
    <div className={css.card} data-tool-name={props.toolName} data-tool-state={state} data-tool-body={richBody?.kind ?? 'none'}>
      <DisclosureRow
        icon={<StateDot state={DOT_STATE[state] ?? 'warning'} />}
        title={title}
        open={open}
        expandable={expandable}
        running={state === 'running'}
        expandOnRowClick={expandable}
        onToggle={() => setOpen((current) => !current)}
      >
        {richBody?.kind === 'web-search' && (
          <div className={css.webWrap} data-testid="tool-card-web-search">
            <WebBlock
              kind="search"
              labels={webLabels}
              answer={richBody.answer}
              sources={[...richBody.sources]}
              truncated={richBody.truncated}
            />
          </div>
        )}
        {richBody?.kind === 'web-fetch' && (
          <div className={css.webWrap} data-testid="tool-card-web-fetch">
            <WebBlock
              kind="fetch"
              labels={webLabels}
              url={richBody.url}
              statusCode={richBody.statusCode}
              truncated={richBody.truncated}
            />
          </div>
        )}
        {richBody?.kind === 'delegation' && (
          <div className={css.delegationBox} data-testid="tool-card-delegation">
            <div className={css.delegationHead}>
              <Tag tone="info">{richBody.roleName}</Tag>
              <Tag tone="outline">
                {richBody.mode === 'teammate' ? props.t('toolRoleTeammate') : props.t('toolRoleWorker')}
              </Tag>
              {richBody.waveHint !== null && <Tag tone="neutral">{richBody.waveHint}</Tag>}
              {matchedMember !== undefined && props.openMember !== undefined && props.sessionId !== undefined && (
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="tool-card-open-member"
                  onClick={() => props.openMember?.(props.sessionId as SessionId, matchedMember.id)}
                >
                  <IconRightUpOutlineRegular size={12} />
                  <span>{props.t('statusOpenMemberSession', { name: richBody.roleName })}</span>
                </Button>
              )}
            </div>
            {richBody.goalSummary !== '' && (
              <div className={css.delegationGoal}>{richBody.goalSummary}</div>
            )}
          </div>
        )}
        {richBody?.kind === 'fallback' && (
          <div className={css.fallbackText}>{richBody.text}</div>
        )}
      </DisclosureRow>
    </div>
  )
}
