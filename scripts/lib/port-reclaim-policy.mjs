// port-reclaim-policy.mjs — 端口 listener 身份判定与探针端口退避/整组收割纯判据（keyless 直测；无子进程/网络依赖）。
//
// 只认**真正在跑 DSH web** 的命令行（BUG-104/113）：node + vendor/安装副本的 CLI 入口，
// 或 `dsh` 可执行；仓库路径子串、tail、任意 node 脚本都不算（否则仓库里的用户服务会被杀）。
// 另承载 BUG-136 的纯编排核：预收割被外部进程拒杀时回落临时空闲端口，finally 整组 SIGKILL + 端口复收割。
const DSH_ENTRY = /(?:^|\s)(?:node|nodejs)\s+[^\n]*(?:vendor[\\/]dsh[\\/]apps[\\/]cli[\\/](?:src[\\/]bin\.ts|lib[\\/]bin\.js)|@deepseek-ai[\\/]dsh[\\/]apps[\\/]cli[\\/](?:src[\\/]bin\.ts|lib[\\/]bin\.js))/i
const DSH_BIN = /(?:^|\s)(?:\S*[\\/])?dsh\s+(?:web\b|--profile\b)/i
const NON_DSH = /^\s*(?:tail|cat|less|more|grep|rg|vim|nano|code|python|ruby|perl)\b/i

export const isOwnListener = (command) => {
  if (typeof command !== 'string' || command.trim() === '') return false
  if (NON_DSH.test(command)) return false
  return DSH_ENTRY.test(command) || DSH_BIN.test(command)
}

/**
 * 探针启动前端口准备（BUG-136）：先尝试按归属策略回收首选端口；若端口仍被非本仓进程占住或无法清空，
 * 自动分配临时空闲端口，避免探针自锁。
 */
export async function resolveProbePort(preferredPort, { reclaim, allocateFreePort, onFallback = () => {} }) {
  const stale = await reclaim(preferredPort)
  if (stale === null) return preferredPort
  const fallback = await allocateFreePort()
  onFallback(preferredPort, fallback, stale)
  return fallback
}

/**
 * 探针收尾整组收割（BUG-136）：先杀进程组 `-pid`（容忍已退出的 ESRCH），再直接杀 `child`，最后按端口三轮回收孙进程。
 */
export async function reapBootedWeb(booted, port, { killProcess = (pid, sig) => process.kill(pid, sig), reclaim }) {
  const child = booted?.child
  if (child) {
    if (typeof child.pid === 'number' && child.pid > 0) {
      try { killProcess(-child.pid, 'SIGKILL') } catch { /* 进程组已退出或非组长 */ }
    }
    try { child.kill?.('SIGKILL') } catch { /* 子进程已退出 */ }
  }
  if (typeof port === 'number' && Number.isInteger(port)) {
    return reclaim(port)
  }
  return null
}
