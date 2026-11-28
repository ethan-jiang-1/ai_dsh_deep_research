/**
 * HeroResearchOptions.tsx —— 空白会话 Hero 控件行右侧快捷选配胶囊（`conversation.hero.options`）。
 *
 * 紧邻 DSH 原生工作区与 Deep Research Lead 选择器，提供「方法 / 视角 / 工作台」三枚克制触发器，
 * 让用户在开题位置两下完成选配，零额外壳层噪音。
 */
import type { ReactNode } from 'react'
import {
  IconBrowseOutlineRegular,
  IconInspectOutlineRegular,
  IconSkillOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { HubTab } from './ResearchHubPanel.tsx'
import css from './HeroResearchOptions.module.css'

export interface HeroResearchOptionsInjected {
  readonly openHubTab: (tab: HubTab) => void
}

export type HeroResearchOptionsProps =
  PropsRuntime<'conversation.hero.options'> & PropsLocale<'deepResearchPack'> & HeroResearchOptionsInjected

export function HeroResearchOptions({ openHubTab, t }: HeroResearchOptionsProps): ReactNode {
  return (
    <div className={css.bar} data-testid="deep-research-hero-options">
      <button
        type="button"
        className={css.chip}
        data-testid="hero-opt-methods"
        onClick={() => { openHubTab('methods') }}
      >
        <IconSkillOutlineRegular size={13} />
        <span>{t('heroOptionMethods')}</span>
      </button>
      <button
        type="button"
        className={css.chip}
        data-testid="hero-opt-lenses"
        onClick={() => { openHubTab('lenses') }}
      >
        <IconInspectOutlineRegular size={13} />
        <span>{t('heroOptionLenses')}</span>
      </button>
      <button
        type="button"
        className={css.chip}
        data-testid="hero-opt-hub"
        onClick={() => { openHubTab('runs') }}
      >
        <IconBrowseOutlineRegular size={13} />
        <span>{t('heroOptionHub')}</span>
      </button>
    </div>
  )
}
