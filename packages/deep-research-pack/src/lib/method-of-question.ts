/**
 * method-of-question.ts —— 「本次研究用的是哪条打法」折算（子卡① ①-1／①-6，2026-10-18）。
 *
 * 输入 = question.md 文本 + bundle 在场性；输出 = 面板「本次研究」区的**五态**（纯函数，
 * keyless 单测）。纪律：**判不了就说判不了**——读不到方法节绝不回落成默认打法名（旧 run 的
 * 合法形态 = 未记录，不回填、不臆断）。
 *
 *   无 run      本会话没有任何绑定 bundle → 给入口（面板空态）
 *   文件缺      绑定了 bundle 但 question.md 不在（立项未落盘/文件被移）
 *   未记录      question.md 在、方法节不在或「采用」行缺/空——旧 run 的合法形态，不回填
 *   无法判定    方法节与「采用」行在场，但值读不出方法名（模板占位符/格式漂移）
 *   已记录      读出采用名（+ 来源行）
 *
 * 读限教训（BUG-026 同族）：方法节在 run 模板的**第 32–40 行**，而 `readFile` 默认 limit=40
 * 恰好卡在边界 → 调用方读 question.md 必须显式传足额 limit（≥120 行），勿吃默认值静默截断。
 *
 * 真实形态（2026-10-18 从 `drt_ai-coding-sec-practices` 与 `drt_harness-conventions-portability`
 * 亲读，解析器按它写）：`- 采用: **领域地图**（主）——风险与实践地图式分节；…` 与 `- 采用: 方案比较`
 * ——取值可能带 markdown 强调、括注与破折号续写；`- 调查要求:` 可缩进换行续写。
 */
import { flattenMarkdownInline, truncateWithEllipsis } from './text-fold.ts'

/** 「本次研究」区状态。 */
export type AdoptionKind = 'no-run' | 'missing' | 'unrecorded' | 'unparsable' | 'recorded'

/** 方法节折算结果（recorded 之外各态的内容字段恒为 null——如实，不借默认值占位）。 */
export interface MethodAdoption {
  readonly kind: AdoptionKind
  /** 采用名（已剥 markdown、已截到方法名本体）；非 recorded → null。 */
  readonly adopted: string | null
  /** 「来源」行原值（已压平与截断）；缺席 → null。 */
  readonly origin: string | null
  /** 「调查要求」行首段（仅供详情展示）；缺席 → null。 */
  readonly requirements: string | null
}

/** 方法节标题形态：`## 研究方法（本次实际采用）`（模板正本）。 */
const SECTION_HEADING = /^##\s*研究方法/

/** 模板占位符（`<…>`）——在场但读不出内容，属"无法判定"而非"未记录"。 */
function isPlaceholder(value: string): boolean {
  return value.startsWith('<') || value.endsWith('>')
}

/** 值行取值：`- <字段>:` 后的内容（不存在 → null）。 */
function fieldValue(lines: readonly string[], field: string): string | null {
  const prefix = `- ${field}:`
  const line = lines.find((l) => l.startsWith(prefix))
  if (line === undefined) return null
  return line.slice(prefix.length).trim() || null
}

/**
 * 从「采用」行取值里截出方法名本体：`**领域地图**（主）——风险与…` → `领域地图`。
 * 截断点 = 首个括注/破折号/分句符；截不出内容 → null（调用方判"无法判定"）。
 */
export function adoptedNameOf(raw: string): string | null {
  const flat = flattenMarkdownInline(raw)
  if (flat === '' || isPlaceholder(flat)) return null
  const cut = flat.split(/[（(——；;，,。:：]/)[0]?.trim() ?? ''
  if (cut === '' || isPlaceholder(cut)) return null
  return cut
}

/** question.md 文本 → 方法节字段（截取到下一个 `## ` 标题为止）。 */
export function parseMethodSection(questionText: string | null): {
  readonly sectionSeen: boolean
  readonly adoptedRaw: string | null
  readonly origin: string | null
  readonly requirements: string | null
} {
  if (questionText === null) return { sectionSeen: false, adoptedRaw: null, origin: null, requirements: null }
  const lines = questionText.split('\n')
  const start = lines.findIndex((l) => SECTION_HEADING.test(l))
  if (start === -1) return { sectionSeen: false, adoptedRaw: null, origin: null, requirements: null }
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((l) => l.startsWith('## '))
  const body = end === -1 ? rest : rest.slice(0, end)
  return {
    sectionSeen: true,
    adoptedRaw: fieldValue(body, '采用'),
    origin: fieldValue(body, '来源'),
    requirements: fieldValue(body, '调查要求'),
  }
}

/**
 * 折算「本次研究」区状态。
 * @param questionText - question.md 全文（读不到 → null）；读取须显式传足额 limit（见文件头）。
 * @param presence - bundle 与会话绑定是否在场、question.md 是否在场（`listDir` 事实）。
 * @returns 五态之一；非 recorded 态的内容字段为 null。
 */
export function foldMethodAdoption(
  questionText: string | null,
  presence: { readonly bundle: boolean; readonly question: boolean },
): MethodAdoption {
  if (!presence.bundle) return { kind: 'no-run', adopted: null, origin: null, requirements: null }
  if (!presence.question || questionText === null) return { kind: 'missing', adopted: null, origin: null, requirements: null }
  const section = parseMethodSection(questionText)
  if (!section.sectionSeen || section.adoptedRaw === null) return { kind: 'unrecorded', adopted: null, origin: null, requirements: null }
  const adopted = adoptedNameOf(section.adoptedRaw)
  if (adopted === null) return { kind: 'unparsable', adopted: null, origin: null, requirements: null }
  return {
    kind: 'recorded',
    adopted,
    origin: section.origin === null ? null : truncateWithEllipsis(flattenMarkdownInline(section.origin), 48),
    requirements: section.requirements === null ? null : truncateWithEllipsis(flattenMarkdownInline(section.requirements), 120),
  }
}
