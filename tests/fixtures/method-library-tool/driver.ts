import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { installFailLoud, loadEnv, resolveConfigPath } from '@deepseek-ai/dsh-app-boot'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-api-session-controller/types'
import type {} from '@deepseek-ai/dsh-agent-preset-registry'
import { estimateToolsTokens } from '@deepseek-ai/dsh-token-meter/estimate'
import { firstTurnInputEstimate } from './method-library-mock-llm.ts'
import { bootProductionProfile } from '../../../vendor/dsh/packages/test-support/loader-smoke/tests/fixtures/production-profile.ts'
import { methodLibraryCommandText } from '../../../packages/deep-research-pack/src/lib/method-library-operation.ts'

const NAME = 'method-library-tool-loader-smoke'
const [rawPatchPath] = process.argv.slice(2)
if (rawPatchPath === undefined) throw new Error(`${NAME}: expected test patch path`)
const patchPath = resolveConfigPath(rawPatchPath, undefined)
const LIBRARY_PATH = join(process.cwd(), 'method-library.md')
const initialLibrary = [
  '## Original（2026-10-28，对话）〔默认偏好〕',
  '- 找来源: original-source',
  '- 怎么核实: original-verify',
  '- 报告怎么写: original-report',
  '- 不承诺: original-limit',
  '',
  '## Retained',
  '- 找来源: retained-source',
  '- 怎么核实: retained-verify',
  '- 报告怎么写: retained-report',
  '- 不承诺: retained-limit',
  '',
].join('\n')

type Action = 'save' | 'save-and-set-default' | 'set-default' | 'clear-default' | 'remove'

let checkCount = 0

function assert(condition: unknown, message: string): asserts condition {
  checkCount += 1
  if (!condition) throw new Error(`${NAME}: ${message}`)
}

function readLibrary(): string {
  return readFileSync(LIBRARY_PATH, 'utf8')
}

async function runAgent(ctx: Context, input: {
  readonly action: Action
  readonly name?: string
  readonly entry?: string
  readonly ownerRpc: boolean
  readonly mutateEntry?: boolean
}): Promise<readonly SessionEvent[]> {
  const { agent, dispose } = await ctx.agents.create({
    sessionId: brandString<SessionId>(`method-library-smoke-${randomUUID()}`),
    meta: { cwd: process.cwd(), agentPreset: 'method-editor' },
    agentOptions: { provider: 'method-library-test', model: 'method-library-test' },
    setup: async (agentCtx) => { await ctx.agentPresets.mount(agentCtx, 'method-editor') },
  })
  const events: SessionEvent[] = []
  const stop = ctx.on('session/event', (session, event) => {
    if (session === agent.session) events.push(event)
  })
  const operationId = randomUUID()
  const payloadHash = input.entry === undefined ? undefined : await hash(input.entry)
  const command = {
    operationId,
    action: input.action,
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(payloadHash === undefined ? {} : { payloadHash }),
  }
  const prompt = [
    methodLibraryCommandText(command),
    input.entry === undefined ? `执行操作 ${input.action} ${input.name ?? ''}`
      : `保存 entry，operationHash=${payloadHash}，defaultAction=${input.action === 'save-and-set-default' ? 'set' : 'preserve'}。\n\`\`\`method-draft\n${input.entry}\n\`\`\``,
    ...(input.mutateEntry === true ? ['【smoke-case】mutate-entry'] : []),
  ].join('\n')
  const requestId = brandString<'session-request-id'>(`request-${randomUUID()}`)
  const message = createUserMessage({
    content: [{ type: 'text', text: prompt }],
    source: input.ownerRpc ? { kind: 'user', rpcId: requestId } : { kind: 'user' },
  })
  try {
    agent.followup(message)
    await agent.whenIdle()
    await ctx.sessions.flush(agent.session)
    return events
  } finally {
    stop()
    await dispose()
  }
}

