/**
 * defaults — 项目研究默认的 Host 行：`research:defaults` prompt context + `/research-defaults` 命令。
 *
 * 为什么一个行同时做两件：读（注入）与写（命令）共用同一 workspace 文件与同一共享 schema；
 * 分成两行只会多一个 bundle row 和一份装配。`systemPrompt` 必选；`commands` 可选（headless
 * 组合没有命令面时注入仍工作，行不 fail-mount）。
 *
 * 边界：只读 `<cwd>/research-defaults.json` + `<cwd>/method-library.md`；只写前者；不碰
 * method-library.md；方法默认仍归方法库（D25/D37）。命令是唯一写路径，结果 code-like。
 */
import type { Context } from '@deepseek-ai/cordis'
import { runDefaultsCommand, type CommandResultLike } from './command.ts'
import { defaultsSectionFor } from './context.ts'

/** Cordis 插件名。 */
export const name = 'deep-research-defaults'

/** prompt 注册必选；命令面可选（见头注）。 */
export const inject: readonly string[] = ['systemPrompt']

interface SystemPromptLike {
  context(input: {
    name: string
    order: number
    interpolate?: boolean
    text: (context: unknown) => string
  }): (() => void) | undefined
}

interface AgentLike {
  readonly session?: {
    readonly header?: { readonly cwd?: string }
  }
}

interface CommandInvocationLike {
  readonly rawInput: string
  readonly agent?: AgentLike
}

interface CommandDefinitionLike {
  readonly name: string
  readonly description: string
  readonly input?: { readonly hint?: string }
  readonly handler: (invocation: CommandInvocationLike) => CommandResultLike | Promise<CommandResultLike>
}

interface CommandsLike {
  register(definition: CommandDefinitionLike): (() => void) | void
}

/** 同一个坏文件只记一次 warn（prompt assembly 每步都会跑）。 */
let lastDiagnostic = ''

function warnOnce(ctx: Context, reason: string): void {
  if (reason === lastDiagnostic) return
  lastDiagnostic = reason
  ctx.logger.warn(`deep-research: 项目默认不可用（${reason}）；本次不注入`)
}

/**
 * Host 行 body。
 * @param ctx - Host context。
 */
export function apply(ctx: Context): void {
  const systemPrompt = (ctx as unknown as { systemPrompt?: SystemPromptLike }).systemPrompt
  if (systemPrompt === undefined) {
    ctx.logger.warn('deep-research: systemPrompt 不在组合中；跳过项目默认注入')
  } else {
    // registrations are effects：HMR/dispose 时撤销 context，避免重名注册抛。
    ctx.effect(() => {
      const dispose = systemPrompt.context({
        name: 'research:defaults',
        order: 206,
        interpolate: false,
        text: (context) => {
          const cwd = (context as { agent?: AgentLike }).agent?.session?.header?.cwd
          if (cwd === undefined || cwd.trim() === '') return ''
          const section = defaultsSectionFor(cwd)
          if (section.readError !== undefined) warnOnce(ctx, section.readError)
          return section.text
        },
      })
      return () => {
        if (typeof dispose === 'function') dispose()
      }
    }, 'deep-research-defaults: research defaults context')
  }

  // 可选命令面：headless/无 UI 组合没有 commands 服务时，只注入、不注册命令。
  // 用 ctx.inject（而不是 ctx.get）等待服务出现：Loader 不保证 commands 在 pack 行之前 mount；
  // ctx.get 在 apply 时可能拿到 undefined，命令就永远不会注册。
  ;(ctx as unknown as {
    inject(names: readonly string[], callback: (scoped: {
      commands: CommandsLike
      effect(fn: () => (() => void) | void, label: string): unknown
    }) => void): void
  }).inject(['commands'], (scoped) => {
    scoped.effect(() => {
      const dispose = scoped.commands.register({
        name: 'research-defaults',
        description: '项目研究默认 / Project research defaults',
        input: { hint: 'show | set <json> | unset <field[,field]> [revision=N] | clear [revision=N]' },
        handler: (invocation) => runDefaultsCommand({
          cwd: invocation.agent?.session?.header?.cwd,
          rawInput: invocation.rawInput,
        }),
      })
      return () => {
        if (typeof dispose === 'function') dispose()
      }
    }, 'deep-research-defaults: /research-defaults command')
  })

}
