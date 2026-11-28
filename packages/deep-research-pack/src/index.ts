/**
 * Host 半：研究驾驶舱的双半宿主入口（bundle 行 name = 本包名）。
 *
 * 惰性挂载 Host `sessionProjections` 单元 `researchRun`：从已提交会话日志确定性增量折算
 * 当前会话绑定 run slug、阶段、HITL 挂起态与终稿交付路径，零额外磁盘写入，浏览器侧经
 * `useSessions` 直接消费（零 N+1 follow 订阅）。
 */
import type { Context } from '@deepseek-ai/cordis'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import {
  RESEARCH_RUN_PROJECTION_KEY,
  applyResearchRunEvent,
  initialResearchRunState,
  projectResearchRunView,
  type ResearchRunHitlKind,
  type ResearchRunPhase,
  type ResearchRunProjection,
  type ResearchRunProjectionState,
} from './lib/events/research-projection.ts'

const VALID_PHASES: ReadonlySet<string> = new Set<ResearchRunPhase>(['idle', 'intake', 'running', 'hitl_pending', 'delivered'])
const VALID_HITL_KINDS: ReadonlySet<string> = new Set<ResearchRunHitlKind>(['hitl1', 'hitl2', 'other'])
const STATE_KEYS = new Set(['schemaVersion', 'writeSlug', 'readSlug', 'kickoffSeen', 'pendingAskCallId', 'hitlKind', 'deliveredPath', 'updatedAt'])
const VIEW_KEYS = new Set(['schemaVersion', 'slug', 'phase', 'hitlKind', 'deliveredPath', 'updatedAt'])

function expectRecord(raw: unknown, allowedKeys: ReadonlySet<string>, label: string): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${label}: expected plain object`)
  }
  const rec = raw as Record<string, unknown>
  for (const key of Object.keys(rec)) {
    if (!allowedKeys.has(key)) throw new Error(`${label}: unexpected key "${key}"`)
  }
  return rec
}

function expectNullableNonEmptyString(value: unknown, field: string): string | null {
  if (value === null) return null
  if (typeof value === 'string' && value.length > 0) return value
  throw new Error(`researchRun.${field}: expected non-empty string or null`)
}

function expectNullableString(value: unknown, field: string): string | null {
  if (value === null || typeof value === 'string') return value
  throw new Error(`researchRun.${field}: expected string or null`)
}

function expectTimestamp(value: unknown, field: string): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value
  throw new Error(`researchRun.${field}: expected non-negative safe integer`)
}

function parseResearchRunState(raw: unknown): ResearchRunProjectionState {
  const rec = expectRecord(raw, STATE_KEYS, 'researchRunState')
  if (rec.schemaVersion !== 1) throw new Error('researchRunState.schemaVersion: expected 1')
  if (typeof rec.kickoffSeen !== 'boolean') throw new Error('researchRunState.kickoffSeen: expected boolean')
  const hitlKind = rec.hitlKind === null
    ? null
    : (typeof rec.hitlKind === 'string' && VALID_HITL_KINDS.has(rec.hitlKind) ? (rec.hitlKind as ResearchRunHitlKind) : null)
  if (rec.hitlKind !== null && hitlKind === null) throw new Error('researchRunState.hitlKind: invalid enum')
  return {
    schemaVersion: 1,
    writeSlug: expectNullableNonEmptyString(rec.writeSlug, 'writeSlug'),
    readSlug: expectNullableNonEmptyString(rec.readSlug, 'readSlug'),
    kickoffSeen: rec.kickoffSeen,
    pendingAskCallId: expectNullableString(rec.pendingAskCallId, 'pendingAskCallId'),
    hitlKind,
    deliveredPath: expectNullableNonEmptyString(rec.deliveredPath, 'deliveredPath'),
    updatedAt: expectTimestamp(rec.updatedAt, 'updatedAt'),
  }
}

function parseResearchRunView(raw: unknown): ResearchRunProjection {
  const rec = expectRecord(raw, VIEW_KEYS, 'researchRunView')
  if (rec.schemaVersion !== 1) throw new Error('researchRunView.schemaVersion: expected 1')
  if (typeof rec.phase !== 'string' || !VALID_PHASES.has(rec.phase)) {
    throw new Error('researchRunView.phase: invalid phase')
  }
  const hitlKind = rec.hitlKind === null
    ? null
    : (typeof rec.hitlKind === 'string' && VALID_HITL_KINDS.has(rec.hitlKind) ? (rec.hitlKind as ResearchRunHitlKind) : null)
  if (rec.hitlKind !== null && hitlKind === null) throw new Error('researchRunView.hitlKind: invalid enum')
  return {
    schemaVersion: 1,
    slug: expectNullableNonEmptyString(rec.slug, 'slug'),
    phase: rec.phase as ResearchRunPhase,
    hitlKind,
    deliveredPath: expectNullableNonEmptyString(rec.deliveredPath, 'deliveredPath'),
    updatedAt: expectTimestamp(rec.updatedAt, 'updatedAt'),
  }
}

const researchRunProjectionDefinition = {
  key: RESEARCH_RUN_PROJECTION_KEY,
  stateVersion: 1,
  stateSchema: { parse: parseResearchRunState } as unknown as ProjectionDefinition<typeof RESEARCH_RUN_PROJECTION_KEY, ResearchRunProjectionState>['stateSchema'],
  init: (header) => initialResearchRunState(header),
  apply: (state, event) => applyResearchRunEvent(state, event),
  wire: {
    viewSchema: { parse: parseResearchRunView } as unknown as NonNullable<ProjectionDefinition<typeof RESEARCH_RUN_PROJECTION_KEY, ResearchRunProjectionState>['wire']>['viewSchema'],
    view: projectResearchRunView,
  },
} satisfies ProjectionDefinition<typeof RESEARCH_RUN_PROJECTION_KEY, ResearchRunProjectionState>

/** Host 半顶层无硬依赖（headless/无 sessionProjections 场景通过 ctx.inject 惰性降级）。 */
export const inject: readonly string[] = []

/** Host plugin body：惰性向 `sessionProjections` 注册 `researchRun` 投影单元。 */
export function apply(ctx: Context): void {
  ctx.inject(['sessionProjections'], (scoped) => {
    scoped.effect(
      () => scoped.sessionProjections.register(researchRunProjectionDefinition),
      'deep-research-pack: researchRun session projection',
    )
  })
}
