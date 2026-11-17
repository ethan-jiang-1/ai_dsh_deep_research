#!/usr/bin/env node
// pack.e2e.mjs — T0 打包形状证据（keyless，不构建、不联网）。
// `npm pack --dry-run --json --ignore-scripts` 看 tarball 真正会带哪些文件；构建产物必须已在位
//（bootstrap/prepack 的职责），缺席 exit 2——未跑 ≠ 通过。
//
// 两类判据（BUG-227/219/228 类级，纯函数正本 = checks/lib/repo/shipped-surface.mjs）：
//   ① 文本：随包文本（README / presets / content / scripts / workers / 构建产物）零 dev 引用；
//      README 用户段（折叠区外）零开发命令。
//   ② 集合：tarball 顶层 = 允许集；`lib/types/**/*.d.ts` = `exports.*.types`；`files` 是显式允许集。
// 负控 = tests/checks/shipped-surface.test.mjs 的纯函数矩阵 + 逐卡红证回放；本件证真实产物。
// 用法：node checks/smoke/pack.e2e.mjs
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { relative } from 'node:path'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrubbedEnv } from '../lib/shared/env.mjs'
import {
  filesAllowlistIssues, readmeUserSectionIssues, shippedSourceFilesOf, shippedTextIssues, topLevelIssues,
  typeClosureOf, typeSetIssues,
} from '../lib/repo/shipped-surface.mjs'
import { packDepsIssues } from '../lib/repo/pack-deps.mjs'
import { workspaceProtocolIssues } from '../lib/repo/publish-manifest.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}

for (const rel of ['lib/index.js', 'lib/client.js', 'lib/types/index.d.ts', 'lib/types/client/index.d.ts']) {
  if (!existsSync(join(PACK, rel))) {
    console.error(`pack.e2e: 构建产物缺席（${rel}）——先 pnpm build / export-dist；未跑 ≠ 通过`)
    process.exit(2)
  }
}
const run = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
  cwd: PACK, encoding: 'utf8',
  env: scrubbedEnv({ npm_config_cache: join(ROOT, 'runtime', 'smoke-workspace', 'npm-cache') }),
})
let listed = []
try { listed = JSON.parse(run.stdout)[0].files.map((f) => f.path) } catch {}
check(run.status === 0 && listed.length > 0, 'npm pack --dry-run --json 可解析', (run.stderr || '').slice(-500))
const has = (rel) => listed.includes(rel)
for (const required of ['package.json', 'cordis.patch.yml', 'lib/index.js', 'lib/client.js', 'lib/content.js', 'lib/startup.js', 'presets/lead.patch.yml', 'content/manual.md', 'content/templates/run/run.md', 'scripts/doctor.mjs']) {
  check(has(required), `tarball 含 ${required}`)
}
for (const forbidden of ['.env', '.credentials' + '.yaml', 'node_modules', '_dist']) {
  check(!listed.some((rel) => rel === forbidden || rel.startsWith(`${forbidden}/`)), `tarball 不含 ${forbidden}`)
}
check(pkg.exports?.['./client']?.default === './lib/client.js', 'exports["./client"] 指向已存在的 lib/client.js')

// ── 发布面自足（BUG-227 / 219 / 228 / 239）：集合 = 公开合同的反投影；随包文本零 dev 引用 ──
check(listed.length >= 50, '防空语料：tarball 条目下限', `只列出 ${listed.length} 条——构建产物缺席或 files 被收窄成空`)
const closure = typeClosureOf(pkg, {
  read: (rel) => readFileSync(join(PACK, rel), 'utf8'),
  exists: (rel) => existsSync(join(PACK, rel)),
})
check(closure.unresolved.length === 0, '类型闭包可解析', closure.unresolved.slice(0, 4).join('；'))
let closureFixture = null
try { closureFixture = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'shipped', 'type-closure.json'), 'utf8')) } catch { /* 缺失按漂移处理 */ }
check(closureFixture !== null && JSON.stringify(closureFixture.files) === JSON.stringify(closure.files),
  '类型闭包夹具 = 盘上闭包', '重跑 node tools/record/record-type-closure.mjs')
