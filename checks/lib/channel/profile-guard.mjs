// profile-guard.mjs — run-driver 的非默认 profile 守卫（BUG-237）。
//
// 为什么：dev home 的旧 profile 镜像（停在不同版本）可被直接 `dsh --profile` 起，跳过 boot-run
// 的漂移检测——静默用旧插件。run-driver 的 up/probe 对非默认 profile fail-loud，本文件持有判据与
// 文案（run-driver 与 keyless 测试共用同一份）。
export const DEFAULT_PROFILE = 'deep-research'

/** 非默认 profile 的拒绝文案；默认 profile 返回 null（放行）。 */
export function staleProfileMessage(profile) {
  if (profile === DEFAULT_PROFILE) return null
  return `run-driver: profile「${profile}」不是默认 ${DEFAULT_PROFILE}——直起非默认 profile 会跳过镜像漂移检测（静默用旧插件）；显式 --allow-stale-profile 才继续`
}

/** 纯决策：非默认 profile 且未显式放行 → 拒绝文案；否则 null（run-driver 与测试共用）。 */
export function profileGuardDecision({ profile, allowStale = false }) {
  if (allowStale) return null
  return staleProfileMessage(profile)
}

/** boot-run.sh 的直起守卫契约：必须同时含非默认 profile 判据与显式逃生口（BUG-243）。 */
export function bootRunGuardProblems(text) {
  const problems = []
  if (!/DSH_ALLOW_STALE_PROFILE/.test(text)) problems.push('boot-run.sh 缺 DSH_ALLOW_STALE_PROFILE 逃生口')
  if (!/!= *"deep-research"/.test(text)) problems.push('boot-run.sh 缺非默认 profile 判据（!= deep-research）')
  if (!/exit 2/.test(text)) problems.push('boot-run.sh 守卫未 fail-loud（缺 exit 2）')
  return problems
}
