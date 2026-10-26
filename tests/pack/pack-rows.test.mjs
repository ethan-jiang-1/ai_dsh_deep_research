// pack-rows — 从 bundle/preset 的 `name:` 抽出宿主运行时行依赖。
// preflight 的 peer 检查只应检查这些包（DSH 运行时要从安装锚解析它们），
// 不应把全部 peerDependencies（含 client/构建期依赖）都当 Node 包。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rowPeerNames } from '../../packages/deep-research-pack/scripts/lib/pack-rows.mjs'

test('rowPeerNames：bundle + presets 的 @deepseek-ai 行名去重排序，排除本包/非 DSH 包', (t) => {
  const pack = mkdtempSync(join(tmpdir(), 'dsh-pack-rows-'))
  t.after(() => rmSync(pack, { recursive: true, force: true }))
  mkdirSync(join(pack, 'presets'), { recursive: true })
  writeFileSync(join(pack, 'cordis.patch.yml'), [
    '- id: agent-preset-registry',
    "  name: '@deepseek-ai/dsh-agent-preset-registry'",
    '- insert:',
    '    - id: tool-present',
    "      name: '@deepseek-ai/dsh-tool-present'",
    "    - id: research-client",
    "      name: 'dsh-deep-research-pack'",
  ].join('\n'))
  writeFileSync(join(pack, 'presets', 'lead.patch.yml'), [
    'plugins:',
    "  - name: '@deepseek-ai/dsh-persona'",
    "  - name: '@deepseek-ai/dsh-tool-present'",
    "  - name: 'dsh-deep-research-pack'",
  ].join('\n'))
  assert.deepEqual(rowPeerNames(pack), [
    '@deepseek-ai/dsh-agent-preset-registry',
    '@deepseek-ai/dsh-persona',
    '@deepseek-ai/dsh-tool-present',
  ])
})

test('rowPeerNames：真实 pack 的行名都在 peerDependencies（row-deps 的运行期视图）', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const { dirname, join: joinPath } = await import('node:path')
  const PACK = joinPath(dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages', 'deep-research-pack')
  const pkg = JSON.parse(readFileSync(joinPath(PACK, 'package.json'), 'utf8'))
  const rows = rowPeerNames(PACK)
  assert.ok(rows.length >= 10, '真实 pack 的行依赖不应为空')
  const peers = new Set(Object.keys(pkg.peerDependencies ?? {}))
  assert.deepEqual(rows.filter((name) => !peers.has(name)), [], '行名必须是 peerDependencies 成员')
  assert.ok(rows.includes('@deepseek-ai/dsh-agent-preset-registry'))
  assert.ok(rows.includes('@deepseek-ai/dsh-tool-web'))
  assert.ok(!rows.includes('dsh-deep-research-pack'), '本包不是宿主 peer，排除')
})
