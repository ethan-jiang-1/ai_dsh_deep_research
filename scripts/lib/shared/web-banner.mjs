// web-banner.mjs — DSH web 子进程启动横幅等待与结算纯状态机（BUG-095；零 child_process/net 依赖）。
//
// 为什么抽离：web-harness.bootWeb 的 spawn 壳在 SMOKE_ONLY，而「成功/提前退出/超时三条结算路径必须清除
// banner timer 并摘除监听器（不留 120–240s 悬挂句柄）」是纯 EventEmitter 状态机契约，应在 keyless 单测中
// 真跑验证句柄归零，而非靠正则搜源码字符串。
import { startupFailureHint } from './startup-hint.mjs'

/** 启动横幅里的 token URL——各站点同一形态（boot 输出一行 `http://127.0.0.1:<port>/?token=…`）。 */
export const bannerRe = (port) => new RegExp(`http://127\\.0\\.0\\.1:${port}/\\?token=(\\S+)`)

/**
 * 监听已派生的 web 子进程流直到打出启动横幅、提前退出或超时；任一路径落定即清理 timer 与流/退出监听。
 *
 * @param {{ stdout: import('node:events').EventEmitter, stderr: import('node:events').EventEmitter } & import('node:events').EventEmitter} child
 * @param {{ port: number, profile: string, timeoutMs: number, tailChars: number }} options
 * @returns {Promise<{ token: string, output: () => string }>}
 */
export function waitForWebBanner(child, { port, profile, timeoutMs, tailChars }) {
  let output = ''
  const targetRe = bannerRe(port)
  return new Promise((resolve, reject) => {
    let settled = false
    let timer = undefined
    const settle = (fn, value) => {
      if (settled) return
      settled = true
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }
      child.stdout?.off?.('data', onData)
      child.stderr?.off?.('data', onData)
      child.off?.('exit', onExit)
      fn(value)
    }
    const onData = (chunk) => {
      output += String(chunk)
      const match = targetRe.exec(output)
      if (match !== null) settle(resolve, { token: match[1], output: () => output })
    }
    const hintSuffix = () => {
      const hint = startupFailureHint(output, profile)
      return hint === '' ? '' : `\n${hint}`
    }
    const onExit = (code) => settle(
      reject,
      new Error(`web 进程提前退出（code ${String(code)}）${hintSuffix()}\n${output.slice(-tailChars)}`),
    )
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('exit', onExit)
    timer = setTimeout(
      () => settle(reject, new Error(`等待启动横幅超时${hintSuffix()}\n${output.slice(-tailChars)}`)),
      timeoutMs,
    )
  })
}
