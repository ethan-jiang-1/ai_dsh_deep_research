// live 文档散文路径的纯函数判据（BUG-204 类级：散文里的仓内路径也要能被发现与验证）。
//
// 负例留证 2026-11-16：BUG-204——把 `runtime/README.md` 的 `checks/lib/analyze/scene-pack.mjs`
// 改回 `checks/lib/scene-pack.mjs`（或给散文注入不存在路径）→ doc-paths 门禁红；本 spec
// 的枚举/排除用例同时钉住反引号、围栏与 URL 三类形态。还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prosePathTokens } from '../../../checks/lib/repo/doc-prose-paths.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

test('散文路径枚举：识别仓内带扩展名 token，剥反引号/围栏/URL（BUG-204）', () => {
  const text = [
    '读取判据 = checks/lib/analyze/scene-pack.mjs。',
    '内联代码 `checks/lib/inline.mjs` 不算散文。',
    '```',
    'checks/lib/fenced.mjs',
    '```',
    'URL https://example.com/checks/lib/url.mjs 不算仓内散文。',
    'docs/testing.md 经 vendor 前缀解析。',
    'tests/run/gates/final-version.spec.mjs 带括号）',
  ].join('\n')
  const tokens = prosePathTokens(text).map((entry) => entry.path)
  assert.deepEqual(tokens, [
    'checks/lib/analyze/scene-pack.mjs',
    'docs/testing.md',
    'tests/run/gates/final-version.spec.mjs',
  ])
  assert.deepEqual(prosePathTokens('无路径的一行'), [])
})

test('live 文档的散文路径可被枚举（BUG-204 负控）', () => {
  const discipline = readFileSync(join(ROOT, 'docs', 'reference', 'discipline-matrix.md'), 'utf8')
  const paths = prosePathTokens(discipline).map((entry) => entry.path)
  assert.ok(paths.includes('docs/testing.md'),
    'docs/reference/discipline-matrix.md 的 docs/testing.md 必须被散文枚举看到')
  assert.ok(paths.includes('tests/checks/shared/smoke-contract.test.mjs'),
    'docs/reference/discipline-matrix.md 的仓内散文路径必须被散文枚举看到')
})
