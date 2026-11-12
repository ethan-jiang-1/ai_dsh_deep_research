// 负例留证 2026-11-12：BUG-100（同名目录被当 final 版本文件）
// run source picker：清单读失败 ≠ 无 final；回执/版本只认 file（BUG-099/109/100 消费面）。
// 负例留证 2026-11-12：BUG-099——`finalFiles ?? []` 把 null 当空；BUG-109——delivered.json 只查 name。
// 还原法 = 删除 null 分支 / 回执判定去掉 type==='file'。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { latestFinalVersion } from '../../packages/deep-research-pack/src/lib/method-library-source.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

test('BUG-100/109 latestFinalVersion：同名目录不算版本文件', () => {
  assert.equal(latestFinalVersion([{ name: 'v2.md', type: 'directory' }, { name: 'v1.md', type: 'file' }]), 'v1.md')
  assert.equal(latestFinalVersion([{ name: 'v2.md', type: 'file' }]), 'v2.md')
})

test('BUG-099/109 接线：清单 null 走读取失败；回执/验收只认普通文件', () => {
  const source = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/method-library/useRunSourcePicker.ts'), 'utf8')
  assert.match(source, /finalFiles === null \|\| runFiles === null/, '清单 null 必须走读取失败')
  assert.match(source, /file\.type === 'file' && file\.name === 'delivered\.json'/, 'delivered.json 必须校验 file')
  assert.match(source, /file\.type === 'file' && file\.name === 'acceptance\.md'/, 'acceptance.md 必须校验 file')
})
