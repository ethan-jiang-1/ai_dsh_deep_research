// tests/run/replay-fixtures.test.mjs — 入库 fixture 的 MCP 组契约（BUG-019 回归守卫）
//   + 渲染金标准 ↔ fixture 的 web_search 面静态对账（重写链机审，卫生轮 B5）。
// 断言对象 = snapshots/replay/research-face/ 的已入库 fixture 与金标准（仓内自控文件，keyless）。
// 判据窄带：mirror 带 mcp 行（MCP_PLAYWRIGHT=0 录制形态出现时本判据须随行调整——
// 登记于 BUG-019 卡）；fixture 缺 MCP 组 = 录制竞态输家入库，回放 B·headers/B·persona 必假红。
// 反证记录 = BUG-019 fixed_bugs 卡（注入回归：剥 marker → 红 → 还原 → 绿）。
// 负例留证 2026-10-10：BUG-019 竞态输家 fixture（工具表缺 list_mcp_resources）入库后本测试
// 点名红——注入回归实录：sed 剥 scout fixture 的 marker → `not ok 201` 红（pass 322 / fail 1）
// → git checkout 还原 → pass 323 / fail 0 全绿（含本守卫）。
// 负例留证 2026-10-21（web_search 对账）：向 ui.expected.md 卡片节临时加一行伪「检索：」
// 行 → 对账用例红（deepEqual 两行 ≠ 一行）→ edit 改回 → 绿。发现登记：金标准里「检索：」
// 在卡片节与活动行节各出一次（每次调用渲染 1 卡 + 1 行）——朴素「检索行数 = 调用数」
// 不成立，对账按节分列（卡片节 ↔ cardTitleOf；🔍 行 ↔ foldActivityRows）。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cardTitleOf, parseArgsObject } from '../../packages/deep-research-pack/src/lib/tool-card.ts'
import { foldActivityRows } from '../../packages/deep-research-pack/src/lib/activity-fold.ts'

const SCENARIO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'snapshots', 'replay', 'research-face')

test('入库 fixture 工具表含 MCP 组（BUG-019 竞态守卫）', () => {
  const manifest = JSON.parse(readFileSync(join(SCENARIO, 'snapshot.json'), 'utf8'))
  assert.ok(Array.isArray(manifest.cases) && manifest.cases.length > 0, '场景声明 cases 非空')
  for (const c of manifest.cases) {
    const text = readFileSync(join(SCENARIO, c.fixture), 'utf8')
    assert.ok(text.includes('"type":"session"'), `${c.fixture}: 会话头事件在场`)
    assert.ok(text.includes('list_mcp_resources'), `${c.fixture}: 工具表缺 MCP 组——BUG-019 竞态输家入库（回放 B·headers/B·persona 必假红）`)
  }
})

test('渲染金标准 ↔ fixture 的 web_search 面静态对账（--update-expected 重写链的机审半边）', () => {
  const manifest = JSON.parse(readFileSync(join(SCENARIO, 'snapshot.json'), 'utf8'))
  const goldCases = manifest.cases.filter((c) => typeof c.renderExpected === 'string')
  assert.ok(goldCases.length > 0, '场景声明里零个 renderExpected——对账面为空（防空语料）')
  for (const c of goldCases) {
    const events = readFileSync(join(SCENARIO, c.fixture), 'utf8')
      .split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l))
    const calls = events.filter((e) => e?.type === 'tool/call' && e?.data?.name === 'web_search')
    assert.ok(calls.length > 0, `${c.fixture}: 零 web_search 调用——金标准 C1 防空语料要求至少一张卡，对账无对象`)
    const goldLines = readFileSync(join(SCENARIO, c.renderExpected), 'utf8').split('\n')
    const sectionOf = (headerPrefix) => {
      const i = goldLines.findIndex((l) => l.startsWith(headerPrefix))
      assert.ok(i !== -1, `${c.renderExpected}: 找不到「${headerPrefix}」节——金标准结构漂移（生成器 = snapshot-replay-smoke --update-expected）`)
      const rest = goldLines.slice(i + 1)
      const end = rest.findIndex((l) => l.startsWith('#'))
      return (end === -1 ? rest : rest.slice(0, end)).filter((l) => l.trim() !== '')
    }
    // 卡片节 ↔ cardTitleOf 逐行重放（同一批纯函数，零判据复制——重写金标准若吞回归，
    // fixture 侧事实在此咬红）
    const argsOf = (call) => String(call?.data?.arguments ?? '')
    const expectedCards = calls.map((e) => cardTitleOf('web_search', parseArgsObject(argsOf(e)), argsOf(e)))
    assert.deepEqual(sectionOf('## 对话流 · 研究语义卡'), expectedCards,
      `${c.fixture} → ${c.renderExpected}：卡片节 ≠ fixture web_search 调用经 cardTitleOf 的折算结果`)
    // 🔍 活动行 ↔ foldActivityRows 重放（只对 🔍 子集——活动节还含 👥/💬/📦 行，不在此面）
    const expectedSearchRows = foldActivityRows(events).filter((r) => r.icon === '🔍').map((r) => `🔍 ${r.text}`)
    assert.deepEqual(sectionOf('## 研究状态页签 · 人性化活动行').filter((l) => l.startsWith('🔍')), expectedSearchRows,
      `${c.fixture} → ${c.renderExpected}：🔍 检索活动行 ≠ fixture 事件经 foldActivityRows 的折算结果`)
  }
})
