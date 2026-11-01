/**
 * content — 产品内容注入行（D40）：把包内的研究手册以 runtime context 注入每个 agent。
 *
 * 为什么不是工作区 `AGENTS.md`：`agent-instructions` 只从会话 cwd 链发现候选**文件名**，
 * 不能指定包内绝对路径（vendor 过滤 `/`、`\`、`.`、`..`）。`systemPrompt.context` 是 DSH 的
 * 正式 seam：带 order、可插值、成为 durable 的 user-role 快照，模型可见且可重建。
 *
 * 手册里的 `{{research_pack_root}}` 由本行注册的变量解析，避免写死本机安装路径。
 * 边界：只读包内文本；不写文件、不新增会话事件、不声明 storage domain。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'

/** Cordis 插件名。 */
export const name = 'deep-research-content'

/** systemPrompt 由 web-app 组合提供；本行只贡献一段 runtime context 与一个变量。 */
export const inject: readonly string[] = ['systemPrompt']

/** 安装副本根：构建产物在 `lib/content.js`，向上一级即包根。 */
const PACK_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 手册在模块加载时读一次；包内只读内容，升级随包版本。 */
const MANUAL = readFileSync(join(PACK_ROOT, 'content', 'manual.md'), 'utf8')

/** 结构类型：避免把 @deepseek-ai/dsh-system-prompt 拉成运行时 import。 */
interface SystemPromptLike {
  variable(name: string, provider: () => string): unknown
  context(input: {
    name: string
    order: number
    interpolate?: boolean
    text: string
  }): unknown
}

/**
 * 注册 `research_pack_root` 变量与研究手册 runtime context。
 * @param ctx - Host context。
 */
export function apply(ctx: Context): void {
  const systemPrompt = (ctx as unknown as { systemPrompt?: SystemPromptLike }).systemPrompt
  if (systemPrompt === undefined) {
    ctx.logger.warn('deep-research: systemPrompt 不在组合中；跳过研究手册注入')
    return
  }
  systemPrompt.variable('research_pack_root', () => PACK_ROOT)
  systemPrompt.context({
    name: 'research:manual',
    // 外部贡献用固定数值；getContextOrder 只接受 first-party 名单。
    order: 205,
    interpolate: true,
    text: MANUAL,
  })
}
