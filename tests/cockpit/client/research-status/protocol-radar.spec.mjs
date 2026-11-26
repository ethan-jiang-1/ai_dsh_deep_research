// protocol-radar.spec.mjs — 状态契约卡（ProtocolCard）与证据质量雷达（QualityRadar）静态渲染回归。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../css-module-helpers.mjs'
import { ProtocolCard } from '../../../../packages/deep-research-pack/src/client/research-status/ProtocolCard.tsx'
import { QualityRadar } from '../../../../packages/deep-research-pack/src/client/research-status/QualityRadar.tsx'
import { zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'

const tZh = (key, params = {}) => String(zh[key]).replace(/\{([A-Za-z0-9_]+)\}/g, (all, name) => (name in params ? String(params[name]) : all))

test('研究状态契约卡与质量雷达：展示 protocol 契约与 Topic×Lens 矩阵，坏契约显性降级', () => {
  const invalidProtocol = renderToStaticMarkup(createElement(ProtocolCard, {
    protocol: { state: 'invalid', contract: null },
    hitlPending: true,
    onRetry: () => {},
    t: tZh,
  }))
  assert.match(invalidProtocol, /protocol\.json 读取失败或不合法/)

  const okProtocol = renderToStaticMarkup(createElement(ProtocolCard, {
    protocol: {
      state: 'ok',
      contract: {
        schema: 1,
        version: 1,
        status: 'approved',
        created: null,
        approvedAt: null,
        method: { id: '领域地图', kind: 'preset', libraryName: null, adjustments: [] },
        sourceScope: { families: ['official'], recency: '12m', authority: 'primary', language: ['zh'] },
        effort: { band: 'deep', nodesMax: 12, cellsMax: 8, wavesMax: 6 },
        output: null,
        gates: { hitl1: 'protocol_projection', hitl2: 'review', evidenceThreshold: 'B', critic: 'both', claimVerification: 'on' },
        deviations: [],
      },
    },
    hitlPending: false,
    onRetry: () => {},
    t: tZh,
  }))
  assert.match(okProtocol, /领域地图/)
  assert.match(okProtocol, /approved/)

  const radarHtml = renderToStaticMarkup(createElement(QualityRadar, {
    matrix: {
      state: 'ok',
      topicsState: 'ok',
      evidenceState: 'ok',
      topics: [{ id: 'T1', title: '格局', scopeRole: 'primary', lenses: ['arch'] }],
      lenses: ['arch'],
      cells: { T1: { arch: 2 } },
      validCards: 2,
      invalidCards: 0,
      emptyCards: 0,
      unreadableCards: 0,
      byTier: { primary: 2, secondary: 0, tertiary: 0, weak: 0, unknown: 0 },
      byQuality: { A: 2, B: 0, C: 0, D: 0, unknown: 0 },
      uniquePublishers: 2,
    },
    onRetry: () => {},
    t: tZh,
  }))
  assert.match(radarHtml, /2 个独立域名/)
  assert.match(radarHtml, /T1/)
})
