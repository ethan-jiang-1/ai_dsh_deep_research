#!/usr/bin/env node
// lifecycle.entry — L2：发布物 → 安装 → 组合 → 显示面 → 卸载 的整条生命周期。
//
// 与 install-shape.entry 的分工：那条证"CLI 装包分支 + 团队层"的用户路径；本条证**发布面与显示面**：
//   ① `_dist/market.json` 过 DSH 自己的 `parseMarketIndex`，且版本/兼容范围与包清单一致
//   ② tarball 带 locale/icon、不带 sourcemap（DSH 包约定）
//   ③ 干净 profile 装 tarball → dump 出本包 10 个 entry id、无 `entry "…" not found`
//   ④ 真启动打印 token URL、无 `did not activate` / `ERR_MODULE_NOT_FOUND`
//   ⑤ 运行期用 `readPluginMeta` 读四个 specifier：中英标题/描述/图标真的解析得出来
//   ⑥ `dsh plugin remove` 后 roster 回到 base + web-app
//
// 前置：PATH 上有 dsh 与 pnpm；`_dist` 里同时有本版本 tarball 与 market.json（先跑
// `node scripts/dist/export-dist.mjs`）。缺任一 = exit 2（未跑 ≠ 通过）；断言失败 = exit 1。
// 用法：node scripts/smoke/lifecycle.entry.mjs
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'
import { scrubbedEnv } from '../lib/env.mjs'
import { artifactFreshness } from '../lib/artifact-freshness.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const PROFILE = 'lifecycle'
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const dsh = process.env.DSH_BIN ?? 'dsh'
const failures = []
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === '' ? '' : `\n      → ${detail}`}`)
  if (!ok) failures.push(name)
}
const notRun = (reason) => { console.error(`lifecycle.entry: NOT-RUN — ${reason}`); process.exit(2) }
const tail = (r) => `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-6).join('\n')

const version = spawnSync(dsh, ['--version'], { encoding: 'utf8' })
if (version.status !== 0) notRun(`找不到 dsh（${dsh}）；用 DSH_BIN 指定`)
const tarball = process.env.PACK_TARBALL ?? join(ROOT, '_dist', `dsh-deep-research-pack-${pkg.version}.tgz`)
const marketFile = join(ROOT, '_dist', 'market.json')
if (!existsSync(tarball)) notRun(`tarball 缺席：${tarball}（先 node scripts/dist/export-dist.mjs）`)
if (!existsSync(marketFile)) notRun('_dist/market.json 缺席（先 node scripts/dist/export-dist.mjs）')
// 产物新鲜度（BUG-174）：旧 tarball 装上也能 ALL PASS，断言对象就不是当前 HEAD。CI 先
// export-dist，天然新鲜；本地/显式 PACK_TARBALL 用 --allow-stale 覆盖并打印理由。
const allowStale = process.argv.includes('--allow-stale') || process.env.LIFECYCLE_ALLOW_STALE === '1'
if (allowStale) {
  console.log('lifecycle.entry: --allow-stale——跳过 tarball 新鲜度检查（显式旧产物覆盖）')
} else {
  const freshness = artifactFreshness(tarball, [
    join(PACK, 'src'),
    join(PACK, 'lib'),
    join(PACK, 'presets'),
    join(PACK, 'content'),
    join(PACK, 'package.json'),
    join(PACK, 'cordis.patch.yml'),
  ])
  if (!freshness.fresh) {
    const newest = freshness.newest === null ? '—' : relative(ROOT, freshness.newest.path)
    notRun(`tarball 不是由当前 pack 生成：早于 ${newest}——先 node scripts/dist/export-dist.mjs（显式旧产物用 --allow-stale / LIFECYCLE_ALLOW_STALE=1）`)
  }
}

// ① 市场索引：真校验器 + staged（npm 未发布，不得出现可安装条目）。
const parsed = (() => {
  try { return parseMarketIndex(JSON.parse(readFileSync(marketFile, 'utf8')), 'https://example.invalid/market.json') }
  catch (error) { check('① parseMarketIndex 通过', false, String(error)); return undefined }
})()
if (parsed !== undefined) {
  check('① parseMarketIndex 通过', true)
  check('① staged 索引无安装条目', parsed.plugins.length === 0, `plugins=${parsed.plugins.length}；npm 未发布时不得列 source=npm 条目`)
  check('① staged 文案在场', /staged/i.test(String(parsed.description?.en ?? '')), String(parsed.description?.en ?? ''))
}

