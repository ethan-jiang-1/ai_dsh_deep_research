#!/usr/bin/env node
// 维护面：show（只读投影/诊断/取证；不判 PASS/FAIL）。规则 = docs/guides/68-surface-contract.md
// 状态：常驻
// 一句话：场景包捕获/读取：截图 + DOM + 正文 + console + meta（token 脱敏）
// 何时跑：看见「当时页面」；事后看现场（--list / --show）
// 档位：抓取 keyless（真实浏览器，须起通道）；读取 keyless（纯读盘）
// 判据：不适用（show）
// 不证明：页面正确性；它是在场证据，不是判定
// scene-capture.mjs — 把"当时页面"抓成一个可复核的场景包（截图 + DOM + 正文 + console + meta）。
//
// 为什么存在（2026-10-20 审计 P0-4）：调试/复现时，agent 只能拿到 PASS/FAIL 文本；页面
// 到底长什么样、console 报了什么，没有统一留痕。本工具是"看见页面"的最小入口：
//   node probes/analyze/scene-capture.mjs '<gui-url>' [--out runtime/scenes/<name>] [--wait-ms 2000]
// 输出目录四件套 page.png / page.html / body.txt / console.txt + meta.json（token 已脱敏）。
// 读取半边（2026-10-21 卫生轮——场景包此前全仓零消费者，抓了只能人肉开文件）：
//   --list                 列既有场景包（mtime 降序；缺件/坏 meta 如实标记）
//   --show <name>          看单个场景包（meta 回显 + console/异常摘要 + body 前 40 行）
//   （均可选 --scenes-dir <dir> 覆盖根，默认 runtime/scenes/）
// 只连已起的 GUI（不负责 boot；boot = tools/run-driver.mjs up）。
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchCdpBrowser } from '../../checks/lib/shared/cdp-driver.mjs'
import { listScenePacks, readScenePack, PACK_FILES } from '../../checks/lib/ops/scene-pack.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const argv = process.argv.slice(2)
const opt = (name, fallback = undefined) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}

// ── 读取子命令（不连浏览器；纯读盘，判据与列示 = lib/scene-pack.mjs）──
const scenesRoot = resolve(opt('--scenes-dir', join(ROOT, 'runtime', 'scenes')))
if (argv.includes('--list')) {
  const packs = listScenePacks(scenesRoot)
  if (packs.length === 0) {
    console.error(`scene-capture: ${scenesRoot} 下没有场景包——先抓：scene-capture '<url>' --out <dir>`)
    process.exit(2)
  }
  for (const p of packs) {
    const missing = PACK_FILES.filter((f) => !p.files[f].present)
    const url = p.meta?.url ?? `(meta 缺席${p.metaError ? '：' + p.metaError : ''})`
    console.log(`${p.name}  ${new Date(p.mtime).toISOString()}  ${url}  console:${p.consoleProblems ?? '?'} 异常:${p.exceptions ?? '?'}${missing.length ? `  ⚠缺件:${missing.join(',')}` : ''}`)
  }
  process.exit(0)
}
if (argv.includes('--show')) {
  const name = opt('--show')
  if (name === undefined) {
    console.error('scene-capture: --show 需要 <场景包名>（先 --list 看在场的包）')
    process.exit(2)
  }
  const dir = resolve(scenesRoot, name)
  const p = readScenePack(dir)
  if (p === null) {
    console.error(`scene-capture: 场景包 ${name} 不在场（${dir}）——先 --list 看在场的包`)
    process.exit(2)
  }
  console.log(`场景包 ${p.name}（${dir}）`)
  console.log(`  url: ${p.meta?.url ?? '(meta 缺席)'}  at: ${p.meta?.at ?? '?'}${p.metaError ? `  ⚠meta 不可解析：${p.metaError}` : ''}`)
  for (const f of PACK_FILES) console.log(`  ${f}: ${p.files[f].present ? `${p.files[f].bytes}B` : '缺席'}`)
  if (p.meta?.consoleProblems?.length) {
    console.log('  —— console 问题（meta 记录，截 200 字）：')
    for (const line of p.meta.consoleProblems) console.log(`    ${String(line).slice(0, 200)}`)
  }
  if (p.meta?.exceptions?.length) {
    console.log('  —— 异常（meta 记录，截 200 字）：')
    for (const line of p.meta.exceptions) console.log(`    ${String(line).slice(0, 200)}`)
  }
  if (p.files['body.txt'].present) {
    console.log('  —— body.txt（前 40 行，每行截 200 字）：')
    for (const line of readFileSync(join(dir, 'body.txt'), 'utf8').split('\n').slice(0, 40)) console.log(`    ${line.slice(0, 200)}`)
  }
  process.exit(0)
}

const positional = argv.filter((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--out' && argv[argv.indexOf(a) - 1] !== '--wait-ms' && argv[argv.indexOf(a) - 1] !== '--show' && argv[argv.indexOf(a) - 1] !== '--scenes-dir')
const url = positional[0]
if (url === undefined || !/^(https?|data):/.test(url)) {
  console.error("scene-capture: 用法 node probes/analyze/scene-capture.mjs '<http(s)/data url>' [--out <dir>] [--wait-ms 2000]")
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
