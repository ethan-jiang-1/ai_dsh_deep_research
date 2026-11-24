// 方法编辑面板的建会话重试（BUG-418）：失败一次后重试成功必须清掉错误条，且错误详情不带
// `Error: ` 工程前缀。
//
// 负例留证 2026-11-24：BUG-418——ensure 失败置 error 后，effect 重跑成功只 setCoach，
// 不 setError(null)，面板同时显示「就绪」与「暂不可用：Error: …」。
// 红配方：删掉成功分支的 `setError(null)`，或把 errorDetailOf 换回 `String(cause)`。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { loadRtl, makeTranslator } from '../../client-dom-helpers.mjs'
import { zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { MethodCoachPanel } from '../../../../packages/deep-research-pack/src/client/method-library/coach.tsx'

const t = makeTranslator(zh)

const baseProps = (overrides = {}) => ({
  sessionId: 's1',
  draftKey: 'd1',
  visible: true,
  title: '方法编辑',
  startLabel: zh.startInterview,
  readyLabel: zh.interviewReady,
  pendingLabel: zh.startingInterview,
  startedLabel: zh.interviewStarted,
  onStartInterview: async () => ({ ok: true }),
  t,
  ...overrides,
})

const reference = () => ({ ready: Promise.resolve(), release: () => {} })

test('BUG-418 建会话失败后重试成功：错误条清空（不再同时说「就绪」与「暂不可用」）', async () => {
  const rtl = await loadRtl()
  const failing = async () => { throw new Error('建会话失败 A（表单可以继续填，稍后重试）') }
  const { container, rerender } = rtl.render(createElement(MethodCoachPanel, baseProps({ ensure: failing })))
  try {
    await rtl.waitFor(() => {
      if (!(container.textContent ?? '').includes(zh.coachUnavailable.split('{')[0])) throw new Error('wait')
    })
    assert.match(container.textContent ?? '', /暂不可用|不可用/)

    // 重试：新的 ensure 身份触发 effect 重跑，这次成功。
    rerender(createElement(MethodCoachPanel, baseProps({ ensure: async () => ({ id: 'coach-1', reference: reference() }) })))
    await rtl.waitFor(() => {
      if ((container.textContent ?? '').includes(zh.coachUnavailable.split('{')[0])) throw new Error('error still there')
    })
    assert.doesNotMatch(container.textContent ?? '', /暂不可用/, '成功后不得残留旧错误条')
    assert.match(container.textContent ?? '', /摘要会保留当前选择/, '面板保持可用态（建会话成功）')
  } finally {
    rtl.cleanup()
  }
})

test('BUG-418 错误详情不带 `Error: ` 前缀（errorDetailOf 收口）', async () => {
  const rtl = await loadRtl()
  const { container } = rtl.render(createElement(MethodCoachPanel, baseProps({
    ensure: async () => { throw new Error('建会话失败 B') },
  })))
  try {
    await rtl.waitFor(() => {
      if (!(container.textContent ?? '').includes('建会话失败 B')) throw new Error('wait')
    })
    assert.doesNotMatch(container.textContent ?? '', /Error: 建会话失败 B/, '详情不得带工程前缀')
    assert.match(container.textContent ?? '', /建会话失败 B/)
  } finally {
    rtl.cleanup()
  }
})
