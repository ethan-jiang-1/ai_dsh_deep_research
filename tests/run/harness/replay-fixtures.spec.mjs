// tests/run/harness/replay-fixtures.spec.mjs — 入库 fixture 的 MCP 组契约（BUG-019 回归守卫）
//   + 渲染金标准 ↔ fixture 的 web_search 面静态对账（重写链机审，卫生轮 B5）
//   + 5 角色 B 层组装面（persona / skill-catalog / runtime-context manual.md / vendor pin）对齐（BUG-013 / BUG-080）。
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
// 负例留证 2026-11-14：BUG-013 / BUG-080——旧版只查 source 哈希格式（40-hex），不验 fixture 内
// 模型可见组装载荷与当前 pack 源同代，导致 42b589e7 用过期 harness-home 录入了旧 manual.md 而绿灯漏过；
// 现直连 loadReplayScene + presetRoles + yaml AST 逐角色对账 persona / skill-catalog / manual.md / vendor pin。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cardTitleOf, parseArgsObject } from '../../../packages/deep-research-pack/src/lib/events/tool-card.ts'
import { foldActivityRows } from '../../../packages/deep-research-pack/src/lib/events/activity-fold.ts'
import { loadReplayScene } from '../../../checks/lib/harness/replay-scene.mjs'
import { presetRoles } from '../../../checks/lib/shared/roles.mjs'
import { yaml } from '../../../checks/lib/tools/workspace-parsers.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const PACK_DIR = join(ROOT, 'packages', 'deep-research-pack')
const SCENARIO = join(ROOT, 'snapshots', 'replay', 'research-face')

const xmlEscape = (text) => String(text)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

