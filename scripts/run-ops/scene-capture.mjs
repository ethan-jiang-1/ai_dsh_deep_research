#!/usr/bin/env node
// scene-capture.mjs — 把"当时页面"抓成一个可复核的场景包（截图 + DOM + 正文 + console + meta）。
//
// 为什么存在（2026-10-20 审计 P0-4）：调试/复现时，agent 只能拿到 PASS/FAIL 文本；页面
// 到底长什么样、console 报了什么，没有统一留痕。本工具是"看见页面"的最小入口：
//   node scripts/run-ops/scene-capture.mjs '<gui-url>' [--out runtime/scenes/<name>] [--wait-ms 2000]
// 输出目录四件套 page.png / page.html / body.txt / console.txt + meta.json（token 已脱敏）。
// 只连已起的 GUI（不负责 boot；boot = dev/run-driver.mjs up）。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchCdpBrowser } from '../lib/cdp-driver.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const argv = process.argv.slice(2)
const opt = (name, fallback = undefined) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}
const positional = argv.filter((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--out' && argv[argv.indexOf(a) - 1] !== '--wait-ms')
const url = positional[0]
if (url === undefined || !/^(https?|data):/.test(url)) {
  console.error("scene-capture: 用法 node scripts/run-ops/scene-capture.mjs '<http(s)/data url>' [--out <dir>] [--wait-ms 2000]")
  process.exit(2)
}
const waitMs = Number(opt('--wait-ms', '2000'))
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const out = resolve(opt('--out', join(ROOT, 'runtime', 'scenes', `scene-${stamp}`)))
mkdirSync(out, { recursive: true })
const handle = await launchCdpBrowser({ url, windowSize: '1600,1000' })
let exitCode = 0
try {
  await new Promise((r) => setTimeout(r, Number.isFinite(waitMs) ? waitMs : 2000))
  const html = await handle.evaluate('document.documentElement.outerHTML')
  const body = await handle.evaluate('document.body?.innerText ?? ""')
  const shot = await handle.screenshot(join(out, 'page.png'), { fullPage: true })
  writeFileSync(join(out, 'page.html'), typeof html === 'string' ? html : '')
  writeFileSync(join(out, 'body.txt'), typeof body === 'string' ? body : '')
  writeFileSync(join(out, 'console.txt'), [...handle.consoleProblems, ...handle.exceptions].join('\n'))
  writeFileSync(join(out, 'meta.json'), JSON.stringify({
    url: url.replace(/([?&]token=)[^&]+/, '$1REDACTED'),
    at: new Date().toISOString(),
    screenshot: shot.path,
    consoleProblems: handle.consoleProblems,
    exceptions: handle.exceptions,
  }, null, 2))
  console.log(`scene-capture: ${out}`)
  console.log(`  page.png ${shot.bytes}B ｜ page.html / body.txt / console.txt / meta.json`)
} catch (error) {
  console.error(`scene-capture: 失败 ${String(error?.message ?? error)}——目录 ${out}`)
  exitCode = 1
} finally {
  await handle.settle()
}
process.exit(exitCode)