// ② tarball 形状：locale/icon 在，sourcemap 不在（内容判据由 export-dist 与 pack-manifest 前置保证）。
const listing = spawnSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
const entries = String(listing.stdout ?? '').split('\n').filter(Boolean)
check('② tarball 可列出', listing.status === 0 && entries.length > 0, String(listing.stderr ?? '').slice(0, 400))
check('② tarball 带 locale + icon', ['package/locale/en.json', 'package/locale/zh.json', 'package/icon.svg'].every((e) => entries.includes(e)),
  entries.filter((e) => /locale|icon/.test(e)).join(', '))
check('② tarball 无 sourcemap', entries.every((e) => !e.endsWith('.js.map')), entries.filter((e) => e.endsWith('.map')).slice(0, 3).join(', '))

const home = mkdtempSync(join(tmpdir(), 'dsh-lifecycle-'))
const probeDir = mkdtempSync(join(tmpdir(), 'dsh-lifecycle-probe-'))
const probeOut = join(probeDir, 'out.json')
const probeWorkspace = join(probeDir, 'workspace')
mkdirSync(probeWorkspace, { recursive: true })
const env = scrubbedEnv({ DSH_HOME: home, LIFECYCLE_PROBE_OUT: probeOut, LIFECYCLE_PROBE_BASE: join(home, 'profiles', PROFILE, 'package.json'), LIFECYCLE_PROBE_WORKSPACE: probeWorkspace })
const run = (args, timeout = 180_000) => spawnSync(dsh, args, { encoding: 'utf8', env, cwd: ROOT, timeout })

// 探针包：只读 —— 在 apply 里调 DSH 的 readPluginMeta 读四个 specifier 的显示面，结果落文件。
function writeProbe() {
  writeFileSync(join(probeDir, 'package.json'), `${JSON.stringify({
    name: '@tmp/lifecycle-meta-probe',
    version: '0.0.1',
    private: true,
    type: 'module',
    exports: { '.': './index.js' },
    dsh: { bundle: { patch: './cordis.patch.yml' } },
    files: ['cordis.patch.yml', 'index.js'],
  }, null, 2)}\n`)
  writeFileSync(join(probeDir, 'cordis.patch.yml'), "- insert:\n    - id: lifecycle-meta-probe\n      name: '@tmp/lifecycle-meta-probe'\n")
  writeFileSync(join(probeDir, 'index.js'), `import { writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
export const name = 'lifecycle-meta-probe'
export async function apply() {
  const out = { results: {} }
  try {
    const { createRequire } = await import('node:module')
    const requireFromProfile = createRequire(process.env.LIFECYCLE_PROBE_BASE)
    const appBoot = await import(pathToFileURL(requireFromProfile.resolve('@deepseek-ai/dsh-app-boot')).href)
    const base = pathToFileURL(process.env.LIFECYCLE_PROBE_BASE).href
    for (const spec of ['dsh-deep-research-pack', 'dsh-deep-research-pack/content', 'dsh-deep-research-pack/startup', 'dsh-deep-research-pack/fetch-fallback', 'dsh-deep-research-pack/method-library-tool']) {
      try { out.results[spec] = appBoot.readPluginMeta(spec, base) } catch (error) { out.results[spec] = { error: String(error) } }
    }
    try {
      const contentEntry = requireFromProfile.resolve('dsh-deep-research-pack/content')
      const content = await import(pathToFileURL(contentEntry).href)
      const calls = []
      const disposers = []
      const fakeCtx = {
        effect(fn) { calls.push('effect'); const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose); return dispose },
        logger: { warn() {}, info() {} },
        systemPrompt: {
          variable(name) { calls.push('variable:' + name); return () => {} },
          context(input) { calls.push('context:' + input.name); return () => {} },
        },
      }
      const packRoot = dirname(dirname(contentEntry))
      content.apply(fakeCtx, { packRoot, manual: '# installed effect probe' })
      const disposerCount = disposers.length
      for (const dispose of disposers) dispose()
      out.effect = { calls, disposers: disposerCount }
    } catch (error) { out.effect = { error: String(error) } }
    try {
      const startupEntry = requireFromProfile.resolve('dsh-deep-research-pack/startup')
      const startup = await import(pathToFileURL(startupEntry).href)
      const calls = []
      const disposers = []
      const fakeCtx = {
        effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose); return dispose },
        logger: { info() {}, warn() {} },
        workspaceRegistry: { create: async (path) => { calls.push('workspace:' + path); return { path, workspaceId: 'probe' } } },
        get(name) { return name === 'sessionController' ? { create: async () => { calls.push('session'); return { sessionId: 'probe' } } } : undefined },
      }
      process.env.DEEP_RESEARCH_WORKSPACE = process.env.LIFECYCLE_PROBE_WORKSPACE
      startup.apply(fakeCtx)
      await new Promise((resolve) => setTimeout(resolve, 50))
      for (const dispose of disposers) dispose()
      out.startup = { calls, disposers: disposers.length }
    } catch (error) { out.startup = { error: String(error) } }
    try {
      const defaultsEntry = requireFromProfile.resolve('dsh-deep-research-pack/defaults')
      const defaults = await import(pathToFileURL(defaultsEntry).href)
      const calls = []
      const disposers = []
      const fakeCtx = {
        effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose); return dispose },
        logger: { info() {}, warn() {} },
        systemPrompt: {
          context(input) {
            calls.push('context:' + input.name)
            if (typeof input.text === 'function') {
              try { input.text({ agent: { session: { header: { cwd: process.env.LIFECYCLE_PROBE_WORKSPACE } } } }) } catch { /* 空库/坏文件由 warnOnce 承担 */ }
            }
            return () => {}
          },
        },
        inject(names, callback) {
          calls.push('inject:' + names.join(','))
          callback({
            commands: { register(definition) { calls.push('command:' + definition.name); return () => {} } },
            effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose); return dispose },
          })
        },
      }
      defaults.apply(fakeCtx)
      out.defaults = { calls, disposers: disposers.length }
    } catch (error) { out.defaults = { error: String(error) } }
  } catch (error) { out.fatal = String(error) }
  writeFileSync(process.env.LIFECYCLE_PROBE_OUT, JSON.stringify(out, null, 2))
}
`)
}

