// web-ui-nav 的首屏遮罩判据（keyless：把注入页面里的 evaluate 源码放到假 DOM 上跑）。
//
// 为什么需要：`cdp-probe` 全程 JS 派发点击，绕过 hit-testing——DSH 的 Preview Notice 全屏遮罩
// 在时它照样"点得到"，于是 verdict 可以全绿而人打开 URL 正对着一屏 Continue（2026-10-27 卫生轮
// 实测：run-driver GREEN 同刻截图仍被遮罩盖住）。关遮罩的动作住在
// `PREVIEW_NOTICE_PROBE_JS`（唯一正本，cdp-probe 与冒烟消费方共用选择器策略），
// 本测试在**不启动浏览器**的前提下钉住它的判定与点击语义：
//   ① 无遮罩 → present=false 且零点击（不许误点页面上的 Continue——HITL 卡片的提交按钮同名，
//      见 dev/hitl-answer.mjs 的同款教训）；
//   ② 有遮罩 + Continue → present=true、clicked=true，且只点那个按钮；
//   ③ 有遮罩但按钮找不到 → present=true、clicked=false（交给调用方判红，不空转）；
//   ④ 中英三形态文案（Continue / 我知道了 / Got it）都认。
// 负例留证 2026-10-27：把 labels 收窄成只认 'Continue' → 第 ④ 例红；把 present 判定去掉 →
// 第 ① 例红（页面上的 Continue 被误点）。还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PREVIEW_NOTICE_CONTINUE, PREVIEW_NOTICE_HEADING, PREVIEW_NOTICE_PROBE_JS } from '../../scripts/lib/web-ui-nav.mjs'

/** 极简假 DOM：只实现探针用到的 querySelectorAll / children / textContent / dispatchEvent。 */
function fakeDocument({ heading = null, buttons = [] } = {}) {
  const clicks = []
  const mkButton = (label) => ({
    tagName: 'BUTTON',
    children: [],
    textContent: label,
    offsetParent: {},
    dispatchEvent: (ev) => { clicks.push({ label, type: ev?.type ?? 'unknown' }); return true },
  })
  const leaves = heading === null ? [] : [{ tagName: 'H2', children: [], textContent: heading }]
  const els = buttons.map(mkButton)
  return {
    clicks,
    document: {
      querySelectorAll: (selector) => {
        if (selector === 'button') return els
        // 探针的叶子候选取并集：返回标题叶 + 按钮（按钮另有 button 查询，这里多给不误伤）
        return selector.includes('button') ? els : leaves
      },
    },
  }
}

/** 在假 DOM 上执行探针源码（源码是 IIFE 表达式；MouseEvent 用最小桩）。 */
function runProbe(dom) {
  const MouseEvent = class { constructor(type, init) { this.type = type; this.bubbles = init?.bubbles } }
  // eslint-disable-next-line no-new-func
  const fn = new Function('document', 'MouseEvent', `return ${PREVIEW_NOTICE_PROBE_JS}`)
  return fn(dom.document, MouseEvent)
}

test('遮罩判据：无遮罩时不点页面上的 Continue（HITL 卡片同名字的防误点）', () => {
  for (const label of PREVIEW_NOTICE_CONTINUE) {
    const dom = fakeDocument({ heading: null, buttons: [label] })
    const out = runProbe(dom)
    assert.equal(out.present, false, `无标题时 present 必须 false（按钮「${label}」在场）`)
    assert.equal(out.clicked, false, '不许把页面上的 Continue 当遮罩关闭键')
    assert.equal(dom.clicks.length, 0, '零点击')
  }
})

test('遮罩判据：标题在场 + Continue → 点它一次并报告 clicked', () => {
  const dom = fakeDocument({ heading: PREVIEW_NOTICE_HEADING, buttons: ['取消', 'Continue'] })
  const out = runProbe(dom)
  assert.deepEqual(out, { present: true, clicked: true })
  assert.equal(dom.clicks.length, 1, '只点一次')
  assert.equal(dom.clicks[0].label, 'Continue', '点的是关闭键，不是相邻按钮')
  assert.equal(dom.clicks[0].type, 'click')
})

test('遮罩判据：中英三形态文案都认（Continue / 我知道了 / Got it）', () => {
  assert.deepEqual(PREVIEW_NOTICE_CONTINUE, ['Continue', '我知道了', 'Got it'])
  for (const label of PREVIEW_NOTICE_CONTINUE) {
    const dom = fakeDocument({ heading: PREVIEW_NOTICE_HEADING, buttons: [label] })
    assert.equal(runProbe(dom).clicked, true, `文案「${label}」未命中`)
  }
})

test('遮罩判据：标题在场但关闭键缺席 → present=true / clicked=false（调用方判红，不空转）', () => {
  const dom = fakeDocument({ heading: PREVIEW_NOTICE_HEADING, buttons: ['取消', '稍后'] })
  const out = runProbe(dom)
  assert.deepEqual(out, { present: true, clicked: false })
  assert.equal(dom.clicks.length, 0, '没有匹配按钮时不许乱点')
})
