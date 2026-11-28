// node-gate-reader 回归 — 门C（读者版合同）的判据与反证（keyless）。
// 反证口径：缺 reader / 错版本 / 缺节 / 超长 / 来源路径都必红；quick_factual、旧场、
// 未到交付段显式 N/A；pre-contract 不追溯；数字子集只 WARN 不红。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { READER_CHAR_CAP, readerGate } from '../../../checks/lib/gates/node-gate-reader-gate.mjs'

const makeBundle = (t, { contract = '2026-10-23', type = 'exploratory_map', versions = [1] } = {}) => {
  const base = realpathSync(tmpdir())
  const dir = mkdtempSync(join(base, 'node-gate-reader-'))
  t.after(() => {
    if (dirname(dir) !== base || !basename(dir).startsWith('node-gate-reader-')) throw new Error(`refusing cleanup: ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  })
  mkdirSync(join(dir, 'final'), { recursive: true })
  writeFileSync(join(dir, 'run.md'), `# Run\n- contract: ${contract}\n- phase: delivery\n- next: none\n`)
  writeFileSync(join(dir, 'question.md'), `# Q\n- 研究类型: ${type}\n- contract: ${contract}\n`)
  writeFileSync(join(dir, 'final.md'), '# Final current\n')
  for (const v of versions) {
    writeFileSync(join(dir, 'final', `v${v}.md`), `# Canonical v${v}\n\n8 分；4 个月；2026-10-22。\n`)
  }
  return dir
}

const validReader = (version = 1, extra = '') => `# 读者版 — 测试

> 读者版 · 对应 canonical: final/v${version}.md · 以 canonical 为准。

## 结论

8 分，4 个月。

## 为什么

同一把尺子。

## 这对你意味着什么

按场景选。

## 什么会改变这个结论

阈值变化。

## 目前不能判断

有些项取不到。

## 依据与延伸

见 canonical。
${extra}`

const writeReader = (dir, text, version = 1) => writeFileSync(join(dir, 'final', `readable-v${version}.md`), text)

test('门C 合规：同版 + 六节 + canonical 指针 + 长度内 → PASS', (t) => {
  const dir = makeBundle(t)
  writeReader(dir, validReader(1))
  const r = readerGate(dir)
  assert.equal(r.status, 'PASS', r.detail)
  assert.match(r.detail, /readable-v1\.md/)
})

test('门C 反证：缺同版 reader → RED（并点名修正路径）', (t) => {
  const dir = makeBundle(t)
  const r = readerGate(dir)
  assert.equal(r.status, 'RED')
  assert.match(r.detail, /readable-v1\.md 缺席/)
})

test('门C 反证：reader 指向旧版本 / 最新 vN 无同版 → RED', (t) => {
  const dir = makeBundle(t, { versions: [1, 2] })
  writeReader(dir, validReader(1), 1)
  const r = readerGate(dir)
  assert.equal(r.status, 'RED')
  assert.match(r.detail, /readable-v2\.md 缺席/)
})

test('门C 反证：canonical 版本与最高 vN 不符 → RED', (t) => {
  const dir = makeBundle(t)
  writeReader(dir, validReader(2))
  const r = readerGate(dir)
  assert.equal(r.status, 'RED')
  assert.match(r.detail, /对应 canonical: final\/v1\.md/)
})

test('门C 反证：缺任一固定节 → RED', (t) => {
  const dir = makeBundle(t)
  writeReader(dir, validReader(1).replace('## 目前不能判断\n\n有些项取不到。\n', ''))
  const r = readerGate(dir)
  assert.equal(r.status, 'RED')
  assert.match(r.detail, /缺节「## 目前不能判断」/)
})

test('门C 反证：超长（字符 / 行）→ RED', (t) => {
  const dir = makeBundle(t)
  writeReader(dir, validReader(1, `\n${'长'.repeat(READER_CHAR_CAP + 10)}\n`))
  const r = readerGate(dir)
  assert.equal(r.status, 'RED')
  assert.match(r.detail, /超长/)
})

test('门C 反证：行内 [来源:] / evidence/ / drt_ 路径 → RED', (t) => {
  for (const [label, extra] of [
    ['[来源:]', '\n[来源: evidence/e1.md]\n'],
    ['evidence/', '\n见 evidence/e1.md\n'],
    ['drt_', '\n见 drt_x/final.md\n'],
  ]) {
    const dir = makeBundle(t)
    writeReader(dir, validReader(1, extra))
    const r = readerGate(dir)
    assert.equal(r.status, 'RED', label)
    assert.match(r.detail, new RegExp(label === '[来源:]' ? '含行内 \\[来源:\\]' : label === 'evidence/' ? '含 evidence/ 路径' : '含 drt_ bundle 路径'), label)
  }
})

test('门C：quick_factual / 旧场 / 未到交付段 → N/A（显式，不静默）', (t) => {
  const quick = makeBundle(t, { type: 'quick_factual' })
  assert.equal(readerGate(quick).status, 'N/A')
  assert.match(readerGate(quick).detail, /quick_factual/)

  const old = makeBundle(t)
  rmSync(join(old, 'run.md'))
  assert.equal(readerGate(old).status, 'N/A')
  assert.match(readerGate(old).detail, /旧契约/)

  const early = makeBundle(t, { versions: [] })
  assert.equal(readerGate(early).status, 'N/A')
  assert.match(readerGate(early).detail, /final\/vN 不在场/)
})

test('门C：契约日前的交付 → PRE-CONTRACT（如实报告不计红）', (t) => {
  const dir = makeBundle(t, { contract: '2026-10-22' })
  const r = readerGate(dir)
  assert.equal(r.status, 'PRE-CONTRACT')
  assert.match(r.detail, /契约日 2026-10-23/)
})

test('门C：数字子集只 WARN，不把等价写法判红', (t) => {
  const dir = makeBundle(t)
  writeReader(dir, validReader(1, '\n99 分是读者版新写的数字。\n'))
  const r = readerGate(dir)
  assert.equal(r.status, 'PASS', r.detail)
  assert.match(r.detail, /⚠ 读者版含 canonical 未出现的数字：99/)
})

test('门C 反证：reader 的相对链接按 final/ 解析；错写成 final.md / final/v1.md → RED', (t) => {
  const dir = makeBundle(t)
  writeReader(dir, validReader(1, '\n## 依据与延伸\n\n[v1](v1.md) [final](../final.md)\n'))
  assert.equal(readerGate(dir).status, 'PASS', readerGate(dir).detail)

  writeReader(dir, validReader(1, '\n## 依据与延伸\n\n[final](final.md) [wrong](final/v1.md)\n'))
  const r = readerGate(dir)
  assert.equal(r.status, 'RED')
  assert.match(r.detail, /链接不可解析/)
})

// 负例留证 2026-11-28：BUG-468——reader-final 位于 critic PASS 之后且门C 不核查 review.md 已闭合
// CRITICAL 的驳回表述/限定突破词，导致已被驳回的「唯一…」全称断言在读者版首句死灰复燃。
// 红配方：删去 readerGate 的 CRITICAL 驳回词/原句回查 → 前两例复发用例变 PASS。
test('BUG-468 门C：读者版复现 review.md CRITICAL 已驳回且 canonical 已删去的全称断言/原句 → RED；收口合规或否定语境 → PASS', (t) => {
  const dir = makeBundle(t)
  writeFileSync(join(dir, 'final', 'v1.md'), [
    '# Canonical v1',
    '',
    '## 决策摘要',
    '',
    '一句话：昇腾是国产阵营里出货规模最大的一家（28% 份额）。',
  ].join('\n'))
  writeFileSync(join(dir, 'review.md'), [
    '# 第 2 轮终局块',
    '',
    '## readiness（终局）: PASS',
    '',
    '# 第 1 轮终局块（历史）',
    '',
    '### CRITICAL',
    '',
    '- **C1（已闭合）** 首屏原为无来源链全称断言「昇腾是唯一能规模交付的全国产 AI 算力选项」，现已改写为出货规模最大。',
  ].join('\n'))

  // 报告例：读者版在 ## 结论 重新塞入被 C1 驳回的「唯一」全称断言 → RED
  const relapsed = validReader(1).replace(
    '8 分，4 个月。',
    '昇腾是国产阵营里唯一已经形成规模交付的 AI 算力体系。',
  )
  writeReader(dir, relapsed)
  const redQualifier = readerGate(dir)
  assert.equal(redQualifier.status, 'RED', `复现被驳回的「唯一」全称断言必须判 RED：${redQualifier.detail}`)
  assert.match(redQualifier.detail, /唯一/)

  // 邻接变体：读者版逐字复现 CRITICAL 驳回原句 → RED
  const verbatimRelapse = validReader(1).replace(
    '同一把尺子。',
    '昇腾是唯一能规模交付的全国产 AI 算力选项。',
  )
  writeReader(dir, verbatimRelapse)
  const redVerbatim = readerGate(dir)
  assert.equal(redVerbatim.status, 'RED', `逐字复现 CRITICAL 驳回原句必须判 RED：${redVerbatim.detail}`)
  assert.match(redVerbatim.detail, /CRITICAL/)

  // 负控1：读者版与 canonical 同步收口（不含被驳回词）→ PASS
  const aligned = validReader(1).replace(
    '8 分，4 个月。',
    '昇腾是国产阵营里出货规模最大的一家（28% 份额）。',
  )
  writeReader(dir, aligned)
  const passAligned = readerGate(dir)
  assert.equal(passAligned.status, 'PASS', `收口一致的读者版应 PASS：${passAligned.detail}`)

  // 负控2：否定语境「并非唯一」不误判为全称断言复发 → PASS
  const negated = validReader(1).replace(
    '8 分，4 个月。',
    '昇腾是出货规模最大的一家，但并非唯一选择。',
  )
  writeReader(dir, negated)
  const passNegated = readerGate(dir)
  assert.equal(passNegated.status, 'PASS', `显式否定语境「并非唯一」不得误红：${passNegated.detail}`)
})
