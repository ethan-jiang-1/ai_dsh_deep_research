// verdict-audit fixture —— 真实 child 会话线形的 keyless 回归。
//
// 为什么要这个文件：`verdict-audit-core` 的四条会话判据（session-preset / session-depth /
// not-verbatim / verifier-wrote）读的是真实 DSH v4 日志的线形；此前的用例把 sessions 事实直接
// 注入 core，CLI 的日志定位/解析没有 keyless 覆盖。本测试用 Pilot A 的真实 child 日志切面
// （tests/fixtures/verdict-audit/pilot-a，脱敏规则见该组 README）走
// `findSessionDir → resolveSessionLog → parseSessionFacts → auditClaimVerdicts` 全链。
//
// 反证：三条派生红都在测试内从同一份夹具变换（改 header preset / 追加 write 调用 / 改 child
// 末条正文），不另存负例目录——夹具只有一份，负例是它的可复算导数。改夹具应预期本文件变红
// （夹具 README 的“不改三件”规则即由此钉住）。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  auditClaimVerdicts,
  normalizeVerbatim,
  parseClaims,
  parseSessionFacts,
  parseVerdicts,
  stripCitations,
} from '../../scripts/lib/verdict-audit-core.mjs'
import { findSessionDir, resolveSessionLog } from '../../scripts/lib/session-log.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const FIXTURE = join(ROOT, 'tests', 'fixtures', 'verdict-audit', 'pilot-a')
const SESSIONS = join(FIXTURE, 'sessions')
const BUNDLE = join(FIXTURE, 'bundle')
const SESSION_ID = '394f8a00-78f9-42bf-8911-58e9c786c8fd'
const read = (rel) => readFileSync(join(BUNDLE, rel), 'utf8')
const logTextOf = () => {
  const dir = findSessionDir(SESSIONS, SESSION_ID)
  assert.notEqual(dir, null, `fixture session 不在场：${SESSION_ID}`)
  const logPath = resolveSessionLog(dir)
  assert.notEqual(logPath, null, 'fixture session 没有 canonical 日志')
  return { dir, logPath, text: readFileSync(logPath, 'utf8') }
}
const claimsText = read('review/claims.json')
const verdictsText = read('review/verdicts-r1.json')
const finalText = read('final/v1.md')
const reviewText = read('review.md')
const parseLog = (text) => parseSessionFacts(text)
const auditWith = (facts, overrides = {}) => auditClaimVerdicts({
  required: true,
  claimsText,
  rounds: [{ round: 1, text: verdictsText }],
  finalVersion: 1,
  finalText,
  reviewText,
  sessions: { [SESSION_ID]: facts },
  ...overrides,
})
const codesOf = (result) => result.problems.map((p) => p.code)

test('真实 child 日志：目录发现 + canonical 日志 + header 事实（preset/depth/parent）', () => {
  const { dir, logPath, text } = logTextOf()
  assert.equal(dir.split('/').at(-1), SESSION_ID)
  assert.match(logPath, /session\.v4\.jsonl$/)
  const facts = parseLog(text)
  assert.equal(facts.preset, 'critic')
  assert.equal(facts.depth, 1)
  assert.ok(facts.parentSession && facts.parentSession !== '', 'child 必须有 parentSession')
  assert.ok(facts.assistantTexts.length >= 1)
  assert.ok(facts.toolNames.includes('web_fetch'))
  assert.ok(facts.toolNames.includes('web_search'))
  assert.ok(!facts.toolNames.some((name) => /^(write|edit|bash)$/.test(name)), '验证者不得有写盘调用')
  assert.equal(/Users\/bowhead/.test(text), false, '夹具不得留录制机绝对路径')
})

test('真实夹具全链：claims 原句在 final、raw 与 child 末条正文逐字相等、门禁绿', () => {
  const facts = parseLog(logTextOf().text)
  const verdicts = parseVerdicts(verdictsText)
  assert.deepEqual(verdicts.problems, [], JSON.stringify(verdicts.problems))
  const claims = parseClaims(claimsText)
  assert.deepEqual(claims.problems, [], JSON.stringify(claims.problems))
  for (const claim of claims.value.claims) {
    assert.ok(stripCitations(finalText).includes(stripCitations(claim.text)), `${claim.id} 必须是 final 原句`)
  }
  assert.equal(
    normalizeVerbatim(facts.assistantTexts.at(-1)),
    normalizeVerbatim(verdicts.value.batches[0].raw),
    'raw 必须是 child 末条正文原文',
  )
  const result = auditWith(facts)
  assert.deepEqual(result.problems, [], JSON.stringify(result.problems))
  assert.equal(result.stats.applicable, true)
  assert.equal(result.stats.claims, 2)
  assert.equal(result.stats.covered, 2)
  assert.ok(!result.warnings.some((w) => w.code === 'readiness-unparsed'), 'review.md 的括号终局块必须被读出')
  assert.ok(!result.warnings.some((w) => w.code === 'session-missing'), '真实日志必须在场并被读到')
})

test('派生红：header preset 被改成 scout → session-preset（验证者不是做的人）', () => {
  const mutated = logTextOf().text.replace(/"agentPreset":\s*"critic"/u, '"agentPreset":"scout"')
  const result = auditWith(parseLog(mutated))
  assert.ok(codesOf(result).includes('session-preset'), JSON.stringify(codesOf(result)))
})

test('派生红：child 追加一次 write 调用 → verifier-wrote（只读纪律是任务形状，调用即红）', () => {
  const lines = logTextOf().text.trim().split('\n')
  lines.push(JSON.stringify({ type: 'tool/call', seq: 999, data: { turn: 1, step: 1, callId: 'c-write', name: 'write', arguments: '{}' } }))
  const result = auditWith(parseLog(lines.join('\n')))
  assert.ok(codesOf(result).includes('verifier-wrote'), JSON.stringify(codesOf(result)))
})

test('派生红：child 末条正文被改一字 → not-verbatim（裁决必须原文落盘）', () => {
  const lines = logTextOf().text.trim().split('\n').map((line) => JSON.parse(line))
  const last = [...lines].reverse().find((event) => event.type === 'assistant/message')
  assert.ok(last, '夹具必须有 assistant/message')
  const block = last.data.message.content.find((item) => item.type === 'text')
  assert.ok(block, '末条 assistant 正文必须有 text 块')
  block.text = block.text.replace('"verdict":"supported"', '"verdict":"partially_supported"')
  const result = auditWith(parseLog(lines.map((event) => JSON.stringify(event)).join('\n')))
  assert.ok(codesOf(result).includes('not-verbatim'), JSON.stringify(codesOf(result)))
})
