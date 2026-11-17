// clean-room-policy.mjs — 干净室判据的纯函数层（BUG-233 / 234 / 235）。
//
// 从 clean-room.mjs 拆出：安装矩阵本身要起子进程（smoke 档），但「仓外 home / 版本在合同内 /
// 解析不落到仓根」三个判断是纯的——keyless 回归可以直接钉它们（clean-room-policy.test.mjs），
// spawn 行为只在真入口跑（test-surface 的 SMOKE_ONLY 登记 = harness/clean-room）。
import { relative, resolve } from 'node:path'
import { satisfiesVersion } from '../../../packages/deep-research-pack/scripts/lib/version-range.mjs'

/** target 是否在 root 之外（仓外 home 的硬判据；root 自身算「之内」）。 */
export function isOutsideRepo(root, target) {
  return relative(resolve(root), resolve(target)).startsWith('..')
}

/** 从 `dsh --version` 输出取版本（可能多行，取最后一个 semver）。 */
export function dshVersionOfOutput(output) {
  const lines = String(output ?? '').trim().split('\n')
  return [...lines].reverse().map((line) => /(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/.exec(line)?.[1]).find(Boolean) ?? null
}

/** 版本合同：version ∈ engines.dsh（range 缺席 = 红，不静默放行）。 */
export function engineVersionIssues(version, range) {
  if (typeof range !== 'string' || range.trim() === '') return ['pkg.engines.dsh 缺席——干净室版本合同不存在']
  if (typeof version !== 'string' || version === '') return ['dsh --version 不可用——未跑 ≠ 通过']
  return satisfiesVersion(version, range) ? [] : [`dsh --version ${version} ∉ engines.dsh ${range}——安装测试跑的是合同外宿主`]
}

/** 模块解析祖先：resolved 落在 root 内 = 仓内依赖泄漏（缺失 peer 被补齐 = 假绿）。 */
export function repoLeaksOf(root, resolvedPaths) {
  const prefix = `${resolve(root)}/`
  return resolvedPaths.filter((resolved) => resolve(resolved).startsWith(prefix))
}
