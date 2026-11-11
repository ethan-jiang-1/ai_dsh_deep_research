// profile-health.mjs — dev DSH profile 的版本面预检（纯读；boot 前 fail-fast）。
//
// 为什么存在（BUG-066）：profile 的团队层版本未随 pin 重钉时，dsh 不退出、只是拒绝服务；
// boot 只看到「等待启动横幅超时」，真正原因埋在日志尾。本助手在 boot 前把版本面对账成明确
// 的 exit 2 与修复入口，避免把「profile 过期」误判成主机/网络问题。
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** 运行中 dsh 的版本（vendor 源码包清单；与 boot 实际二进制同源）。 */
export function runtimeVersionOf(root) {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'vendor', 'dsh', 'package.json'), 'utf8'))
    return typeof pkg.version === 'string' && pkg.version !== '' ? pkg.version : null
  } catch {
    return null
  }
}

/**
 * profile 版本面问题（空数组 = 可启动）。
 * @param {{profileDir: string, runtimeVersion: string, layer?: string}} input
 * @returns {string[]}
 */
export function profileLayerIssues({ profileDir, runtimeVersion, profileName = 'deep-research', layer = '@deepseek-ai/dsh-experimental-agent-team-profile' }) {
  const manifest = join(profileDir, 'package.json')
  if (!existsSync(manifest)) return [`profile 不在场：${profileDir}——${profileName === 'deep-research' ? '先跑 dev/boot-run.sh（guides/60 §2）' : `${profileName} 档已弃用，消费方改用 deep-research`}`]
  let pkg
  try { pkg = JSON.parse(readFileSync(manifest, 'utf8')) } catch (error) {
    return [`profile 清单不可解析：${manifest}（${String(error?.message ?? error)}）`]
  }
  const actual = pkg?.dependencies?.[layer]
  if (actual === undefined) return [`profile 缺团队层 ${layer}——${profileName === 'deep-research' ? '先跑 dev/boot-run.sh 重建' : `${profileName} 档已弃用，消费方改用 deep-research`}`]
  if (typeof runtimeVersion !== 'string' || runtimeVersion === '') return [`读不到运行中 dsh 版本，拒绝用猜的版本门`]
  if (actual !== runtimeVersion) {
    return [`${layer} ${String(actual)} ≠ runtime ${runtimeVersion}——profile 未随 pin 重钉；${profileName === 'deep-research' ? '先跑 dev/boot-run.sh 重建' : `${profileName} 档已弃用，消费方改用 deep-research（boot-run 只维护 deep-research）`}`]
  }
  return []
}