async function hash(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function main(): Promise<void> {
  const uninstallFailLoud = installFailLoud(NAME)
  let ctx: Context | undefined
  try {
    loadEnv(NAME)
    writeFileSync(LIBRARY_PATH, initialLibrary, 'utf8')
    const presetPatch = join(resolve(dirname(fileURLToPath(import.meta.url)), '../../..'), 'packages/deep-research-pack/presets/method-editor.patch.yml')
    ctx = await bootProductionProfile({ binName: NAME, profile: 'headless', overlayPaths: [patchPath, presetPatch] })
    const entry = [
      '## New Method（2026-10-29，对话）',
      '- 找来源: new-source',
      '- 怎么核实: new-verify',
      '- 报告怎么写: new-report',
      '- 不承诺: new-limit',
    ].join('\n')

    const saved = await runAgent(ctx, { action: 'save-and-set-default', name: 'New Method', entry, ownerRpc: true })
    let persisted = readLibrary()
    assert(persisted.includes('## New Method（2026-10-29，对话）〔默认偏好〕'), 'save-and-set-default did not persist the new unique default')
    assert(!persisted.includes('## Original（2026-10-28，对话）〔默认偏好〕'), 'save-and-set-default left the old default marker')
    assert(persisted.includes('## Retained'), 'save-and-set-default changed an unrelated entry')
    assert(saved.some((event) => event.type === 'tool/result' && event.data.meta !== undefined && !event.data.message.isError), 'successful Host tool result omitted structured presentation metadata')
    const requestHeader = saved.find((event) => event.type === 'request/header')
    const modelTools = requestHeader?.type === 'request/header' ? requestHeader.data.header.tools ?? [] : []
    const upsertSchema = modelTools.find((tool) => tool.name === 'method_library_upsert')
    assert(modelTools.some((tool) => tool.name === 'method_library_set_default'), 'Method Editor request omitted the explicit default tool')
    assert(modelTools.some((tool) => tool.name === 'method_library_remove'), 'Method Editor request omitted the remove tool')
    assert(upsertSchema !== undefined && JSON.stringify(upsertSchema.parameters).includes('operationHash'), 'Method Editor request omitted payload-binding schema')
    const operationMarker = saved.find((event) => event.type === 'user/message' && event.data.content.some((part) => part.type === 'text' && part.text.startsWith('【方法库操作】')))
    assert(operationMarker?.type === 'user/message' && 'rpcId' in operationMarker.data.source, 'model-visible operation request omitted its durable owner request id')
    assert(saved.some((event) => event.type === 'user/message' && JSON.stringify(event.data.source).includes('rpcId')), 'owning operation request was not durable in Session history')
    const currentToolTokens = estimateToolsTokens({ tools: modelTools })
    const originalTools = modelTools.filter((tool) => !['method_library_upsert', 'method_library_set_default', 'method_library_remove'].includes(tool.name))
    const previousMethodTools = [
      {
        name: 'method_library_upsert',
        description: '把一条研究方法条目写入当前工作区的 method-library.md（同名覆盖；新建或更新）。只在方法库页的保存动作里调用。entry 必须是完整库条目 Markdown：`## 名称（日期，来源）` + 四行（- 找来源: / - 怎么核实: / - 报告怎么写: / - 不承诺:）；四行都必须有内容。',
        parameters: { entry: { type: 'string', required: true, description: '完整库条目 Markdown（标题 + 四行）' } },
      },
      {
        name: 'method_library_remove',
        description: '从当前工作区的 method-library.md 删除一条同名方法条目。只在方法库页的删除动作里调用；删除后如实回复「已删除：<名称>」。',
        parameters: { name: { type: 'string', required: true, description: '要删除的条目名' } },
      },
    ]
    const previousToolTokens = estimateToolsTokens({ tools: [...originalTools, ...previousMethodTools] })
    const firstTurn = firstTurnInputEstimate()
    assert(firstTurn !== null, 'mock LLM did not capture its first Method Editor request')
    const currentFirstTurnTokens = firstTurn.messageTokens + firstTurn.toolTokens
    const previousSchemaFirstTurnTokens = firstTurn.messageTokens + previousToolTokens

    const beforeRejected = persisted
    const rejectedHash = await runAgent(ctx, {
      action: 'save', name: 'Tampered', entry: entry.replace('New Method', 'Tampered'), ownerRpc: true, mutateEntry: true,
    })
    persisted = readLibrary()
    assert(persisted === beforeRejected, 'Host tool wrote an entry whose content digest did not match its command')
    assert(rejectedHash.some((event) => event.type === 'tool/result' && event.data.message.isError === true), 'Host did not reject a changed entry payload')

    const rejectedOwner = await runAgent(ctx, { action: 'remove', name: 'Retained', ownerRpc: false })
    assert(readLibrary().includes('## Retained'), 'a message without the owning Remote request id authorized a write')
    assert(rejectedOwner.some((event) => event.type === 'tool/result' && event.data.message.isError === true), 'Host did not reject a command without an owner request id')

    const changedDefault = await runAgent(ctx, { action: 'set-default', name: 'Original', ownerRpc: true })
    persisted = readLibrary()
    assert(persisted.includes('## Original（2026-10-28，对话）〔默认偏好〕'), 'standalone set-default did not mark its unique target')
    assert(!persisted.includes('## New Method（2026-10-29，对话）〔默认偏好〕'), 'standalone set-default left multiple markers')
    assert(changedDefault.some((event) => event.type === 'tool/result' && event.data.meta !== undefined && !event.data.message.isError), 'set-default omitted structured metadata')

    await runAgent(ctx, { action: 'remove', name: 'Original', ownerRpc: true })
    persisted = readLibrary()
    assert(!persisted.includes('## Original'), 'remove left its target in the library')
    assert(!persisted.includes('〔默认偏好〕'), 'removing the default promoted another entry')
    assert(persisted.includes('## Retained') && persisted.includes('## New Method'), 'remove deleted an unrelated entry')

    const defaultedAgain = await runAgent(ctx, { action: 'set-default', name: 'New Method', ownerRpc: true })
    assert(defaultedAgain.some((event) => event.type === 'tool/result' && event.data.meta !== undefined && !event.data.message.isError), 'set-default did not return metadata after removal')
    await runAgent(ctx, { action: 'clear-default', ownerRpc: true })
    persisted = readLibrary()
    assert(!persisted.includes('〔默认偏好〕'), 'clear-default left a marker')

    process.stdout.write(`${JSON.stringify({
      type: 'method-library-tool-smoke',
      checks: checkCount,
      methodToolSchemaTokenEstimate: { before: previousToolTokens, after: currentToolTokens, delta: currentToolTokens - previousToolTokens },
      firstTurnInputTokenEstimate: { before: previousSchemaFirstTurnTokens, after: currentFirstTurnTokens, messageTokens: firstTurn.messageTokens, delta: currentFirstTurnTokens - previousSchemaFirstTurnTokens },
      finalLibrary: persisted,
    })}\n`)
  } finally {
    await ctx?.fiber.dispose()
    uninstallFailLoud()
  }
}

await main()
