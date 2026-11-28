// radar-interactive.spec.mjs — 质量雷达点击下钻证据卡微列表与缺口格 Tooltip 交互回归。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { loadRtl, makeTranslator } from '../../client-dom-helpers.mjs'
import { zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { foldEvidenceMatrix } from '../../../../packages/deep-research-pack/src/lib/run/evidence-matrix.ts'
import { QualityRadar } from '../../../../packages/deep-research-pack/src/client/research-status/QualityRadar.tsx'

const t = makeTranslator(zh)

test('foldEvidenceMatrix 保留 cellCards，QualityRadar 点击命中格展开证据卡列表并回调 onOpenEvidence', async () => {
  const matrix = foldEvidenceMatrix({
    topicsState: 'ok',
    topicsText: '## T1: 核心技术格局\n- scope_role: primary\n- lenses: [official, adversarial]\n',
    evidenceState: 'ok',
    cards: [
      {
        name: 'official-spec.md',
        state: 'ok',
        text: [
          '---',
          'source_url: https://docs.example.com/spec',
          'retrieved_at: 2026-11-28',
          'quality: A',
          'found_by: scout-1',
          'supports: [T1]',
          'lens: official',
          'source_tier: primary',
          'publisher: example-docs',
          '---',
          '# 官方技术规格说明',
          '',
          '正文摘录。',
        ].join('\n'),
      },
    ],
  })

  assert.equal(matrix.cells.T1.official, 1)
  assert.equal(matrix.cellCards?.T1?.official?.length, 1)
  assert.equal(matrix.cellCards?.T1?.official?.[0]?.file, 'official-spec.md')

  const rtl = await loadRtl()
  const opened = []
  try {
    const { container } = rtl.render(createElement(QualityRadar, {
      matrix,
      onRetry: () => {},
      onOpenEvidence: (file) => { opened.push(file) },
      t,
    }))
    assert.equal(container.querySelector('[data-testid="radar-cell-drawer"]'), null, '未点击前不展开微列表')
    const hitBtn = container.querySelector('[data-radar-cell="T1:official"]')
    assert.ok(hitBtn, '命中格必须渲染可点击按钮')
    assert.ok(container.querySelector('[data-radar-gap="T1:adversarial"]'), '缺口格必须保留盲区触发器')

    rtl.fireEvent.click(hitBtn)
    const drawer = container.querySelector('[data-testid="radar-cell-drawer"]')
    assert.ok(drawer, '点击命中格后展开证据微列表')
    assert.match(drawer.textContent ?? '', /官方技术规格说明/)
    assert.match(drawer.textContent ?? '', /example-docs/)

    const item = drawer.querySelector('[data-radar-evidence-file="official-spec.md"]')
    assert.ok(item)
    rtl.fireEvent.click(item)
    assert.deepEqual(opened, ['official-spec.md'], '点击证据微列表项应直接打开对应证据卡')

    // 再次点击同一格收起抽屉
    rtl.fireEvent.click(hitBtn)
    assert.equal(container.querySelector('[data-testid="radar-cell-drawer"]'), null)
  } finally {
    rtl.cleanup()
  }
})
