#!/usr/bin/env node
// pack-smoke.mjs — T0 打包形状证据（keyless，不构建、不联网）。
// `npm pack --dry-run --json --ignore-scripts` 看 tarball 真正会带哪些文件；构建产物必须已在位
//（bootstrap/prepack 的职责），缺席 exit 2——未跑 ≠ 通过。
// 用法：node scripts/smoke/pack-smoke.mjs
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrubbedEnv } from '../lib/env.mjs'

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
    console.error(`pack-smoke: 构建产物缺席（${rel}）——先 pnpm build / export-dist；未跑 ≠ 通过`)
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
for (const required of ['package.json', 'cordis.patch.yml', 'lib/index.js', 'lib/client.js', 'presets/lead.patch.yml', 'workspace/seed.json', 'scripts/scaffold.mjs']) {
  check(has(required), `tarball 含 ${required}`)
}
for (const forbidden of ['.env', '.credentials' + '.yaml', 'node_modules', '_dist']) {
  check(!listed.some((rel) => rel === forbidden || rel.startsWith(`${forbidden}/`)), `tarball 不含 ${forbidden}`)
}
check(pkg.exports?.['./client']?.default === './lib/client.js', 'exports["./client"] 指向已存在的 lib/client.js')
const manual = join(ROOT, '_dist', '安装手册.md')
const tgz = join(ROOT, '_dist', `dsh-deep-research-pack-${pkg.version}.tgz`)
if (existsSync(manual) && existsSync(tgz)) {
  const declared = /sha256\s*\|\s*`([0-9a-f]{64})`/.exec(readFileSync(manual, 'utf8'))?.[1] ?? null
  const actual = createHash('sha256').update(readFileSync(tgz)).digest('hex')
  check(declared !== null && declared === actual, '手册 sha256 = 实际 tarball', `${declared?.slice(0, 12) ?? '（缺）'} vs ${actual.slice(0, 12)}`)
} else {
  console.log('SKIP  手册/ tarball 不在场：本次不验 sha256（export-dist 后应重跑）')
}
check(pkg.scripts?.install === undefined && pkg.scripts?.postinstall === undefined && pkg.scripts?.prepare === undefined,
  '无安装期生命周期脚本（tarball 不需要 allowBuilds）')

if (failures.length > 0) {
  console.error(`\npack-smoke: ${failures.length} 项失败`)
  process.exit(1)
}
console.log(`pack-smoke: ALL PASS（${listed.length} 个 tarball 条目；导出/入口/凭据边界）`)
process.exit(0)