const surfaceProblems = [
  ...filesAllowlistIssues(pkg, { typeClosure: closure.files }),
  ...topLevelIssues(listed),
  ...typeSetIssues(listed.filter((rel) => rel.startsWith('lib/types/')), closure.files),
]
check(surfaceProblems.length === 0, '发布集合 = 允许集 / exports.types 可达闭包', surfaceProblems.slice(0, 6).join('；'))
const TEXT = /\.(?:md|js|mjs|cjs|ts|tsx|yml|yaml|json)$/
const shippedTexts = listed.filter((rel) => TEXT.test(rel)).map((rel) => ({ path: rel, text: readFileSync(join(PACK, rel), 'utf8') }))
check(shippedTexts.length >= 20, '防空语料：随包文本文件下限', `只读到 ${shippedTexts.length} 份——扫描面被收窄`)
const textProblems = shippedTextIssues(shippedTexts)
for (const name of ['README.md', 'README.zh.md']) {
  if (existsSync(join(PACK, name))) textProblems.push(...readmeUserSectionIssues(readFileSync(join(PACK, name), 'utf8')))
}
check(textProblems.length === 0, '随包文本零 dev 引用', textProblems.slice(0, 6).join('；'))
// 源侧扫描集 ⊇ 发布文本集（BUG-231）：keyless 只能扫它派生的那套；这里对真实 tarball 兜底。
const packAll = []
const collect = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) collect(abs)
    else packAll.push(relative(PACK, abs).split('\\').join('/'))
  }
}
collect(PACK)
const derivedSources = new Set(shippedSourceFilesOf(pkg, packAll))
const uncovered = shippedTexts.filter(({ path }) => !path.startsWith('lib/') && !derivedSources.has(path)).map(({ path }) => path)
check(uncovered.length === 0, '发布文本集 ⊆ 源侧扫描集', uncovered.slice(0, 6).join('；'))
check(derivedSources.size >= 20, '防空语料：源侧扫描集下限', `只派生 ${derivedSources.size} 份`)

// ── 发布物依赖闭包 = peers（BUG-229 / 232 / 238）：正向 require/import、反向死 peer、范围对账 ──
const readListed = (rel) => readFileSync(join(PACK, rel), 'utf8')
const jsTexts = listed.filter((rel) => /^lib\/[^/]+\.js$/.test(rel)).map(readListed)
const dtsTexts = listed.filter((rel) => rel.startsWith('lib/types/') && rel.endsWith('.d.ts')).map(readListed)
const yamlTexts = listed.filter((rel) => /\.ya?ml$/.test(rel)
  && (rel.startsWith('presets/') || rel.startsWith('workers/') || rel === 'cordis.patch.yml')).map(readListed)
check(jsTexts.length >= 5 && dtsTexts.length >= 5, '防空语料：发布物依赖扫描面', `js=${jsTexts.length} dts=${dtsTexts.length}`)
const depProblems = packDepsIssues({ pkg, jsTexts, dtsTexts, yamlTexts })
check(depProblems.length === 0, '发布物依赖闭包 = peers（正向/反向/范围）', depProblems.slice(0, 6).join('；'))

