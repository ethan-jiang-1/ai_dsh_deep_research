import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { installFailLoud, loadEnv, resolveConfigPath } from '@deepseek-ai/dsh-app-boot'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { estimateMessage, estimateToolsTokens } from '@deepseek-ai/dsh-token-meter/estimate'
import { resetCapture, firstTurnInputEstimate, firstTurnRequestJson } from './mock-llm.ts'
import { bootProductionProfile } from '../../../vendor/dsh/packages/test-support/loader-smoke/tests/fixtures/production-profile.ts'

const NAME = 'model-experience-loader-smoke'
const [rawPatchPath] = process.argv.slice(2)
if (rawPatchPath === undefined) throw new Error(`${NAME}: expected test patch path`)
const patchPath = resolveConfigPath(rawPatchPath, undefined)
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const PACK = join(ROOT, 'packages/deep-research-pack')
const presetPatch = (role: string) => join(PACK, 'presets', `${role}.patch.yml`)
const workerPatch = (name: string) => join(PACK, 'workers', `${name}.patch.yml`)

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`${NAME}: ${message}`)
}

async function priceRole(ctx: Context, role: string, question: string): Promise<{
  readonly role: string
  readonly messageTokens: number
  readonly toolTokens: number
  readonly total: number
  readonly toolNames: readonly string[]
  readonly requestJson: string
}> {
  resetCapture()
  const { agent, dispose } = await ctx.agents.create({
    sessionId: brandString<SessionId>(`model-experience-${role}-${randomUUID()}`),
    meta: { cwd: process.cwd(), agentPreset: role },
    agentOptions: { provider: 'model-experience-test', model: 'model-experience-test' },
    setup: async (agentCtx) => { await ctx.agentPresets.mount(agentCtx, role) },
  })
  const events: SessionEvent[] = []
  const stop = ctx.on('session/event', (session, event) => {
    if (session === agent.session) events.push(event)
  })
  const message = createUserMessage({ content: [{ type: 'text', text: question }], source: { kind: 'user' } })
  try {
    agent.followup(message)
    await agent.whenIdle()
    await ctx.sessions.flush(agent.session)
  } finally {
    stop()
    await dispose()
  }
  const captured = firstTurnInputEstimate()
  assert(captured !== null, `mock LLM did not capture the first ${role} request`)
  const requestJson = firstTurnRequestJson()
  assert(requestJson !== null, `mock LLM did not capture the first ${role} request messages`)
  const header = events.find((event) => event.type === 'request/header')
  const tools = header?.type === 'request/header' ? header.data.header.tools ?? [] : []
  const headerToolTokens = estimateToolsTokens({ tools })
  assert(headerToolTokens === captured.toolTokens, `${role}: captured tool tokens disagree with request/header tools`)
  return {
    role,
    messageTokens: captured.messageTokens,
    toolTokens: captured.toolTokens,
    total: captured.messageTokens + captured.toolTokens,
    toolNames: tools.map((tool) => tool.name),
    requestJson,
  }
}

async function main(): Promise<void> {
  const uninstallFailLoud = installFailLoud(NAME)
  let ctx: Context | undefined
  try {
    loadEnv(NAME)
    ctx = await bootProductionProfile({
      binName: NAME,
      profile: 'headless',
      overlayPaths: [
        patchPath,
        presetPatch('lead'), presetPatch('scout'), presetPatch('analyst'), presetPatch('critic'), presetPatch('method-editor'),
        workerPatch('research-worker'), workerPatch('research-wave'),
      ],
    })
    const lead = await priceRole(ctx, 'lead', '研究一下 2026 年开源推理模型的进展。')
    const scout = await priceRole(ctx, 'scout', '侦察开源推理模型的来源。')
    assert(lead.total > 0 && scout.total > 0, 'first-request estimate must be positive')
    assert(lead.toolNames.length > 0 && scout.toolNames.length > 0, 'role request carried no tools')

    const manual = readFileSync(join(PACK, 'content/manual.md'), 'utf8')
    const manualTokens = estimateMessage({ role: 'user', content: [{ type: 'text', text: manual }] })
    assert(manualTokens > 0, 'manual.md token estimate must be positive')
    const manualMarker = manual.split('\n')[0]
    assert(lead.requestJson.includes(manualMarker), 'Lead first request did not actually inject the research manual (D40)')
    assert(scout.requestJson.includes(manualMarker), 'Scout first request did not actually inject the research manual (D40)')

    process.stdout.write(`${JSON.stringify({
      type: 'model-experience.e2e',
      roles: [lead, scout],
      manualTokens,
      manualShareOfLeadMessages: Number((manualTokens / lead.messageTokens).toFixed(3)),
    })}\n`)
  } finally {
    await ctx?.fiber.dispose()
    uninstallFailLoud()
  }
}

await main()
