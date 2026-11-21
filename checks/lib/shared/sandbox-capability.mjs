// sandbox-capability.mjs — 嵌套沙箱探测的判据（BUG-349），纯函数。
// darwin：sandbox-exec 探测失败或 EPERM = 脚本层沙箱不可用（当前进程已在外层沙箱里）；
// 其它平台 = 未知（null，不声明）。调用方负责真正 spawn 探测并注入 env/诊断。
export function sandboxAvailability({ platform, status, errorCode }) {
  if (platform !== 'darwin') return null
  if (errorCode === 'EPERM' || status !== 0) return false
  return true
}
