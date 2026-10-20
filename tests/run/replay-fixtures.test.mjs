// tests/replay-fixtures.test.mjs — 入库 fixture 的 MCP 组契约（BUG-019 回归守卫）。
// 断言对象 = snapshots/replay/research-face/ 的已入库 fixture（仓内自控文件，keyless）。
// 判据窄带：mirror 带 mcp 行（MCP_PLAYWRIGHT=0 录制形态出现时本判据须随行调整——
// 登记于 BUG-019 卡）；fixture 缺 MCP 组 = 录制竞态输家入库，回放 B·headers/B·persona 必假红。
// 反证记录 = BUG-019 fixed_bugs 卡（注入回归：剥 marker → 红 → 还原 → 绿）。
// 负例留证 2026-10-10：BUG-019 竞态输家 fixture（工具表缺 list_mcp_resources）入库后本测试
// 点名红——注入回归实录：sed 剥 scout fixture 的 marker → `not ok 201` 红（pass 322 / fail 1）
// → git checkout 还原 → pass 323 / fail 0 全绿（含本守卫）。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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
