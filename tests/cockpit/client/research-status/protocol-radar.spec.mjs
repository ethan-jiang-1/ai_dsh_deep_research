// protocol-radar.spec.mjs — 状态契约卡（ProtocolCard）与证据质量雷达（QualityRadar）静态渲染回归。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../css-module-helpers.mjs'
import { ProtocolCard } from '../../../../packages/deep-research-pack/src/client/research-status/ProtocolCard.tsx'
import { QualityRadar } from '../../../../packages/deep-research-pack/src/client/research-status/QualityRadar.tsx'
import { TrackRail } from '../../../../packages/deep-research-pack/src/client/research-status/TrackRail.tsx'
import { deriveSteps } from '../../../../packages/deep-research-pack/src/lib/run/run-fold.ts'
import { en, zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'

const tZh = (key, params = {}) => String(zh[key]).replace(/\{([A-Za-z0-9_]+)\}/g, (all, name) => (name in params ? String(params[name]) : all))
const tEn = (key, params = {}) => String(en[key]).replace(/\{([A-Za-z0-9_]+)\}/g, (all, name) => (name in params ? String(params[name]) : all))

test('研究状态契约卡与质量雷达：展示 protocol 契约与 Topic×Lens 矩阵，坏契约显性降级', () => {
  const invalidProtocol = renderToStaticMarkup(createElement(ProtocolCard, {
    protocol: { state: 'invalid', contract: null },
    hitlPending: true,
    onRetry: () => {},
    t: tZh,
  }))
  assert.match(invalidProtocol, /protocol\.json 格式或字段不合法/)

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

// 负例留证 2026-11-27：BUG-443——TrackRail 改用 SVG StateDot 后，unknown 步骤带 data-step-key/data-step-state
// 且「?」在步骤名之后；cockpit-truth-substance 旧前缀正则 /\?\s*综合/ 误红。红配方：去掉 data-step-state → 红。
test('BUG-443 TrackRail：unknown 步骤暴露 data-step-key/data-step-state="unknown" 与后缀问号', () => {
  const steps = deriveSteps({
    question: 'present', team: 'present', leads: 'unknown', evidence: 'unknown', findings: 'unknown', review: 'present', final: 'present',
  }, tZh)
  const html = renderToStaticMarkup(createElement(TrackRail, {
    anchors: [
      { key: 'anchor-1', label: '立项确认', state: 'passed', questions: 0 },
      { key: 'anchor-2', label: '交付审阅', state: 'passed', questions: 0 },
    ],
    steps,
    faceVersions: 1,
    hitlPending: false,
    t: tZh,
  }))
  assert.match(html, /data-step-key="findings"[^>]*data-step-state="unknown"/)
  assert.match(html, /data-step-key="leads"[^>]*data-step-state="unknown"/)
  assert.match(html, /data-step-key="evidence"[^>]*data-step-state="unknown"/)
  assert.match(html, /综合 \?/)
  assert.match(html, /侦察 \?/)
  assert.match(html, /挖掘 \?/)
})

// 负例留证 2026-11-27：BUG-444——ProtocolCard 将 empty/unreadable/invalid 全折叠为同一读错文案。
// 红配方：把 ProtocolCard 的 empty/unreadable/invalid 分支合回 statusProtocolUnreadable → 本例红。
test('BUG-444 ProtocolCard：empty / unreadable / invalid 三态渲染各自独立标签与提示', () => {
  const stripHtml = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const renderState = (state, t) => stripHtml(renderToStaticMarkup(createElement(ProtocolCard, {
    protocol: { state, contract: null },
    hitlPending: true,
    onRetry: () => {},
    t,
  })))
  for (const t of [tZh, tEn]) {
    const emptyText = renderState('empty', t)
    const unreadableText = renderState('unreadable', t)
    const invalidText = renderState('invalid', t)
    assert.notEqual(emptyText, unreadableText, 'empty 与 unreadable 可见文案必须区分')
    assert.notEqual(emptyText, invalidText, 'empty 与 invalid 可见文案必须区分')
    assert.notEqual(unreadableText, invalidText, 'unreadable 与 invalid 可见文案必须区分')
  }
})

// 负例留证 2026-11-27：BUG-449——英文模式下 QualityRadar 仅有 1 个独立域名时固定打印 `1 domains`。
// 红配方：把 QualityRadar 改回直读 statusRadarPublishers → 下方 `1 domain` 断言红。
test('BUG-449 QualityRadar：英文模式 1 个独立域名使用单数 "1 domain"，0/2 使用复数', () => {
  const renderCount = (uniquePublishers, t) => renderToStaticMarkup(createElement(QualityRadar, {
    matrix: {
      state: 'ok',
      topicsState: 'ok',
      evidenceState: 'ok',
      topics: [{ id: 'T1', title: 'Topic', scopeRole: 'primary', lenses: ['official'] }],
      lenses: ['official'],
      cells: { T1: { official: 1 } },
      validCards: 1,
      invalidCards: 0,
      emptyCards: 0,
      unreadableCards: 0,
      byTier: { primary: 1, secondary: 0, tertiary: 0, weak: 0, unknown: 0 },
      byQuality: { A: 1, B: 0, C: 0, D: 0, unknown: 0 },
      uniquePublishers,
    },
    onRetry: () => {},
    t,
  }))
  const enOne = renderCount(1, tEn)
  assert.match(enOne, /\b1 domain\b/)
  assert.doesNotMatch(enOne, /\b1 domains\b/)
  assert.match(renderCount(0, tEn), /\b0 domains\b/)
  assert.match(renderCount(2, tEn), /\b2 domains\b/)
  assert.match(renderCount(1, tZh), /1 个独立域名/)
})

// 负例留证 2026-11-27：BUG-457——TrackRail 在 loopOn 时将箭头 ▲ 绝对定位在容器左侧 3px，
// 与重入步进「挖掘」脱节并在窄屏指向「立项确认 / 审查」。红配方：保留 ▲ 或删掉 evidence 上的 ↺ 徽标 → 红。
test('BUG-457 TrackRail：loopOn 时不在图例区渲染左偏 ▲ 箭头，改为在重入节点 evidence 内附带 ↺ 标记', () => {
  const html = renderToStaticMarkup(createElement(TrackRail, {
    anchors: [
      { key: 'a1', label: '立项确认', state: 'passed', questions: 0 },
      { key: 'a2', label: '交付审阅', state: 'passed', questions: 0 },
    ],
    steps: [
      { key: 'scope', label: '立项', state: 'done', note: null },
      { key: 'team', label: '组队', state: 'done', note: null },
      { key: 'scout', label: '侦察', state: 'done', note: null },
      { key: 'evidence', label: '挖掘', state: 'done', note: null },
      { key: 'synth', label: '综合', state: 'done', note: null },
      { key: 'review', label: '审查', state: 'done', note: null },
      { key: 'deliver', label: '交付', state: 'done', note: null },
    ],
    faceVersions: 2,
    hitlPending: false,
    t: tZh,
  }))
  assert.doesNotMatch(html, /▲/, '不得再渲染固定 left:3px 错位 pointing arrow ▲')
  assert.match(html, /data-step-key="evidence"[^>]*data-step-reentry="true"[^>]*>[\s\S]*↺/, '重入标记 ↺ 必须随 evidence 步骤锚定渲染')
  assert.match(html, /图例（非执行记录）/, 'rerun 图例说明仍应保留')
})
