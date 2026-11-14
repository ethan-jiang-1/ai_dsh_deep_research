#!/usr/bin/env node
// export-dist.mjs — 一条命令出完整交付：tarball + 安装手册 → _dist/。
// 精神移植自 ai_dsh_architect scripts/dist/export-dist.mjs（docs/distribution.md 的导出合同）：
//   ① 手册是**生成物**不是手写物——版本/日期/条目数在导出时注入，手册与旁边的 tarball 不能漂移；
//   ② 打包步骤 = release.entry 每轮证明的同一条 `npm pack`（cache 钉进仓库 gitignored 区，
//      工具态纪律：npm 不碰 ~/.npm）；inventory 在导出的产物本体上重申发布边界；
//   ③ 手册正文每一步都走 install-shape.entry 验证过的路径（profile init → plugin add → 真启动），
//      是被证明过的顺序，不是设想；
//   ④ _dist/ 是导出目的地，不是源——tarball gitignored，手册是唯一 tracked 例外
//      （verify 门禁 dist-manual-version 钉版本一致：版本动 → 必须同 diff 重导出）。
// 导出不是发布：不动版本、不跑自带门禁之外的面、不发布任何东西——打包的是当下工作树的 pack；
// 市场索引（_dist/market.json）与 tarball/手册同源同版本，供 Plugins → Discover 添加。
//
// 用法：node scripts/dist/export-dist.mjs

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localDateStr } from '../lib/local-date.mjs'
import { packInputRoots, writeBuildManifest } from '../lib/artifact-freshness.mjs'
import { writeMarketIndex } from './market.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const DIST = join(ROOT, '_dist')
const MANUAL = '安装手册.md'

const failed = []
const report = (name, ok, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed.push(name)
}

