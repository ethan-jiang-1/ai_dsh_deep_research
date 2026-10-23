// provenance 回归 — local-file 哈希/孤儿/绝对路径；离线审计在无语料时以 provenance 为准。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { provenanceOf, sha256OfFile } from '../../scripts/lib/provenance.mjs'
import { auditBundle } from '../../scripts/lib/evidence-audit-core.mjs'

const makeRoot = () => {
  const base = realpathSync(tmpdir())
  const dir = mkdtempSync(join(base, 'dsh-prov-'))
  return { base, dir, cleanup: () => {
    if (dirname(dir) !== base || !basename(dir).startsWith('dsh-prov-')) throw new Error(`refusing cleanup: ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  } }
}
const writeEvidence = (bundle, id) => {
  mkdirSync(join(bundle, 'evidence'), { recursive: true })
  writeFileSync(join(bundle, 'evidence', `${id}.md`), `---
source_url: file:///tmp/local-source.txt
retrieved_at: 2026-10-23
quality: A
found_by: analyst
supports: T1
source_tier: primary
publisher: local
---
## 原文摘录

> 本地来源原文，足够长的一行。

## 解读

测试用。
`)
}
const writeProv = (bundle, id, rec) => {
  mkdirSync(join(bundle, 'provenance'), { recursive: true })
  writeFileSync(join(bundle, 'provenance', `${id}.json`), JSON.stringify(rec, null, 2) + '\n')
}

test('provenanceOf：local-file 哈希匹配 → 无 findings；篡改 → CRITICAL', () => {
  const { dir, cleanup } = makeRoot()
  try {
    const b = join(dir, 'drt_x')
    mkdirSync(join(b, 'data'), { recursive: true })
    writeFileSync(join(b, 'data', 'source.txt'), 'source')
    writeFileSync(join(b, 'run.md'), '- contract: 2026-10-23\n- phase: research\n- next: W1\n')
    writeFileSync(join(b, 'final.md'), '# Final\n')
    writeEvidence(b, 'x')
    const good = { kind: 'local-file', path: 'data/source.txt', sha256: sha256OfFile(join(b, 'data/source.txt')), retrieved_at: '2026-10-23', channel: 'file', slice: 'source' }
    writeProv(b, 'x', good)
    assert.deepEqual(provenanceOf(b).findings, [])
    writeProv(b, 'x', { ...good, sha256: '0'.repeat(64) })
    assert.ok(provenanceOf(b).findings.some((f) => f.level === 'CRITICAL' && f.kind.includes('哈希')))
  } finally { cleanup() }
})

test('provenanceOf：孤儿 / 绝对路径 / 非法 kind 各报 MAJOR', () => {
  const { dir, cleanup } = makeRoot()
  try {
    const b = join(dir, 'drt_x')
    mkdirSync(join(b, 'provenance'), { recursive: true })
    writeFileSync(join(b, 'run.md'), '- contract: 2026-10-23\n')
    writeProv(b, 'orphan', { kind: 'web', url: 'https://example.com', retrieved_at: '2026-10-23', channel: 'web' })
    writeProv(b, 'abs', { kind: 'local-file', path: '/tmp/x', sha256: 'x', retrieved_at: '2026-10-23', channel: 'file' })
    writeProv(b, 'bad', { kind: 'nope', retrieved_at: '2026-10-23', channel: 'x' })
    const kinds = provenanceOf(b).findings.map((f) => f.kind)
    assert.ok(kinds.some((k) => k.includes('孤儿')))
    assert.ok(kinds.some((k) => k.includes('绝对路径')))
    assert.ok(kinds.some((k) => k.includes('非法 kind')))
  } finally { cleanup() }
})

test('离线审计：valid local-file provenance + 空语料 → 无 CRITICAL，零命中为 INFO', () => {
  const { dir, cleanup } = makeRoot()
  try {
    const b = join(dir, 'drt_x')
    mkdirSync(join(b, 'data'), { recursive: true })
    writeFileSync(join(b, 'data', 'source.txt'), 'source')
    writeFileSync(join(b, 'run.md'), '- contract: 2026-10-23\n- phase: research\n- next: W1\n')
    writeFileSync(join(b, 'final.md'), '# Final\n')
    writeEvidence(b, 'x')
    writeProv(b, 'x', { kind: 'local-file', path: 'data/source.txt', sha256: sha256OfFile(join(b, 'data/source.txt')), retrieved_at: '2026-10-23', channel: 'file', slice: 'source' })
    mkdirSync(join(dir, 'sessions'))
    const { findings, criticalCount } = auditBundle(b, join(dir, 'sessions'))
    assert.equal(criticalCount, 0)
    assert.equal(findings.some((f) => f.kind.includes('伪造')), false)
    assert.ok(findings.some((f) => f.kind === '语料缺席，provenance 离线' && f.level === 'INFO'))
  } finally { cleanup() }
})
