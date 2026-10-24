// run-receipt 回归 — 交付回执（delivered/manifest/acceptance）的纯生成、present 选择与哈希校验。
// 回执是 ops 生成物：必须无绝对路径（否则自己踩 D28 卫生门）、manifest 不自我引用、接受旧 bundle
// 只写 acceptance 不补新契约文件。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import {
  READ_ORDER, buildDelivered, buildManifest, corpusRootLabel, pickPresented, receiptProblems,
  renderAcceptance, shouldWriteReceipts, sha256Of,
} from '../../scripts/lib/run-receipt.mjs'
import { hygieneOf } from '../../scripts/lib/schema-scan-core.mjs'

const makeRoot = () => {
  const base = realpathSync(tmpdir())
  const dir = mkdtempSync(join(base, 'dsh-receipt-'))
  return { base, dir, cleanup: () => {
    if (dirname(dir) !== base || !basename(dir).startsWith('dsh-receipt-')) throw new Error(`refusing cleanup: ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  } }
}

const writeBundle = (root, { legacy = false } = {}) => {
  const b = join(root, 'drt_x')
  mkdirSync(join(b, 'final'), { recursive: true })
  mkdirSync(join(b, 'evidence'), { recursive: true })
  if (!legacy) writeFileSync(join(b, 'run.md'), '# Run\n- contract: 2026-10-23\n- phase: accepted\n- next: none\n')
  writeFileSync(join(b, 'question.md'), '# Q\n')
  writeFileSync(join(b, 'final.md'), '# Final\n')
  writeFileSync(join(b, 'final', 'v1.md'), '# v1\n')
  writeFileSync(join(b, 'final', 'v2.md'), '# v2\n')
  writeFileSync(join(b, 'audit.md'), '# Audit — drt_x\n\nCRITICAL 0 / MAJOR 1\n')
  writeFileSync(join(b, 'evidence', 'e1.md'), '# E\n')
  return b
}

test('pickPresented：取最新版本化 present，不被先出现的旧版本抢走', () => {
  const events = [
    { path: 'drt_x/final/v1.md', version: 1, callId: 'p1', time: 100 },
    { path: 'drt_x/final.md', version: null, callId: 'p2', time: 200 },
    { path: 'drt_x/final/v2.md', version: 2, callId: 'p3', time: 300 },
  ]
  const p = pickPresented(events)
  assert.equal(p.path, 'drt_x/final/v2.md')
  assert.equal(p.version, 2)
  assert.equal(p.callId, 'p3')
  assert.equal(pickPresented([]), null)
})

test('corpusRootLabel：$DSH_HOME 下写可复算形式；自定义根不泄绝对路径', () => {
  assert.equal(corpusRootLabel('/h/sessions', { home: '/h' }), '$DSH_HOME/sessions')
  assert.equal(corpusRootLabel('/h/sessions/g1', { home: '/h' }), '$DSH_HOME/sessions/g1')
  const custom = corpusRootLabel('/somewhere/else/sessions', { home: '/h' })
  assert.equal(custom.startsWith('/'), false, `不得写裸绝对路径：${custom}`)
  assert.ok(custom.includes('sessions'))
  assert.equal(corpusRootLabel('/h/sessions', { home: null }), 'sessions')
})

test('receiptProblems：哈希匹配 → 无问题；篡改 final/audit → 各自报红；坏 JSON → 报红', () => {
  const { dir, cleanup } = makeRoot()
  try {
    const b = writeBundle(dir)
    const delivered = {
      version: 1,
      slug: 'drt_x',
      final: { version: 2, sha256: sha256Of(join(b, 'final', 'v2.md')) },
      audit: { critical: 0, sha256: sha256Of(join(b, 'audit.md')) },
    }
    writeFileSync(join(b, 'delivered.json'), JSON.stringify(delivered, null, 2))
    assert.deepEqual(receiptProblems(b).problems, [])

    writeFileSync(join(b, 'final', 'v2.md'), '# v2 改了\n')
    assert.ok(receiptProblems(b).problems.some((p) => /final|哈希/.test(p)))

    writeFileSync(join(b, 'final', 'v2.md'), '# v2\n')
    writeFileSync(join(b, 'audit.md'), '# Audit — drt_x\n\nCRITICAL 1 / MAJOR 0\n')
    assert.ok(receiptProblems(b).problems.some((p) => /audit|哈希/.test(p)))

    writeFileSync(join(b, 'delivered.json'), '{not json')
    assert.ok(receiptProblems(b).problems.some((p) => /不可解析|JSON/.test(p)))
  } finally { cleanup() }
})

test('buildDelivered/buildManifest/renderAcceptance：回执无绝对路径，manifest 不自我引用', () => {
  const { dir, cleanup } = makeRoot()
  try {
    const b = writeBundle(dir)
    const stamp = '2026-10-23T10:00:00.000Z'
    const delivered = buildDelivered({
      slug: 'drt_x', bundleDir: b, corpusRoot: '$DSH_HOME/sessions', acceptedAt: stamp,
      presented: [{ path: 'drt_x/final/v1.md', version: 1, callId: 'p1', time: 1 }, { path: 'drt_x/final/v2.md', version: 2, callId: 'p3', time: 3 }],
    })
    // 写盘序 = 真实 CLI 序：delivered 先落，manifest 才把它列进文件表。
    writeFileSync(join(b, 'delivered.json'), JSON.stringify(delivered, null, 2))
    const manifest = buildManifest({ slug: 'drt_x', bundleDir: b, contract: '2026-10-23', generatedAt: stamp })
    writeFileSync(join(b, 'manifest.json'), JSON.stringify(manifest, null, 2))
    writeFileSync(join(b, 'acceptance.md'), renderAcceptance({
      slug: 'drt_x', stamp, critical: 0, finalVersion: 2,
      present: { path: 'drt_x/final/v2.md' }, corpusRoot: '$DSH_HOME/sessions',
    }))

    assert.equal(delivered.final.version, 2)
    assert.equal(delivered.present.path, 'drt_x/final/v2.md', '回执记最新版本化 present，不记 v1')
    assert.equal(delivered.sessions, '$DSH_HOME/sessions')
    assert.equal(manifest.contract, '2026-10-23')
    assert.equal(manifest.readOrder[0], 'run.md')
    assert.equal(manifest.files.some((f) => f.path === 'manifest.json'), false)
    assert.equal(manifest.files.some((f) => f.path === 'acceptance.md'), false, 'acceptance 在 manifest 之后生成，不自我列入')
    assert.ok(manifest.files.some((f) => f.path === 'delivered.json' && f.role === 'delivery-receipt'))

    // 回执四件 + bundle 内容必须过 D28 卫生（生成物不得自带绝对路径）
    assert.deepEqual(hygieneOf(b).filter((c) => c.includes('绝对路径')), [])
    const raw = ['delivered.json', 'manifest.json', 'acceptance.md']
      .map((f) => readFileSync(join(b, f), 'utf8')).join('\n')
    assert.equal(raw.includes(dir), false, '回执不得写入临时根绝对路径')
  } finally { cleanup() }
})

test('shouldWriteReceipts：有 run.md 才写新契约回执；旧 bundle 只留 acceptance', () => {
  const a = makeRoot()
  const b = makeRoot()
  try {
    assert.equal(shouldWriteReceipts(writeBundle(a.dir)), true)
    assert.equal(shouldWriteReceipts(writeBundle(b.dir, { legacy: true })), false)
  } finally { a.cleanup(); b.cleanup() }
})

test('READ_ORDER 首项是 run.md（读序与手册逐字一致的单点）', () => {
  assert.equal(READ_ORDER[0], 'run.md')
  assert.ok(READ_ORDER.includes('journal.md（顶部 3–5 条）'))
})

test('deliveryGate 消费回执：哈希匹配不红；present 后改 final/vN → RED', async () => {
  const { deliveryGate } = await import('../../scripts/lib/node-gate-delivery-gate.mjs')
  const { dir, cleanup } = makeRoot()
  try {
    const b = writeBundle(dir)
    writeFileSync(join(b, 'review.md'), 'readiness: PASS\n')
    writeFileSync(join(b, 'audit.md'), [
      '# Evidence Audit — drt_x', '', '## 概要', '',
      '| 检查 | 结果 |', '|---|---|', '| 发现 | CRITICAL 0 · MAJOR 1 · INFO 0 |', '',
      '## CRITICAL', '', '（无）', '',
    ].join('\n'))
    const delivered = buildDelivered({
      slug: 'drt_x', bundleDir: b, corpusRoot: '$DSH_HOME/sessions', acceptedAt: '2026-10-23T10:00:00.000Z',
      presented: [{ path: 'drt_x/final/v2.md', version: 2, callId: 'p3', time: 3 }],
    })
    writeFileSync(join(b, 'delivered.json'), JSON.stringify(delivered, null, 2))
    assert.equal(deliveryGate(b).status, 'PASS')
    writeFileSync(join(b, 'final', 'v2.md'), '# 交付后被改\n')
    const red = deliveryGate(b)
    assert.equal(red.status, 'RED')
    assert.match(red.detail, /回执|哈希/)
  } finally { cleanup() }
})

test('reader 绑定：manifest 记 reader-final 角色，delivered 记 readable 哈希，篡改 → 红', () => {
  const { dir, cleanup } = makeRoot()
  try {
    const b = writeBundle(dir)
    writeFileSync(join(b, 'final', 'readable-v2.md'), '# Reader v2\n')
    const stamp = '2026-10-23T10:00:00.000Z'
    const delivered = buildDelivered({
      slug: 'drt_x', bundleDir: b, corpusRoot: '$DSH_HOME/sessions', acceptedAt: stamp,
      presented: [{ path: 'drt_x/final/v2.md', version: 2, callId: 'p3', time: 3 }],
    })
    assert.deepEqual(delivered.readable, {
      path: 'final/readable-v2.md',
      sha256: sha256Of(join(b, 'final', 'readable-v2.md')),
    })
    writeFileSync(join(b, 'delivered.json'), JSON.stringify(delivered, null, 2))
    const manifest = buildManifest({ slug: 'drt_x', bundleDir: b, contract: '2026-10-23', generatedAt: stamp })
    assert.ok(manifest.files.some((f) => f.path === 'final/readable-v2.md' && f.role === 'reader-final'))
    assert.deepEqual(receiptProblems(b).problems, [])

    writeFileSync(join(b, 'final', 'readable-v2.md'), '# Reader changed\n')
    assert.ok(receiptProblems(b).problems.some((p) => /readable-v2\.md.*哈希|读者版被改/.test(p)))
  } finally { cleanup() }
})
