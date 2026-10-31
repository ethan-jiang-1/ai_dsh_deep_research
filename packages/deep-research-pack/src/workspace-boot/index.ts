/**
 * workspace-boot — 产品启动器的 Host 半：在 boot 时把用户工作区登记进 Workspace registry。
 *
 * 为什么需要：Web Client 首屏只在 registry 有 Workspace 时才会选中它并创建 blank Session；
 * 只把路径传给 dsh 命令行没用（Web app 拒绝未知参数），只传 cwd 也不够（Client 不认识）。
 * 这条 row 由 bundle 插入，env 缺席时零行为——手动 `dsh --profile` 的旧用法不受影响。
 *
 * 约束（D38 / data-plane-invariants）：不建 Session、不写 home 账本、不写浏览器持久化、
 * 不新增会话事件；只调用 DSH 的 workspaceRegistry 服务。失败时 log 清楚，不静默回退
 * Documents 默认目录（launcher 已在 spawn 前验证过路径）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { stat } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

/** 结构类型：避免把 @deepseek-ai/dsh-workspace 拉成运行时 import（服务由 Web 组合提供）。 */
interface WorkspaceRegistryLike {
  create(path: string, title?: string): Promise<{ path: string; workspaceId?: string }>
}

/** 服务依赖：workspaceRegistry 由 web-app 组合提供。 */
export const inject: readonly string[] = ['workspaceRegistry']

/**
 * 把 `DEEP_RESEARCH_WORKSPACE` 指向的目录登记为 Workspace。
 * @param ctx - Host context。
 */
export async function apply(ctx: Context): Promise<void> {
  const raw = process.env.DEEP_RESEARCH_WORKSPACE
  if (raw === undefined || raw === '') return
  const path = resolve(raw)
  // SAFETY: inject 声明了 workspaceRegistry，但本包只把它当 optional peer（D38）——服务由
  // web-app 组合提供，cordis Context 的静态类型里没有它，故先按可选成员读取。走到这里说明
  // 该 row 已被组合加载，存在性仍按下面 undefined 分支诚实处理，不假设一定注入。
  const registry = (ctx as unknown as { workspaceRegistry?: WorkspaceRegistryLike }).workspaceRegistry
  if (registry === undefined) {
    ctx.logger.warn('deep-research: workspaceRegistry 不在组合中；跳过工作区登记')
    return
  }
  const info = await stat(path)
  if (!info.isDirectory()) throw new Error(`DEEP_RESEARCH_WORKSPACE is not a directory: ${path}`)
  const title = basename(path) === '' ? 'Deep Research' : `Deep Research — ${basename(path)}`
  const workspace = await registry.create(path, title)
  ctx.logger.info(`deep-research: workspace registered: ${workspace.path}`)
}