// client 模块表（2026-11-03 从 tests/pack/package-contract 迁入）：断言读 lib/client.js，
// 属构建产物面；keyless 回归必须能 fresh-clone 跑（无 lib/），故由本冒烟拥有——它本就要求
// lib/ 在位，缺席 exit 2。
const clientBundle = readFileSync(join(PACK, 'lib', 'client.js'), 'utf8')
const clientRequires = [...new Set([...clientBundle.matchAll(/require\("(@deepseek-ai\/[^"]+)"\)/g)].map((match) => match[1]))]
const inject = new Set(pkg.dsh?.client?.inject ?? [])
check(clientRequires.length > 0, 'client 模块表：构建产物含可检查的 @deepseek-ai require')
for (const name of clientRequires) {
  check(inject.has(name), `client 运行时 require ${name} 已在 dsh.client.inject`)
  check(Object.hasOwn(pkg.peerDependencies ?? {}, name), `client inject ${name} 已在 peerDependencies`)
}
const manual = join(ROOT, '_dist', '安装手册.md')
const tgz = join(ROOT, '_dist', `dsh-deep-research-pack-${pkg.version}.tgz`)
if (existsSync(tgz)) {
  // 发布 manifest 收口（BUG-236）：tarball 的 package.json 不得带 devDependencies / workspace 协议。
  const manifestRead = spawnSync('tar', ['-xOf', tgz, 'package/package.json'], { encoding: 'utf8' })
  let packedManifest
  try { packedManifest = JSON.parse(manifestRead.stdout) } catch { packedManifest = undefined }
  check(packedManifest !== undefined, 'tarball manifest 可解析', String(manifestRead.stderr ?? '').slice(0, 300))
  check(packedManifest !== undefined && packedManifest.devDependencies === undefined,
    'tarball manifest 无 devDependencies（发布面剥离，BUG-236）',
    packedManifest === undefined ? '' : JSON.stringify(Object.keys(packedManifest.devDependencies ?? {})))
  const protocol = packedManifest === undefined ? [] : workspaceProtocolIssues(packedManifest)
  check(protocol.length === 0, 'tarball manifest 无 workspace 协议', protocol.slice(0, 4).join('；'))
}
if (existsSync(manual) && existsSync(tgz)) {
  const declared = /sha256\s*\|\s*`([0-9a-f]{64})`/.exec(readFileSync(manual, 'utf8'))?.[1] ?? null
  const actual = createHash('sha256').update(readFileSync(tgz)).digest('hex')
  check(declared !== null && declared === actual, '手册 sha256 = 实际 tarball', `${declared?.slice(0, 12) ?? '（缺）'} vs ${actual.slice(0, 12)}`)
  const listing = spawnSync('tar', ['-tvzf', tgz], { encoding: 'utf8' })
  const entries = (listing.stdout ?? '').split('\n').filter(Boolean)
  check(listing.status === 0 && entries.length > 0, 'tarball 可列出', (listing.stderr || '').slice(-200))
  check(entries.every((line) => !/^l/.test(line)), 'tarball 无 symlink 条目')
  check(entries.every((line) => !/^[^\s]+\s+[^\s]*s[^\s]*\s/.test(line)), 'tarball 无 setuid 条目')
} else {
  console.log('SKIP  手册/ tarball 不在场：本次不验 sha256/条目（export-dist 后应重跑）')
}

// 可复现性：同一源码两次 npm pack 必须字节相同（tarball sha 相同）
const repro = mkdtempSync(join(tmpdir(), 'pack-repro-'))
try {
  const copy = join(repro, 'pack')
  cpSync(PACK, copy, { recursive: true })
  const outs = [join(repro, 'out1'), join(repro, 'out2')]
  for (const out of outs) {
    spawnSync('mkdir', ['-p', out])
    const r = spawnSync('npm', ['pack', '--ignore-scripts', '--pack-destination', out], {
      cwd: copy, encoding: 'utf8', env: scrubbedEnv({ npm_config_cache: join(repro, 'cache') }),
    })
    if (r.status !== 0) { check(false, 'npm pack 可复现性预跑', (r.stderr || '').slice(-300)); break }
  }
  const tgzs = outs.map((out) => {
    const files = readdirSync(out).filter((n) => n.endsWith('.tgz'))
    return files.length === 1 ? join(out, files[0]) : null
  })
  if (tgzs.every((p) => p !== null && existsSync(p))) {
    const hashes = tgzs.map((p) => createHash('sha256').update(readFileSync(p)).digest('hex'))
    check(hashes[0] === hashes[1], 'npm pack 两次同 sha（可复现）', `${hashes[0].slice(0, 12)} vs ${hashes[1].slice(0, 12)}`)
  }
} finally {
  rmSync(repro, { recursive: true, force: true })
}
check(pkg.scripts?.install === undefined && pkg.scripts?.postinstall === undefined && pkg.scripts?.prepare === undefined,
  '无安装期生命周期脚本（tarball 不需要 allowBuilds）')

if (failures.length > 0) {
  console.error(`\npack.e2e: ${failures.length} 项失败`)
  process.exit(1)
}
console.log(`pack.e2e: ALL PASS（${listed.length} 个 tarball 条目；导出/入口/凭据边界）`)
process.exit(0)
