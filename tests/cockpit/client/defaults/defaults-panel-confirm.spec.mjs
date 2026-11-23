// 「项目默认」面板的局部确认态必须跟随会话切换复位（BUG-399）。
//
// 病症：在会话 A 点「清除本项目默认」让按钮进入二次确认（confirmClear=true）后切到会话 B——
// 按钮仍停在「再点一次确认」，于是 B 里第一次点击就**直接清空 B 的研究默认**。
//
// 负例留证 2026-11-23：BUG-399——删掉 `useEffect(() => setConfirmClear(false), [sessionId])`
// → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { loadRtl, makeTranslator } from '../../client-dom-helpers.mjs'
import { zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { createDefaultsStore } from '../../../../packages/deep-research-pack/src/client/defaults/store.ts'
import { DefaultsPanel } from '../../../../packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx'

const t = makeTranslator(zh)

function makeStore(sent) {
  return createDefaultsStore({
    readText: async (sid) => JSON.stringify({ schema: 1, revision: 1, effort: sid === 's1' ? 'quick' : 'deep' }),
    readLibrary: async () => ({ kind: 'absent', path: 'method-library.md' }),
    listDir: async () => [],
    execute: async (sid, line) => {
      sent.push({ sid, line })
      return { ok: true, value: { result: { kind: 'success', text: 'ok revision=2' } } }
    },
  })
}

test('BUG-399 切会话复位二次确认：s2 首次点击仍只是上膛，不得直接 clear', async () => {
  const rtl = await loadRtl()
  const sent = []
  const store = makeStore(sent)
  const { container, rerender } = rtl.render(createElement(DefaultsPanel, { sessionId: 's1', store, t }))
  try {
    await rtl.waitFor(() => {
      if (container.querySelector('[data-testid=defaults-depth]')?.value !== 'quick') throw new Error('wait s1')
    })
    const clearBtn = container.querySelector('[data-testid=defaults-clear]')
    rtl.fireEvent.click(clearBtn)
    assert.equal(clearBtn.textContent, t('defaultsClearConfirm'), '第一次点击后应进入确认态（前置）')

    rerender(createElement(DefaultsPanel, { sessionId: 's2', store, t }))
    await rtl.waitFor(() => {
      if (container.querySelector('[data-testid=defaults-depth]')?.value !== 'deep') throw new Error('wait s2')
    })
    assert.equal(clearBtn.textContent, t('defaultsClear'), '切会话后确认态必须复位')
    assert.deepEqual(sent, [], '复位前不得发出任何 clear 指令')

    rtl.fireEvent.click(clearBtn)
    assert.equal(clearBtn.textContent, t('defaultsClearConfirm'), 's2 首次点击只上膛')
    assert.deepEqual(sent, [], 's2 首次点击不得直接清空研究默认')
    rtl.fireEvent.click(clearBtn)
    await rtl.waitFor(() => { if (sent.length === 0) throw new Error('wait clear') })
    assert.equal(sent.length, 1, '第二次点击才真正 clear')
    assert.equal(sent[0].sid, 's2')
    assert.match(sent[0].line, /clear/)
  } finally {
    rtl.cleanup()
  }
})
