/**
 * StartCard — 产品首屏起步卡（D38）：用户打开 blank Session 时，告诉他这是什么、从哪开始、
 * 当前工作区、凭据与观察/交付入口。只在"工作区还没有 run bundle"且"会话还没有用户消息"时显示。
 *
 * 边界：Client 渲染，不进模型请求；不写浏览器持久化/插件账本/会话事件；工作区
 * 读失败时仍显示（不阻塞 composer），有 drt_* 或用户消息后收起。
 */
import { useEffect, useState, type CSSProperties, type ReactElement } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { shouldShowStartCard } from '../lib/start-card.ts'

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

const styles = {
  root: {
    margin: '0 0 10px',
    padding: '14px 16px',
    border: '1px solid var(--dsh-border, rgba(127,127,127,.28))',
    borderRadius: 10,
    background: 'var(--dsh-surface, transparent)',
    fontSize: 13,
    lineHeight: 1.65,
    display: 'grid',
    gap: 4,
  },
  title: { fontWeight: 600, fontSize: 14 },
  muted: { opacity: 0.72, fontSize: 12 },
} satisfies Record<string, CSSProperties>

/**
 * 首屏起步卡。
 * @param props - dock props + 注入面。
 */
export function StartCard({
  sessionId, workspaceTitle, workspacePath, listDir, hasUserMessage, chooseWorkspace, t,
}: StartCardProps): ReactElement | null {
  const [visible, setVisible] = useState<'loading' | 'show' | 'hide'>('loading')
  const [choosing, setChoosing] = useState(false)
  const [chooseError, setChooseError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    void (async () => {
      try {
        const userMessage = await hasUserMessage(sessionId)
        const entries = userMessage ? [] : await listDir(sessionId, '', controller.signal)
        if (cancelled) return
        setVisible(shouldShowStartCard({ hasUserMessage: userMessage, entries }) ? 'show' : 'hide')
      } catch {
        // 工作区/会话数据不可达不是首屏红错：仍显示起步卡，composer 不受影响。
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
    <section data-testid="deep-research-start" aria-label={t('startAria')} style={styles.root}>
      <div style={styles.title}>{t('startTitle')}</div>
      <div>
        {t('startWorkspace')}: <span data-testid="deep-research-start-workspace">{workspace}</span>
      </div>
      {workspacePath !== null && workspacePath !== workspace ? <div style={styles.muted}>{workspacePath}</div> : null}
      <div>{t('startStep1')}</div>
      <div>{t('startStep2')}</div>
      <div>{t('startStep3')}</div>
      <div style={styles.muted}>{t('startCredentials')}</div>
      <div style={styles.muted}>{t('startChooseWorkspaceHint')}</div>
      <div>
        <button
          type="button"
          data-testid="deep-research-choose-workspace"
          disabled={choosing}
          onClick={() => {
            if (choosing) return
            setChoosing(true)
            setChooseError(null)
            void chooseWorkspace()
              .catch((error: unknown) => setChooseError(t('startChooseWorkspaceFailed', { detail: (error as Error).message })))
              .finally(() => setChoosing(false))
          }}
        >
          {choosing ? t('startChoosingWorkspace') : t('startChooseWorkspace')}
        </button>
      </div>
      {chooseError === null ? null : <div style={styles.muted} role="alert">{chooseError}</div>}
    </section>
  )
}
