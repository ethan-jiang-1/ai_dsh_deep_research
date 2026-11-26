// ResearchTabMenuItem.tsx — 右栏研究页签动作菜单尾部项（sidebar.right.tab.menu.item）：
// 仅在五类研究页签上显示「打开研究工作台」，其它页签（Files/Diff 等）返回 null。
import type { ReactNode } from 'react'
import { IconSearchOutlineRegular, MenuItemButton } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  RESEARCH_CONFIG_TAB_KIND,
  RESEARCH_EVIDENCE_KIND,
  RESEARCH_FINAL_KIND,
  RESEARCH_GRAPH_TAB_KIND,
  RESEARCH_STATUS_TAB_KIND,
} from './keys.ts'

const RESEARCH_TAB_KINDS = new Set<string>([
  RESEARCH_STATUS_TAB_KIND,
  RESEARCH_GRAPH_TAB_KIND,
  RESEARCH_CONFIG_TAB_KIND,
  RESEARCH_FINAL_KIND,
  RESEARCH_EVIDENCE_KIND,
])

export interface ResearchTabMenuItemInjected {
  readonly openHub: () => void
}

export type ResearchTabMenuItemProps =
  PropsRuntime<'sidebar.right.tab.menu.item'>
  & PropsLocale<'deepResearchPack'>
  & ResearchTabMenuItemInjected

/** 右栏研究页签的菜单扩展项。 */
export function ResearchTabMenuItem(props: ResearchTabMenuItemProps): ReactNode {
  if (!RESEARCH_TAB_KINDS.has(props.tab.kind)) return null
  return (
    <MenuItemButton
      separatorBefore
      icon={<IconSearchOutlineRegular size={14} />}
      onSelect={() => {
        props.openHub()
        props.dismiss()
      }}
    >
      {props.t('tabMenuOpenHub')}
    </MenuItemButton>
  )
}
