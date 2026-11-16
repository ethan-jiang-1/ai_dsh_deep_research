// live 文档散文路径的纯函数判据（BUG-204 类级：散文里的仓内路径也要能被发现与验证）。
//
// 负例留证 2026-11-16：BUG-204——把 `runtime/README.md` 的 `scripts/lib/ops/scene-pack.mjs`
// 改回 `scripts/lib/scene-pack.mjs`（或给散文注入不存在路径）→ doc-paths 门禁红；本 spec
// 的枚举/排除用例同时钉住反引号、围栏与 URL 三类形态。还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prosePathTokens } from '../../scripts/lib/repo/doc-prose-paths.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

test('散文路径枚举：识别仓内带扩展名 token，剥反引号/围栏/URL（BUG-204）', () => {
  const text = [
    '读取判据 = scripts/lib/ops/scene-pack.mjs。',
    '内联代码 `scripts/lib/inline.mjs` 不算散文。',
    '```',
    'scripts/lib/fenced.mjs',
    '```',
    'URL https://example.com/scripts/lib/url.mjs 不算仓内散文。',
    'docs/testing.md 经 vendor 前缀解析。',
    'tests/run/gates/final-version.spec.mjs 带括号）',
  ].join('\n')
  const tokens = prosePathTokens(text).map((entry) => entry.path)
  assert.deepEqual(tokens, [
    'scripts/lib/ops/scene-pack.mjs',
    'docs/testing.md',
    'tests/run/gates/final-version.spec.mjs',
  ])
  assert.deepEqual(prosePathTokens('无路径的一行'), [])
})

test('live 文档的散文路径可被枚举（BUG-204 负控）', () => {
  const discipline = readFileSync(join(ROOT, 'docs', 'discipline-map.md'), 'utf8')
  assert.ok(prosePathTokens(discipline).some((entry) => entry.path === 'docs/testing.md'),
    'docs/discipline-map.md 的 vendor 简写 docs/testing.md 必须被散文枚举看到（存在性由 doc-paths 按 vendor/dsh 前缀解析）')
})