try {
  const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
  const dshEngine = pkg.engines?.dsh ?? '（缺）'
  const version = pkg.version
  const tarballName = `dsh-deep-research-pack-${version}.tgz`

  // 全新导出：只清本脚本自己的既有产物，不碰放进 _dist/ 的其他东西。
  mkdirSync(DIST, { recursive: true })
  for (const name of readdirSync(DIST)) {
    if (name === MANUAL || name === 'build-manifest.json' || /^dsh-deep-research-pack-.*\.tgz$/.test(name)) {
      rmSync(join(DIST, name), { force: true })
    }
  }

  // 1. 显式构建 + 打包：不把“构建发生了”押在 npm 的 prepack 上（ignore-scripts 环境会
  //    静默跳过 prepack 发陈旧 lib/）。先 pnpm build，再 npm pack --ignore-scripts。
  const built = spawnSync('pnpm', ['build'], { cwd: PACK, encoding: 'utf8' })
  report('pnpm build', built.status === 0,
    `exit ${built.status}${(built.stderr ?? '').trim() ? `：${built.stderr.trim().split('\n').slice(-2).join(' ')}` : ''}`)
  if (built.status !== 0) throw new Error('构建失败，拒绝打包陈旧 lib/')
  const scratch = mkdtempSync(join(tmpdir(), 'dsh-export-dist-'))
  const packed = spawnSync('npm', ['pack', '--ignore-scripts', '--pack-destination', DIST, '--cache', join(scratch, 'npm-cache')], {
    cwd: PACK, encoding: 'utf8',
  })
  rmSync(scratch, { recursive: true, force: true })
  const packedName = (packed.stdout ?? '').trim().split('\n').filter(Boolean).pop()
  report('npm pack', packed.status === 0 && packedName === tarballName,
    `exit ${packed.status}, ${packedName ?? '无 tarball'}${(packed.stderr ?? '').trim() ? `：${packed.stderr.trim().split('\n')[0]}` : ''}`)

  // 2. inventory——发布边界在导出的产物本体上重申：必备条目在场、全部 preset 随包、
  //    content 与只读 doctor 随包、tarball 里没有 package/ 之外的东西
  const tarball = join(DIST, tarballName)
  const tarballSha = createHash('sha256').update(readFileSync(tarball)).digest('hex')
  const listed = spawnSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
  const entries = (listed.stdout ?? '').split('\n').filter(Boolean)
  const must = [
    'package/LICENSE',
    'package/cordis.patch.yml',
    'package/README.md',
    'package/package.json',
    'package/lib/index.js',
    'package/lib/client.js',
    'package/content/manual.md',
    'package/content/templates/run/run.md',
    'package/lib/content.js',
    'package/lib/startup.js',
    'package/scripts/doctor.mjs',
    'package/scripts/lib/profile-read.mjs',
    'package/icon.svg',
    'package/locale/en.json',
    'package/locale/zh.json',
    'package/locale-content/en.json',
    'package/locale-startup/en.json',
    'package/locale-fetch-fallback/en.json',
  ]
  const missing = must.filter((entry) => !entries.includes(entry))
  // 发布边界：sourcemap 与 lib/types 下的 JS 是构建中间产物，不是运行时；进包即用户装垃圾
  // （DSH 自家包约定：不发布 src / JS maps / declaration maps）。
  const forbidden = entries.filter((entry) => /^package\/lib\/.*\.(?:js\.map|map)$/.test(entry) || /^package\/lib\/types\/.*\.js$/.test(entry))
  // 角色 id 允许连字符（method-editor），不能只匹配 [a-z]+；同时与盘上 preset 数逐个对账，
  // 少于应有数量即红（否则第 5 个 preset 缺席也能靠 >= 4 静默通过）。
  const expectedPresetRows = readdirSync(join(PACK, 'presets')).filter((f) => f.endsWith('.patch.yml')).length
  const presetRows = entries.filter((e) => /^package\/presets\/[a-z0-9][a-z0-9-]*\.patch\.yml$/.test(e)).length
  const skills = entries.filter((e) => e.endsWith('/SKILL.md')).length
  const templates = entries.filter((e) => e.startsWith('package/content/templates/')).length
  const outside = entries.filter((e) => !e.startsWith('package/'))
  report('inventory',
    listed.status === 0 && missing.length === 0 && forbidden.length === 0 && outside.length === 0 && expectedPresetRows > 0 && presetRows === expectedPresetRows && skills > 0 && templates > 0,
    missing.length > 0 ? `缺：${missing.join(', ')}`
      : forbidden.length > 0 ? `构建中间产物进包：${forbidden.slice(0, 5).join(', ')}${forbidden.length > 5 ? '…' : ''}（改 package.json files 排除）`
      : outside.length > 0 ? `package/ 之外的条目：${outside.join(', ')}`
        : `${entries.length} 条目，preset 行 ${presetRows}/${expectedPresetRows}，skill ${skills}，模板 ${templates}`)

  // 3. 手册——版本/日期/条目数注入，让它指名它旁边这份产物；步骤 = release.entry 的路径
  //    日期 = 本地口径（人读日期行；UTC slice 在 00:00–08:00 窗口差一天——BUG-017 同款口径纪律）
  const date = localDateStr()
  const manual = readFileSync(join(ROOT, 'scripts', 'dist', 'product-manual.md'), 'utf8')
    .replaceAll('{{version}}', version)
    .replaceAll('{{tarballName}}', tarballName)
    .replaceAll('{{date}}', date)
    .replaceAll('{{sha256}}', tarballSha)
    .replaceAll('{{dshEngine}}', dshEngine)
    .replaceAll('{{entryCount}}', String(entries.length))

  writeFileSync(join(DIST, MANUAL), manual)
  report('手册写入', true, `${MANUAL} — 版本 ${version}，${date}`)

  // 4. 市场索引——staged 发现面：npm 未发布时只给合法空索引（plugins: []）+ staged 文案，
  //    不列 source=npm 条目；发布后再由发布流程恢复。
  const market = writeMarketIndex()
  report('市场索引', true, `market.json — staged（0 installable entries），${market.bytes}B，sha256 ${market.sha256.slice(0, 12)}…`)

  // 5. 构建清单（BUG-181）：源指纹 + tarball 哈希；lifecycle 优先对清单，删除/替换源文件
  //    不会被「剩余文件最大 mtime」蒙混过去。
  const manifest = writeBuildManifest({
    artifact: tarball,
    roots: packInputRoots(PACK),
    manifestPath: join(DIST, 'build-manifest.json'),
  })
  report('构建清单', true, `build-manifest.json — source ${manifest.sourceFingerprint.slice(0, 12)}…（${manifest.sourceFiles} files）`)

  console.log('\n_dist/ 内容：')
  for (const name of readdirSync(DIST).sort()) console.log(`  ${name}`)
} catch (error) {
  report('意外失败', false, String(error))
}

if (failed.length > 0) {
  console.log(`\nexport-dist: ${failed.length} 步失败`)
  process.exit(1)
}
console.log('\nexport-dist: 全绿')
