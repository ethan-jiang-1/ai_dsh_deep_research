// boot-port.mjs — 自动端口的有界重选（BUG-338），纯逻辑：无 child_process / net 依赖，
// pick 与 boot 都由调用方注入（tests 可直接驱动；入口传 pickFreePort + 真实 boot）。
/**
 * 自动选端口后的有界重选（BUG-338）：检查与 bind 之间的窗口不可能靠预留消除，只能兜住。
 * 显式端口只试一次（用户指定，冲突即报）；自动端口遇 EADDRINUSE 重选，最多 attempts 次，
 * 仍失败抛最后一次错误——不无限重试，也不声称 TOCTOU 已消除。
 * @param {{ explicitPort?: number | null, attempts?: number, boot: (port: number) => Promise<any>, pick?: () => Promise<number | null>, onRetry?: (info: { port: number, attempt: number, attempts: number }) => void }} opts
 */
export async function bootOnFreePort({ explicitPort = null, attempts = 3, boot, pick, onRetry = () => {} }) {
  if (explicitPort !== null) return { port: explicitPort, value: await boot(explicitPort) }
  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (typeof pick !== 'function') throw new TypeError('bootOnFreePort: pick 必须是函数')
    const port = await pick()
    if (port === null) { lastError = new Error('找不到空闲端口'); break }
    try {
      return { port, value: await boot(port) }
    } catch (error) {
      lastError = error
      if (!/EADDRINUSE|address already in use/i.test(String(error?.message ?? error))) throw error
      onRetry({ port, attempt, attempts })
    }
  }
  throw lastError ?? new Error('找不到空闲端口')
}