try {
  const init = run(['--profile', PROFILE, '--from-default-profile', 'web', '--dump-default-config'])
  check('③ profile 初始化（web 模板）', init.status === 0, tail(init))

  writeProbe()
  const addPack = run(['plugin', '--profile', PROFILE, 'add', `file:${tarball}`])
  check('③ 装 tarball', addPack.status === 0, tail(addPack))
  const addProbe = run(['plugin', '--profile', PROFILE, 'add', probeDir])
  check('③ 装显示面探针', addProbe.status === 0, tail(addProbe))

  const dump = run(['--profile', PROFILE, '--dump-config'])
  const dumpText = `${dump.stdout ?? ''}`
  // 本包自己的行 = 5 preset + content/client/startup/fetch-fallback/tool-present。
  // `ui-agent-team` 归团队机制层（agent-team-profile），本 smoke 不装该层，故不在此列。
  const ours = ['preset-lead', 'preset-scout', 'preset-analyst', 'preset-critic', 'preset-method-editor',
    'research-content', 'research-client', 'research-startup', 'research-fetch-fallback', 'tool-present']
  const missing = ours.filter((id) => !dumpText.includes(id))
  check('③ dump 有本包 10 行', missing.length === 0, `缺：${missing.join(', ')}`)
  check('③ 未装团队层：dump 无 ui-agent-team（可选层缺席不阻断本包）', !dumpText.includes('ui-agent-team'), '团队层未装却出现 ui-agent-team 行——可选层归属/组合漂移')
  check('③ dump 无 entry not found', !/patch: entry ".*" not found/.test(`${dumpText}${dump.stderr ?? ''}`), tail(dump))

  const child = spawn(dsh, ['--profile', PROFILE, '--no-open', '--port', '0'], { env, cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  child.stdout.on('data', (c) => { output = (output + String(c)).slice(-128_000) })
  child.stderr.on('data', (c) => { output = (output + String(c)).slice(-128_000) })
  const started = await new Promise((resolveStarted) => {
    const timer = setTimeout(() => resolveStarted(false), 120_000)
    const tick = setInterval(() => {
      if (/dsh web: http:\/\/127\.0\.0\.1:\d+\/\?token=/.test(output)) { clearInterval(tick); clearTimeout(timer); resolveStarted(true) }
    }, 200)
    child.once('exit', () => { clearInterval(tick); clearTimeout(timer); resolveStarted(false) })
  })
  check('④ 真启动出 token URL', started, output.slice(-1500))

  // ⑤ 显示面：等探针落盘（显式状态），再断言四个 specifier。
  const deadline = Date.now() + 30_000
  while (!existsSync(probeOut) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200))
  check('④ 真启动无 did not activate / module 解析失败', !/did not activate|ERR_MODULE_NOT_FOUND/.test(output), output.slice(-1500))
  if (!existsSync(probeOut)) check('⑤ 显示面探针落盘', false, '探针没有写出结果（apply 没跑或 readPluginMeta 抛错）')
  else {
    const result = JSON.parse(readFileSync(probeOut, 'utf8'))
    const specs = ['dsh-deep-research-pack', 'dsh-deep-research-pack/content', 'dsh-deep-research-pack/startup', 'dsh-deep-research-pack/fetch-fallback', 'dsh-deep-research-pack/method-library-tool']
    for (const spec of specs) {
      const meta = result.results?.[spec]
      const ok = meta?.title?.zh !== undefined && meta?.description?.zh !== undefined && String(meta?.icon ?? '').startsWith('data:image/svg+xml')
      check(`⑤ ${spec} 有中英标题/描述/图标`, ok, String(JSON.stringify(meta)).slice(0, 300))
    }
    const effect = result.effect ?? {}
    const effectOk = Array.isArray(effect.calls) && effect.calls.includes('effect') &&
      effect.calls.includes('variable:research_pack_root') && effect.calls.includes('context:research:manual') &&
      Number(effect.disposers) >= 1
    check('⑤ 装起后 content.apply 真注册 variable/context 且返回 disposer', effectOk, String(JSON.stringify(effect)).slice(0, 400))
    const startup = result.startup ?? {}
    const startupOk = Array.isArray(startup.calls) && startup.calls.some((call) => String(call).startsWith('workspace:')) && Number(startup.disposers) >= 1
    check('⑤ 装起后 startup.apply 真登记工作区且返回 disposer', startupOk, String(JSON.stringify(startup)).slice(0, 400))
    const defaults = result.defaults ?? {}
    const defaultsOk = Array.isArray(defaults.calls) && defaults.calls.includes('context:research:defaults') &&
      defaults.calls.includes('command:research-defaults') && Number(defaults.disposers) >= 1
    check('⑤ 装起后 defaults.apply 真注册 context/命令且返回 disposer', defaultsOk, String(JSON.stringify(defaults)).slice(0, 400))
  }
  try { child.kill('SIGTERM') } catch {}
  await new Promise((r) => { child.once('exit', r); setTimeout(r, 5000) })

  // ⑥ 卸载：roster 回到 base + web-app；profile 目录保留。
  const remove = run(['plugin', '--profile', PROFILE, 'remove', 'dsh-deep-research-pack'])
  check('⑥ remove 成功', remove.status === 0, tail(remove))
  const manifest = JSON.parse(readFileSync(join(home, 'profiles', PROFILE, 'package.json'), 'utf8'))
  const bundles = manifest?.dsh?.profile?.bundles ?? []
  check('⑥ roster 里本包已移除、base + web-app 仍在',
    !bundles.includes('dsh-deep-research-pack') && bundles.includes('@deepseek-ai/dsh-base') && bundles.includes('@deepseek-ai/dsh-web-app'),
    JSON.stringify(bundles))
  check('⑥ dependency 已移除', manifest?.dependencies?.['dsh-deep-research-pack'] === undefined, JSON.stringify(manifest?.dependencies ?? {}))
} finally {
  rmSync(home, { recursive: true, force: true })
  rmSync(probeDir, { recursive: true, force: true })
}

console.log(`\nlifecycle.entry: ${failures.length === 0 ? 'ALL PASS' : `${failures.length} FAIL`}`)
process.exit(failures.length === 0 ? 0 : 1)
