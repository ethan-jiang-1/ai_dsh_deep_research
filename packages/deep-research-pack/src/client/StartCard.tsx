/**
 * StartCard — 产品首屏起步卡（D38）：用户打开 blank Session 时，告诉他这是什么、从哪开始、
 * 当前工作区、凭据与观察/交付入口。只在"工作区还没有 run bundle"且"会话还没有用户消息"时显示。
 *
 * 边界：Client 渲染，不进模型请求；不写浏览器持久化/插件账本/会话事件；工作区
 * 读失败时仍显示（不阻塞 composer），有 drt_* 或用户消息后收起；模板按钮只预填草稿不提交。
 */
import { useEffect, useRef, useState, type ReactElement } from 'react'
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { InputActions } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { shouldShowStartCard } from '../lib/workspace/start-card.ts'
import { errorDetailOf } from '../lib/shared/error-detail.ts'
import css from './StartCard.module.css'

/** 注入面：会话身份、当前工作区、只读文件列表与一次性消息探测。 */
export interface StartCardInjected {
  sessionId: SessionId
  workspaceTitle: string | null
  workspacePath: string | null
  listDir: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<readonly { name: string }[]>
  hasUserMessage: (sessionId: SessionId) => Promise<boolean>
  chooseWorkspace: () => Promise<void>
}

/** Dock 组件的完整 props。 */
export type StartCardProps = PropsRuntime<'conversation.input.dock'> & PropsLocale<'deepResearchPack'> & StartCardInjected

const STARTER_TEMPLATES = [
  { id: 'landscape', titleKey: 'startTplLandscapeTitle', promptKey: 'startTplLandscapePrompt' },
  { id: 'tech', titleKey: 'startTplTechTitle', promptKey: 'startTplTechPrompt' },
  { id: 'fact-check', titleKey: 'startTplFactCheckTitle', promptKey: 'startTplFactCheckPrompt' },
  { id: 'compare', titleKey: 'startTplCompareTitle', promptKey: 'startTplComparePrompt' },
] as const

function fillComposerDraft(actions: InputActions | undefined, text: string): void {
  if (actions === undefined) return
  const span = actions.captureInsertion()
  if (!actions.insertText(text, span)) actions.setDraft(text)
}

/**
 * 首屏起步卡。
 * @param props - dock props + 注入面。
 */
export function StartCard(props: StartCardProps): ReactElement | null {
  const { sessionId, workspaceTitle, workspacePath, listDir, hasUserMessage, chooseWorkspace, t } = props
  const inputActions = (props as { inputActions?: InputActions }).inputActions
  const [visible, setVisible] = useState<'loading' | 'show' | 'hide'>('loading')
  const [choosing, setChoosing] = useState(false)
  const [chooseError, setChooseError] = useState<string | null>(null)
  /** 目录选择请求代次：切会话/重复点击后，旧 promise 的结算不得改写当前 UI（BUG-409）。 */
  const chooseTokenRef = useRef(0)
  useEffect(() => {
    // 会话切换 = 本地瞬态的一代结束：复位进行态与错误条，并让在途请求的结果失效。
    chooseTokenRef.current += 1
    setChoosing(false)
    setChooseError(null)
  }, [sessionId])
  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    void (async () => {
      try {
        const userMessage = await hasUserMessage(sessionId)
        // workspaceFiles.list 拒绝空路径（gateway/bad-request）；`''` = 工作区根，映射成 `.`。
        const entries = userMessage ? [] : await listDir(sessionId, '.', controller.signal)
        if (cancelled) return
        setVisible(shouldShowStartCard({ hasUserMessage: userMessage, entries }) ? 'show' : 'hide')
      } catch {
        /* @silent-catch: workspace/session unreachable is not a start-card blocker */
        if (!cancelled) setVisible('show')
      }
    })()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [sessionId, listDir, hasUserMessage])

  if (visible !== 'show') return null
  const workspace = workspaceTitle ?? workspacePath ?? t('startWorkspaceUnknown')
  return (
    <section data-testid="deep-research-start" aria-label={t('startAria')} className={css.root}>
      <div className={css.header}>
        <span className={css.title}>{t('startTitle')}</span>
        <Tag tone="info">{t('startTeamBadge')}</Tag>
      </div>
      <div className={css.workspaceRow}>
        <div className={css.workspaceInfo}>
          <div className={css.workspaceLabel}>
            {t('startWorkspace')}: <span data-testid="deep-research-start-workspace">{workspace}</span>
          </div>
          {workspacePath !== null && workspacePath !== workspace ? <div className={css.muted}>{workspacePath}</div> : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          data-testid="deep-research-choose-workspace"
          disabled={choosing}
          onClick={() => {
            if (choosing) return
            const token = ++chooseTokenRef.current
            setChoosing(true)
            setChooseError(null)
            void chooseWorkspace()
              .catch((error: unknown) => {
                if (chooseTokenRef.current !== token) return
                setChooseError(t('startChooseWorkspaceFailed', { detail: errorDetailOf(error) }))
              })
              .finally(() => {
                if (chooseTokenRef.current === token) setChoosing(false)
              })
          }}
        >
          {choosing ? t('startChoosingWorkspace') : t('startChooseWorkspace')}
        </Button>
      </div>
      {chooseError === null ? null : <div className={css.error} role="alert">{chooseError}</div>}
      <div className={css.steps}>
        <div>{t('startStep1')}</div>
        <div>{t('startStep2')}</div>
        <div>{t('startStep3')}</div>
      </div>
      <div className={css.templatesBlock}>
        <div className={css.muted}>{t('startTemplatesLabel')}</div>
        <div className={css.templatesGrid}>
          {STARTER_TEMPLATES.map((tpl) => (
            <Button
              key={tpl.id}
              variant="outline"
              size="sm"
              data-testid={`deep-research-start-template-${tpl.id}`}
              disabled={inputActions === undefined}
              onClick={() => fillComposerDraft(inputActions, t(tpl.promptKey))}
            >
              {t(tpl.titleKey)}
            </Button>
          ))}
        </div>
      </div>
      <div className={css.muted}>{t('startCredentials')}</div>
      <div className={css.muted}>{t('startChooseWorkspaceHint')}</div>
    </section>
  )
}
