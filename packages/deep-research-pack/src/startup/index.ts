/**
 * startup — 产品的 Host 启动行（D40）：读产品设置/环境 → 登记工作区 → best-effort 建 Lead 会话。
 *
 * 为什么需要：纯 `dsh --profile deep-research` 没有 launcher 传参，产品必须自己知道工作区。
 * 读取顺序 = `DEEP_RESEARCH_WORKSPACE`（本次覆盖）→ `$DSH_HOME/deep-research/settings.json`；
 * 都没有时不登记、不建会话，首屏 onboarding 负责询问（client 行）。
 *
 * 约束：只调 DSH 的 `workspaceRegistry`（必选）与 `sessionController`（可选，web-app 提供）；
 * 不写 patch/storage domain、不新增 session event、不写浏览器存储。失败只 log，不阻断启动。
 */
import type { Context } from '@deepseek-ai/cordis'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readSettings, resolveStartupWorkspace, writeSettings } from './settings.ts'

/** Cordis 插件名。 */
export const name = 'deep-research-startup'

/** 安装副本根：`lib/startup.js` 向上一级即包根（用于拒绝把安装树当工作区）。 */
const PACK_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 结构类型：服务由 web-app 组合提供，不把 DSH 服务包拉成运行时 import。 */
interface WorkspaceRegistryLike {
  create(path: string, title?: string): Promise<{ path: string; workspaceId?: string }>
}

interface SessionControllerLike {
  create(input: {
    cwd?: string
    sessionId?: string
    agentPreset?: string
  }): Promise<{ sessionId: string }>
}

/** 必选：工作区登记服务。 */
export const inject: readonly string[] = ['workspaceRegistry']

/**
 * 启动行 body。
 * @param ctx - Host context。
 */
export function apply(ctx: Context): void {
  // 注册是 effect：HMR/dispose 时取消在途的登记/建会话，避免重复 apply 多开一条 Lead 会话。
  ctx.effect(() => {
    const controller = new AbortController()
    void runStartup(ctx, controller.signal)
    return () => controller.abort()
  }, 'deep-research-startup: product host startup')
}

/** 启动动作本体（effect 作用域内；signal 取消后不再产生新副作用）。测试直接驱动本函数。 */
export async function runStartup(ctx: Context, signal: AbortSignal): Promise<void> {
  const cancelled = (): boolean => signal.aborted
  const resolved = resolveStartupWorkspace(process.env, { packRoot: PACK_ROOT })
  if (resolved === null) {
    ctx.logger.info('deep-research: 未配置工作区；等待首屏 onboarding 询问')
    return
  }
  if (resolved.problem !== null) {
    ctx.logger.warn(`deep-research: 工作区不可用（${resolved.problem}）；跳过登记`)
    return
  }
  const registry = (ctx as unknown as { workspaceRegistry?: WorkspaceRegistryLike }).workspaceRegistry
  if (registry === undefined) {
    ctx.logger.warn('deep-research: workspaceRegistry 不在组合中；跳过工作区登记')
    return
  }
  const title = basename(resolved.path) === '' ? 'Deep Research' : `Deep Research — ${basename(resolved.path)}`
  if (cancelled()) return
  try {
    const workspace = await registry.create(resolved.path, title)
    ctx.logger.info(`deep-research: workspace registered: ${workspace.path}`)
  } catch (error) {
    ctx.logger.warn(`deep-research: 工作区登记失败（${(error as Error).message}）；继续启动`)
    return
  }

  // 会话创建是 best-effort：webserver 在挂载期 listen，Host 建会话不保证早于首个请求；
  // 失败/竞态都不影响产品可用（client 可用首选 blank 或 onboarding 兜底）。
  // 可选服务：用 ctx.get 读取；直接属性访问会触发 Cordis 的 inject 守卫（"without inject"）。
  const sessions = (ctx as unknown as { get(name: string): SessionControllerLike | undefined }).get('sessionController')
  if (sessions === undefined || cancelled()) return
  const previous = readSettings(process.env)
  const savedSessionId = previous.ok ? previous.value.sessionId : undefined
  try {
    const created = await sessions.create({
      cwd: resolved.path,
      agentPreset: 'lead',
      ...(savedSessionId === undefined ? {} : { sessionId: savedSessionId }),
    })
    if (resolved.source === 'settings') writeSettings({ sessionId: created.sessionId })
    ctx.logger.info(`deep-research: session ready: ${created.sessionId}`)
  } catch (error) {
    ctx.logger.warn(`deep-research: 会话创建失败（${(error as Error).message}）；继续启动`)
  }
}
