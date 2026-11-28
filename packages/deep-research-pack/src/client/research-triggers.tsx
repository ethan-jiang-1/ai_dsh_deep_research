/**
 * research-triggers.tsx —— Composer `@` 研究上下文触发源 + 已发送消息 `ReferenceChip` 渲染器。
 *
 * - 键入 `@`：若当前会话绑定研究档案（通过 Host `researchRun` 投影零 N+1 获知 `slug`），
 *   补全该 run 下的 `evidence/*.md` 证据卡与 `plan.md` 计划节点（`W#.#`），选中插入原子引用胶囊；
 * - 点击草稿或已发送消息里的研究引用胶囊：直接打开对应「证据卡」或「研究图谱」页签，免提交、不丢草稿。
 */
import type { ReactNode } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type {
  UserTextNodeProps,
  UserTextRule,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {
  InputTriggerCandidate,
  InputTriggerServiceContract,
  InputTriggerSource,
} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { IconBranchOutlineRegular, ReferenceChip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { isEvidenceCardName } from '../lib/run/artifact-content.ts'
import { readArtifact } from '../lib/run/artifact-read.ts'
import { openRun, type RunSource } from '../lib/run/run-context.ts'
import { planIndex } from '../lib/plan/plan-index.ts'
import { selectSessionResearchProjection } from '../lib/events/research-projection.ts'
import {
  findNextResearchRef,
  formatEvidenceMention,
  formatPlanNodeMention,
  parseResearchRefToken,
} from '../lib/events/research-references.ts'
import {
  RESEARCH_TRIGGER_SOURCE,
  RESEARCH_USER_TEXT_NODE_KEY,
} from './keys.ts'

export interface ResearchRefNodeData {
  readonly kind: 'evidence' | 'plan_node'
  readonly slug: string
  readonly label: string
  readonly raw: string
  readonly cardName?: string
  readonly nodeId?: string
}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface UserTextDataMap {
    researchRef: ResearchRefNodeData
  }
}

/** 已发送用户消息中的研究引用识别规则（匹配 `drt_<slug>/evidence/*.md` 与 `drt_<slug>/W#.#`）。 */
export const researchReferenceRule: UserTextRule<'researchRef'> = {
  id: RESEARCH_USER_TEXT_NODE_KEY,
  order: 5,
  match(text, from) {
    const hit = findNextResearchRef(text, from)
    if (hit === undefined) return undefined
    const target = hit.target
    const data: ResearchRefNodeData = target.kind === 'evidence'
      ? {
        kind: 'evidence',
        slug: target.slug,
        label: target.cardName,
        raw: target.raw,
        cardName: target.cardName,
      }
      : {
        kind: 'plan_node',
        slug: target.slug,
        label: target.nodeId,
        raw: target.raw,
        nodeId: target.nodeId,
      }
    return {
      id: RESEARCH_USER_TEXT_NODE_KEY,
      start: hit.start,
      end: hit.end,
      data,
    }
  },
}

export interface ResearchRefChipInjected {
  readonly openEvidence: (sessionId: SessionId, runDir: string, cardFile: string) => void
  readonly openGraph: () => void
}

type ResearchRefChipProps = UserTextNodeProps<'researchRef'>
  & InjectFace<ResearchRefChipInjected>
  & PropsLocale<'deepResearchPack'>

/** 已发送消息中的研究引用胶囊（点击直达证据卡或研究图谱，复制/编辑保留原文）。 */
export function ResearchRefChip({ node, raw, interactive, sessionId, openEvidence, openGraph }: ResearchRefChipProps): ReactNode {
  const { kind, slug, label, cardName } = node.data
  const activate = () => {
    if (kind === 'evidence' && cardName !== undefined && sessionId !== undefined) {
      openEvidence(sessionId, `drt_${slug}`, cardName)
      return
    }
    openGraph()
  }
  return (
    <ReferenceChip
      appearance="file"
      label={label}
      title={raw}
      {...(interactive ? { onActivate: activate } : {})}
    />
  )
}

export interface ResearchTriggersDeps {
  readonly t: PropsLocale<'deepResearchPack'>['t']
  readonly runSource: (sessionId: SessionId) => RunSource
  readonly openEvidence: (sessionId: SessionId, runDir: string, cardFile: string) => void
  readonly openGraph: () => void
}

interface ParsedPickValue {
  readonly kind: 'evidence' | 'plan_node'
  readonly mention: string
  readonly label: string
}

function parsePickValue(raw: string | undefined): ParsedPickValue | null {
  if (raw === undefined) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ParsedPickValue>
    if ((parsed.kind === 'evidence' || parsed.kind === 'plan_node')
      && typeof parsed.mention === 'string' && typeof parsed.label === 'string') {
      return { kind: parsed.kind, mention: parsed.mention, label: parsed.label }
    }
  } catch {
    /* @silent-catch: malformed pick payload ignored */
  }
  return null
}

