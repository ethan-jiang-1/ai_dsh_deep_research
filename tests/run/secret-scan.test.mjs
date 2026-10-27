// secret-scan 纯函数回归 — 交付物里的高置信凭据形态（不拿泛化 token= 误伤安全题材）。
// 负例留证 2026-10-27：删掉 PATTERNS 里的 private-key / aws-access-key 分支 → 对应正例红；
//   把报告结构改成回显命中原文 → 「不回显秘密」测红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findSecrets, scanSecrets } from '../../scripts/lib/secret-scan.mjs'

test('findSecrets：sk-/ghp_/AKIA/PRIVATE KEY/Bearer 命中，prose 与短串不命中', () => {
  const text = [
    '普通文本：token 只是词，不是值。',
    'key = ' + 'sk-' + 'abcdefghijklmnopqrstuvwx123456',
    'github ' + 'ghp_' + 'abcdefghijklmnopqrstuvwxyz0123456789',
    'AWS ' + 'AKIA' + 'IOSFODNN7EXAMPLE',
    '-----BEGIN ' + 'OPENSSH PRIVATE KEY-----',
    'Authorization: Bearer ' + 'eyJhbGciOiJIUzI1NiJ9' + '.payload.sig',
    '短串 sk-short 不算',
  ].join('\n')
  const found = findSecrets(text)
  assert.deepEqual(found.map((f) => f.kind).sort(), ['aws-access-key', 'bearer-token', 'github-token', 'private-key', 'provider-key'].sort())
  assert.deepEqual(found.map((f) => f.line), [2, 3, 4, 5, 6])
})

test('findSecrets：报告只有 kind/line，不回显命中原文', () => {
  const found = findSecrets('x ' + 'sk-' + 'abcdefghijklmnopqrstuvwx123456' + ' y')
  assert.equal(found.length, 1)
  assert.deepEqual(Object.keys(found[0]).sort(), ['kind', 'line'])
  assert.equal(JSON.stringify(found).includes('abcdefghijklmnopqrstuvwx'), false)
})

test('scanSecrets：逐文件汇总，干净文件零 finding', () => {
  const found = scanSecrets([
    { path: 'final/v1.md', text: 'see [来源: evidence/a.md]\n' },
    { path: 'audit.md', text: 'AKIA' + 'IOSFODNN7EXAMPLE\n' },
  ])
  assert.equal(found.length, 1)
  assert.equal(found[0].path, 'audit.md')
  assert.equal(found[0].kind, 'aws-access-key')
})
