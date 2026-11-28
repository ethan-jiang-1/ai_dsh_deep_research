// review-contract.spec.mjs — review 覆盖表与 severity 交叉（BUG-254 / 257）。
//
// 负例留证 2026-11-19：BUG-311——A/B 分档与盘上 quality 不符红。
// 负例留证 2026-11-18：BUG-254 / BUG-257 / BUG-288——删覆盖表 → 红；表里引用不存在/不匹配的 evidence → 红；— 格无 gap/n-a → 红；
// review 有 C1 且 readiness PASS → 红；加 `resolved-critical: C1` → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { coverageIssues, severityIssues } from '../../../checks/lib/gates/review-contract.mjs'

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'review-contract-'))
  mkdirSync(join(dir, 'evidence'), { recursive: true })
  writeFileSync(join(dir, 'topics.md'), '# Topics\n\n## T1: x\n\n- scope_role: primary\n- lenses: [official, academic]\n')
  writeFileSync(join(dir, 'evidence/ev-a.md'), '---\nsource_url: https://example.com/a\nretrieved_at: 2026-11-18\nquality: A\nfound_by: scout\nsupports: T1\nlens: official\nsource_tier: primary\npublisher: example.com\n---\n')
  writeFileSync(join(dir, 'review.md'), '# Review\n\n## 覆盖表（topic × lens）\n\n| topic | official | academic |\n|---|---|---|\n| T1 | 1 卡（A1/B0） evidence/ev-a.md | —（gap: 无社区源） |\n\n## readiness\n\nPASS\n')
  return dir
}