/** 注册 `@` 研究上下文源（证据卡 + 计划节点）；惰性等待 `inputTriggers` 服务。 */
export function registerResearchTriggers(ctx: ClientContext, deps: ResearchTriggersDeps): void {
  const { t, runSource, openEvidence, openGraph } = deps
  ;(ctx as unknown as {
    inject(names: readonly string[], callback: (scoped: ClientContext & { readonly inputTriggers: InputTriggerServiceContract }) => void): void
  }).inject(['inputTriggers'], (scoped) => {
    const sessions = ctx.get('sessions') as ISessions | undefined
    const source: InputTriggerSource = {
      trigger: '@',
      name: RESEARCH_TRIGGER_SOURCE,
      order: -10,
      showGroupTitle: false,
      async candidates(session, req) {
        if (req.quoted === true || sessions === undefined) return []
        const snap = sessions.list.getSnapshot() as unknown as Parameters<typeof selectSessionResearchProjection>[0]
        const proj = selectSessionResearchProjection(snap, session.sessionId)
        if (proj === null || proj === undefined || proj.slug === null) return []
        const slug = proj.slug
        const opened = await openRun(runSource(session.sessionId), `drt_${slug}`, { signal: req.signal })
        if (req.signal.aborted || !opened.ok) return []
        const view = opened.value
        const [evList, planArt] = await Promise.all([
          view.names.has('evidence') ? view.list('evidence', { signal: req.signal }) : Promise.resolve(null),
          view.names.has('plan.md') ? readArtifact(view, 'plan.md', { signal: req.signal }) : Promise.resolve({ state: 'absent' as const, text: null }),
        ])
        if (req.signal.aborted) return []
        const q = req.query.trim().toLowerCase()
        const out: InputTriggerCandidate[] = []

        if (evList !== null && evList.ok) {
          const cards = evList.value
            .filter((e) => e.type === 'file' && isEvidenceCardName(e.name))
            .map((e) => e.name)
            .filter((name) => q === '' || name.toLowerCase().includes(q) || `evidence/${name}`.toLowerCase().includes(q))
            .slice(0, 12)
          for (const card of cards) {
            const mention = formatEvidenceMention(slug, card)
            out.push({
              name: mention,
              label: card,
              description: `drt_${slug}/evidence/${card}`,
              icon: 'file',
              section: t('triggerSectionEvidence'),
              value: JSON.stringify({ kind: 'evidence', mention, label: card }),
            })
          }
        }

        if (planArt.state === 'ok' && planArt.text !== null) {
          const idx = planIndex(planArt.text)
          const nodes = idx.nodes
            .filter((node) => node.lifecycle === undefined || node.lifecycle === 'active')
            .filter((node) => {
              if (q === '') return true
              const hay = `${node.id} ${node.question ?? ''} ${node.ownerRole ?? ''}`.toLowerCase()
              return hay.includes(q)
            })
            .slice(0, 10)
          for (const node of nodes) {
            const mention = formatPlanNodeMention(slug, node.id)
            const desc = (node.question ?? node.output ?? '').trim()
            out.push({
              name: mention,
              label: node.id,
              ...(desc !== '' ? { description: desc.slice(0, 80) } : {}),
              icon: IconBranchOutlineRegular,
              section: t('triggerSectionPlanNodes'),
              value: JSON.stringify({ kind: 'plan_node', mention, label: node.id }),
            })
          }
        }

        return out
      },
      onPick({ candidate }) {
        const picked = parsePickValue(candidate.value)
        if (picked === null) return undefined
        return {
          insert: {
            source: RESEARCH_TRIGGER_SOURCE,
            ref: picked.mention,
            label: picked.label,
            appearance: 'file',
            clipboardText: picked.mention,
          },
        }
      },
      openReference(session, { ref }) {
        const parsed = parseResearchRefToken(ref)
        if (parsed === null) return false
        if (parsed.kind === 'evidence') {
          openEvidence(session.sessionId, `drt_${parsed.slug}`, parsed.cardName)
          return true
        }
        openGraph()
        return true
      },
      codec: {
        clipboardText: (ref) => ref,
        serialize: (ref) => Promise.resolve(ref),
      },
    }
    scoped.effect(() => scoped.inputTriggers.registerSource(source), 'deep-research-pack: @ research trigger')
  })
}
