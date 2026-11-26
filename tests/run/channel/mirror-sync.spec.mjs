// tests/run/channel/mirror-sync.spec.mjs —— checks/lib/channel/mirror-sync.mjs 的漂移分类契约。
//
// BUG-435：漂移门报错文本曾承诺"逐文件 cp 同步"却无实现；修法 A 把同步落成 --sync-mirror，
// 分类判据（client 产物 / 非运行时文档 / host 运行时）下沉本模块钉住。
// 负例留证 2026-11-26：修复前 `boot-run.sh --sync-mirror` = unknown mode exit 2（channel-start.e2e
// 新案例首跑红）；classifyDrift 模块缺席时本文件 import 即红。还原法 = 删 mirror-sync.mjs。
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { classifyDrift, clientArtifactRel } from '../../../checks/lib/channel/mirror-sync.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const PACK = join(ROOT, 'packages/deep-research-pack')

test('client 产物身份来自 exports["./client"]，不手写第二份', () => {
  assert.equal(clientArtifactRel(PACK), 'lib/client.js')
})

test('exports 缺 ./client → fail-loud，不猜路径', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mirror-sync-spec-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0' }))
  assert.throws(() => clientArtifactRel(dir), /client/)
})

test('exports 字符串形态与条件形态都解析，./ 前缀归一', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mirror-sync-spec-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ exports: { './client': './lib/client.js' } }))
  assert.equal(clientArtifactRel(dir), 'lib/client.js')
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ exports: { './client': { types: './x.d.ts', default: './lib/client.js' } } }))
  assert.equal(clientArtifactRel(dir), 'lib/client.js')
})

test('分类矩阵：client / 文档（README·LICENSE·.d.ts）/ host 运行时', () => {
  const plan = classifyDrift({
    packDir: PACK,
    driftRels: [
      'lib/client.js',
      'README.md', 'README.zh.md', 'LICENSE',
      'lib/types/client/locales/en.d.ts', 'lib/types/index.d.ts',
      'lib/defaults.js', 'lib/fetch-fallback.js', 'lib/index.js', 'lib/content.js', 'lib/startup.js',
      'lib/method-library-tool.js', 'lib/method-library-io-ix9dcYtn.js',
      'presets/lead.patch.yml', 'workers/research-worker.patch.yml',
      'content/manual.md', 'locale/zh.json', 'locale-content/zh.json',
      'cordis.patch.yml', 'package.json', 'scripts/doctor.mjs', 'icon.svg',
    ],
  })
  assert.deepEqual(plan.client, ['lib/client.js'])
  assert.deepEqual(plan.doc, ['README.md', 'README.zh.md', 'LICENSE', 'lib/types/client/locales/en.d.ts', 'lib/types/index.d.ts'])
  assert.equal(plan.host.length, 16)
  assert.ok(plan.host.includes('lib/defaults.js'))
  assert.ok(plan.host.includes('package.json'))
  assert.ok(plan.host.includes('cordis.patch.yml'))
})

test('空漂移 → 三桶皆空（无需同步）', () => {
  const plan = classifyDrift({ packDir: PACK, driftRels: [] })
  assert.deepEqual(plan, { client: [], doc: [], host: [] })
})

test('host 桶非空 = 不得就地同步（运行进程 boot 时缓存 host 代码）', () => {
  const mixed = classifyDrift({ packDir: PACK, driftRels: ['lib/client.js', 'lib/defaults.js'] })
  assert.ok(mixed.host.length > 0, 'client+host 混合漂移必须落 host 桶，快路径不得放行')
  const pure = classifyDrift({ packDir: PACK, driftRels: ['lib/client.js', 'lib/types/client/locales/zh.d.ts'] })
  assert.equal(pure.host.length, 0)
})

test('未知文件默认 host（fail-safe：不认识的不许走快路径）', () => {
  const plan = classifyDrift({ packDir: PACK, driftRels: ['some/new-file.bin'] })
  assert.deepEqual(plan.host, ['some/new-file.bin'])
})