function readExpectedRoleAssembly(role, packDir = PACK_DIR) {
  const patchText = readFileSync(join(packDir, 'presets', `${role}.patch.yml`), 'utf8')
  const rows = yaml.parseDocument(patchText).toJS()
  const plugins = rows?.[0]?.insert?.[0]?.config?.plugins ?? []
  const personaRow = plugins.find((p) => p?.name === '@deepseek-ai/dsh-persona')
  const skillRow = plugins.find((p) => p?.name === '@deepseek-ai/dsh-skill-filesystem')
  const personaPrefix = String(personaRow?.config?.prefix ?? '').trim()

  const skillEntries = []
  for (const rawDir of skillRow?.config?.customSkillDirs ?? []) {
    const dirStr = String(rawDir)
    const relMatch = /['"](presets\/[^'"]+)['"]/.exec(dirStr)
    const absDir = relMatch !== null ? join(packDir, relMatch[1]) : join(packDir, 'presets', dirStr)
    for (const ent of readdirSync(absDir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue
      const skillMd = readFileSync(join(absDir, ent.name, 'SKILL.md'), 'utf8')
      const fmMatch = /^---\n([\s\S]*?)\n---/.exec(skillMd)
      assert.ok(fmMatch !== null, `${role}/${ent.name}: SKILL.md 缺 frontmatter`)
      const fm = yaml.parseDocument(fmMatch[1]).toJS()
      skillEntries.push({
        name: String(fm.name),
        line: `- \`${String(fm.name)}\`: ${xmlEscape(String(fm.description).trim())}`,
      })
    }
  }
  skillEntries.sort((a, b) => a.name.localeCompare(b.name))

  const manualExpected = readFileSync(join(packDir, 'content', 'manual.md'), 'utf8')
    .replaceAll('{{research_pack_root}}', '<replay:pack-root>')
    .trim()

  return {
    personaPrefix,
    skillCatalogBlock: ['<available_skills>', ...skillEntries.map((item) => item.line), '</available_skills>'].join('\n'),
    manualExpected,
  }
}

function checkRoleFixtureAlignment({ role, events, sourceVendor, expectedVendorPin, expectedAssembly }) {
  const problems = []
  if (sourceVendor !== expectedVendorPin) {
    problems.push(`${role}: source.vendor ${sourceVendor} ≠ 当前 vendor pin ${expectedVendorPin}`)
  }

  const sysText = events
    .filter((e) => e?.type === 'system/message' && e?.data?.message?.source?.kind === 'system-prompt')
    .flatMap((e) => e.data.message.content ?? [])
    .map((part) => part?.text ?? '')
    .join('\n')
  if (!sysText.includes(expectedAssembly.personaPrefix)) {
    problems.push(`${role}: system-prompt 与当前 presets/${role}.patch.yml persona 漂移`)
  }

  const skillText = events
    .filter((e) => e?.type === 'user/message' && e?.data?.source?.kind === 'skill-catalog')
    .flatMap((e) => e.data.content ?? [])
    .map((part) => part?.text ?? '')
    .join('\n')
  if (!skillText.includes(expectedAssembly.skillCatalogBlock)) {
    problems.push(`${role}: skill-catalog 与当前 presets/${role}/skills/*/SKILL.md 漂移`)
  }

  const runtimeText = events
    .filter((e) => e?.type === 'user/message' && e?.data?.source?.kind === 'runtime-context')
    .flatMap((e) => e.data.content ?? [])
    .map((part) => (part?.text ?? '').replace(/[^\s"'`]*\/profiles\/[^/\s"'`]+\/node_modules\/dsh-deep-research-pack/g, '<replay:pack-root>'))
    .join('\n')
  if (!runtimeText.includes(expectedAssembly.manualExpected)) {
    problems.push(`${role}: runtime-context 与当前 content/manual.md 漂移（疑似陈旧 profile 录制）`)
  }

  return problems
}

test('入库 fixture 工具表含 MCP 组（BUG-019 竞态守卫）', () => {
  const manifest = JSON.parse(readFileSync(join(SCENARIO, 'snapshot.json'), 'utf8'))
  assert.ok(Array.isArray(manifest.cases) && manifest.cases.length > 0, '场景声明 cases 非空')
  // 场景声明 mcp:false = 录制窗口的 profile 无 MCP 行（MCP_PLAYWRIGHT=0 形态）；此时 fixture
  // 必须无 MCP 组。未声明（legacy）或 true = 仍按 BUG-019 要求 MCP 组在场。
  const expectMcp = manifest.mcp !== false
  for (const c of manifest.cases) {
    const text = readFileSync(join(SCENARIO, c.fixture), 'utf8')
    assert.ok(text.includes('"type":"session"'), `${c.fixture}: 会话头事件在场`)
    if (expectMcp) {
      assert.ok(text.includes('list_mcp_resources'), `${c.fixture}: 工具表缺 MCP 组——BUG-019 竞态输家入库（回放 B·headers/B·persona 必假红）`)
    } else {
      assert.equal(text.includes('list_mcp_resources'), false, `${c.fixture}: 场景声明 mcp:false，但 fixture 含 MCP 组——录制组合与声明不符`)
    }
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
      assert.ok(i !== -1, `${c.renderExpected}: 找不到「${headerPrefix}」节——金标准结构漂移（生成器 = snapshot-replay.entry --update-expected）`)
      const rest = goldLines.slice(i + 1)
      const end = rest.findIndex((l) => l.startsWith('#'))
      return (end === -1 ? rest : rest.slice(0, end)).filter((l) => l.trim() !== '')
    }
    const argsOf = (call) => String(call?.data?.arguments ?? '')
    const expectedCards = calls.map((e) => cardTitleOf('web_search', parseArgsObject(argsOf(e)), argsOf(e)))
    assert.deepEqual(sectionOf('## 对话流 · 研究语义卡'), expectedCards,
      `${c.fixture} → ${c.renderExpected}：卡片节 ≠ fixture web_search 调用经 cardTitleOf 的折算结果`)
    const expectedSearchRows = foldActivityRows(events).filter((r) => r.icon === '🔍').map((r) => `🔍 ${r.text}`)
    assert.deepEqual(sectionOf('## 研究状态页签 · 人性化活动行').filter((l) => l.startsWith('🔍')), expectedSearchRows,
      `${c.fixture} → ${c.renderExpected}：🔍 检索活动行 ≠ fixture 事件经 foldActivityRows 的折算结果`)
  }
})

test('5 角色入库录制流与当前 pack 源 persona / skill-catalog / manual.md / vendor pin 逐字同代（BUG-013 / BUG-080）', () => {
  const vendorGateSrc = readFileSync(join(ROOT, 'checks/verify/gates/d-vendor.mjs'), 'utf8')
  const pinMatch = /const PIN = '([0-9a-f]{40})'/.exec(vendorGateSrc)
  assert.ok(pinMatch !== null, '无法从 d-vendor.mjs 读取当前 vendor PIN')
  const expectedVendorPin = pinMatch[1]

  const roles = presetRoles(ROOT)
  const scene = loadReplayScene(SCENARIO, roles)
  assert.deepEqual([...scene.roles].sort(), roles, 'research-face 必须覆盖盘上全部 5 个角色 preset')

  const problems = []
  for (const c of scene.cases) {
    assert.match(c.source?.codeAnchor ?? '', /^[0-9a-f]{40}$/, `${c.id}: codeAnchor 必须 40-hex`)
    assert.match(c.source?.recordedAt ?? '', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, `${c.id}: recordedAt 必须 RFC3339`)
    const events = readFileSync(c.fixture, 'utf8')
      .split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l))
    const expectedAssembly = readExpectedRoleAssembly(c.preset)
    problems.push(...checkRoleFixtureAlignment({
      role: c.preset,
      events,
      sourceVendor: c.source.vendor,
      expectedVendorPin,
      expectedAssembly,
    }))
  }
  assert.deepEqual(problems, [])

  // 自检反证：manual / persona / skill / vendor 任一处篡改 1 字都必须抓红
  const leadCase = scene.cases.find((c) => c.id === 'lead')
  const leadEvents = readFileSync(leadCase.fixture, 'utf8')
    .split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l))
  const baseExpected = readExpectedRoleAssembly('lead')
  assert.equal(checkRoleFixtureAlignment({
    role: 'lead',
    events: leadEvents,
    sourceVendor: '0'.repeat(40),
    expectedVendorPin,
    expectedAssembly: baseExpected,
  }).length, 1)
  assert.equal(checkRoleFixtureAlignment({
    role: 'lead',
    events: leadEvents,
    sourceVendor: expectedVendorPin,
    expectedVendorPin,
    expectedAssembly: { ...baseExpected, manualExpected: `${baseExpected.manualExpected}\n__DRIFT__` },
  }).length, 1)
})