test('合法覆盖表：每 topic 行 + evidence 引用匹配 lens + — 有 gap 解释（BUG-254）', () => {
  const dir = fixture()
  try { assert.deepEqual(coverageIssues(dir), []) } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('缺表 / 假引用 / lens 不匹配 / 空—格无解释 → 红（BUG-254）', () => {
  const dir = fixture()
  try {
    writeFileSync(join(dir, 'review.md'), '# Review\n\n## readiness\n\nPASS\n')
    assert.ok(coverageIssues(dir).some((i) => i.includes('缺 topic × lens 覆盖表')))

    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 覆盖表（topic × lens）\n\n| topic | official | academic |\n|---|---|---|\n| T1 | evidence/missing.md | —（gap: x） |\n')
    assert.ok(coverageIssues(dir).some((i) => i.includes('不存在')))

    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 覆盖表（topic × lens）\n\n| topic | official | academic |\n|---|---|---|\n| T1 | evidence/ev-a.md | — |\n')
    assert.ok(coverageIssues(dir).some((i) => i.includes('没有 gap/n-a')))

    writeFileSync(join(dir, 'evidence/ev-a.md'), '---\nsource_url: https://example.com/a\nretrieved_at: 2026-11-18\nquality: A\nfound_by: scout\nsupports: T1\nlens: academic\nsource_tier: primary\npublisher: example.com\n---\n')
    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 覆盖表（topic × lens）\n\n| topic | official | academic |\n|---|---|---|\n| T1 | evidence/ev-a.md | —（gap: x） |\n')
    assert.ok(coverageIssues(dir).some((i) => i.includes('与该列')))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('readiness PASS 且有未解释 C1 → 红；resolved-critical 或 readiness FAIL 放行（BUG-257）', () => {
  const dir = fixture()
  try {
    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 2. CRITICAL\n\n- **C1（x）** — 说明\n\n## readiness\n\nPASS\n')
    const red = severityIssues(dir, { readinessPass: true })
    assert.equal(red.length, 1)
    assert.match(red[0], /C1/)
    assert.deepEqual(severityIssues(dir, { readinessPass: false }), [], 'readiness 非 PASS 时不交叉（本来就未交付）')
    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 2. CRITICAL\n\n- **C1（x）** — 说明\n\nresolved-critical: C1\n\n## readiness\n\nPASS\n')
    assert.deepEqual(severityIssues(dir, { readinessPass: true }), [])
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('BUG-288：格内声明卡数与盘上 evidence 数不一致 → 红；无计数/引用 → 红', () => {
  const dir = fixture()
  try {
    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 覆盖表（topic × lens）\n\n| topic | official | academic |\n|---|---|---|\n| T1 | 2 卡（A2/B0） evidence/ev-a.md | —（gap: x） |\n')
    assert.ok(coverageIssues(dir).some((i) => i.includes('声明 2 卡') && i.includes('实际 1 卡')))
    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 覆盖表（topic × lens）\n\n| topic | official | academic |\n|---|---|---|\n| T1 | 有卡 | —（gap: x） |\n')
    assert.ok(coverageIssues(dir).some((i) => i.includes('既无「N 卡」计数也无 evidence 引用')))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('BUG-311：格内 A/B 分档与盘上 quality 不符 → 红', () => {
  const dir = fixture()
  try {
    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 覆盖表（topic × lens）\n\n| topic | official | academic |\n|---|---|---|\n| T1 | 1 卡（A0/B1） evidence/ev-a.md | —（gap: x） |\n')
    assert.ok(coverageIssues(dir).some((i) => i.includes('声明 A0/B1') && i.includes('实际 A1/B0')))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

// 负例留证 2026-11-28：BUG-464——覆盖表首列带标题文本 `| T1 产品与变化 |`、MAJOR 节内 `- C4`、历史轮
// CRITICAL 及 `**resolved-critical: all（...）**` 在旧解析下全部误红。
// 红配方：把 cells[0] 匹配退回 `=== id`、severityIssues 退回全文扫 `- C#`、或去掉加粗/括注剥离 → 对应断言红。
test('BUG-464：覆盖表首列带标题 + 多轮终局块作用域 + MAJOR 下 C# 不误判 + 加粗/括注 resolved-critical', () => {
  const dir = fixture()
  try {
    writeFileSync(join(dir, 'review.md'), [
      '# Review — demo',
      '',
      '# 第 2 轮终局块（复审 round 2 · 当前生效）',
      '',
      '## CRITICAL',
      '',
      '**第 2 轮新开：0 条。** `resolved-critical: all`（第 1 轮 C1 已闭合）。',
      '',
      '## MAJOR',
      '',
      '- **N1**：claims.json 差异：',
      '  - C4 文本未同步',
      '  - C8 文本未同步',
      '',
      '## 覆盖表（topic × lens，第 2 轮）',
      '',
      '| topic | official | academic |',
      '|---|---|---|',
      '| **T1 产品与变化** | 1 卡（A1/B0） evidence/ev-a.md | — n/a：非本 topic lens |',
      '',
      '## readiness（终局）: PASS',
      '',
      '**resolved-critical: all（第 1 轮 C1；本轮无新开 CRITICAL）**',
      '',
      '# 第 1 轮终局块（历史，原样保留；当前不生效）',
      '',
      '### CRITICAL',
      '',
      '- **C1（已闭合）** 历史问题',
      '',
      '### 覆盖表（topic × lens）',
      '',
      '| topic | official | academic |',
      '|---|---|---|',
      '| T1 | 99 卡 | — |',
      '',
    ].join('\n'))
    assert.deepEqual(coverageIssues(dir), [], '首列带标题应命中 T1，且应读第 2 轮终局覆盖表而非历史轮')
    assert.deepEqual(severityIssues(dir, { readinessPass: true }), [], 'MAJOR 下的 - C4 与历史轮 C1 不得误红')

    // 邻接变体：当前终局块 CRITICAL 节有 - C1，靠 **resolved-critical: all（说明）** 合法豁免
    writeFileSync(join(dir, 'review.md'), [
      '# Review',
      '',
      '## CRITICAL',
      '',
      '- **C1（已闭合）** 说明',
      '',
      '**resolved-critical: all（第 1 轮闭合）**',
      '',
      '## readiness: PASS',
    ].join('\n'))
    assert.deepEqual(severityIssues(dir, { readinessPass: true }), [], '加粗+括注 resolved-critical: all 必须生效')

    // 负控：当前终局块 CRITICAL 节有未解释的 - C1 且 readiness=PASS → 仍稳定判 RED
    writeFileSync(join(dir, 'review.md'), [
      '# Review',
      '',
      '# 第 2 轮终局块',
      '',
      '## CRITICAL',
      '',
      '- **C1** 未解决的高危缺陷',
      '',
      '## readiness（终局）: PASS',
      '',
      '# 第 1 轮终局块（历史）',
      '',
      'resolved-critical: all',
    ].join('\n'))
    const red = severityIssues(dir, { readinessPass: true })
    assert.equal(red.length, 1, '第 2 轮未解释 C1 不得被历史轮 resolved-critical: all 放行')
    assert.match(red[0], /C1/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

// 负例留证 2026-11-28：BUG-487——跨 topic 对账卡（supports: T1, T2）被 review-contract 强行复计进
// T1/T2 每行，与 critic 表下注脚单列记法冲突；未写注脚静默漏卡仍须红。
// 红配方：去掉 coverageIssues 对已注脚声明跨行卡的 exclusiveCounts 校验分支 → 正例红。
test('BUG-487：跨 topic 对账卡表下注脚显式说明「跨行/不落格」时按单行卡数通过；静默漏卡无注脚仍判 RED', () => {
  const dir = fixture()
  try {
    writeFileSync(
      join(dir, 'topics.md'),
      '# Topics\n\n## T1: a\n\n- scope_role: primary\n- lenses: [official]\n\n## T2: b\n\n- scope_role: primary\n- lenses: [official]\n',
    )
    writeFileSync(
      join(dir, 'evidence/ev-b.md'),
      '---\nsource_url: https://example.com/b\nretrieved_at: 2026-11-28\nquality: A\nfound_by: analyst\nsupports: T2\nlens: official\nsource_tier: primary\npublisher: example.com\n---\n',
    )
    writeFileSync(
      join(dir, 'evidence/xcheck-01.md'),
      '---\nsource_url: https://example.com/x\nretrieved_at: 2026-11-28\nquality: B\nfound_by: analyst\nsupports: T1, T2\nlens: official\nsource_tier: primary\npublisher: example.com\n---\n',
    )
    // 正例1：注脚显式说明 xcheck-01 跨行不落格，表内只计单 topic 卡 → PASS
    writeFileSync(join(dir, 'review.md'), [
      '# Review',
      '',
      '## 覆盖表（topic × lens）',
      '',
      '| topic | official |',
      '|---|---|',
      '| T1 | 1 卡（A1/B0） evidence/ev-a.md |',
      '| T2 | 1 卡（A1/B0） evidence/ev-b.md |',
      '',
      '- **脚注**：`xcheck-01`（lens=official，supports T1–T2，quality B）跨行不落格。',
    ].join('\n'))
    assert.deepEqual(coverageIssues(dir), [], '跨行卡已在脚注显式说明不落格时不得误红')

    // 正例2：把 xcheck-01 复计进两行 → 同样 PASS
    writeFileSync(join(dir, 'review.md'), [
      '# Review',
      '',
      '## 覆盖表（topic × lens）',
      '',
      '| topic | official |',
      '|---|---|',
      '| T1 | 2 卡（A1/B1） evidence/ev-a.md |',
      '| T2 | 2 卡（A1/B1） evidence/ev-b.md |',
    ].join('\n'))
    assert.deepEqual(coverageIssues(dir), [], '跨行卡复计进各行同样合法')

    // 负控：未在脚注提及 xcheck-01 却少算 1 卡 → 仍必须 RED
    writeFileSync(join(dir, 'review.md'), [
      '# Review',
      '',
      '## 覆盖表（topic × lens）',
      '',
      '| topic | official |',
      '|---|---|',
      '| T1 | 1 卡（A1/B0） evidence/ev-a.md |',
      '| T2 | 1 卡（A1/B0） evidence/ev-b.md |',
    ].join('\n'))
    assert.ok(coverageIssues(dir).some((i) => i.includes('声明 1 卡') && i.includes('实际 2 卡')), '静默漏掉跨行卡无脚注必须仍判 RED')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
