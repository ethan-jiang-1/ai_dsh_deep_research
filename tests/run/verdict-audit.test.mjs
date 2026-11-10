// verdict-audit —— claim 级裁决判据的 keyless 回归（契约 = `_backlog/_archived/research/quality-loop/
// 2026-11-10-verdict-contract.md` §5；实现 = `scripts/lib/verdict-audit-core.mjs`）。
//
// 覆盖形状：绿基线 + 每条红判据各一例（负例即反证：删掉对应断言/放宽判据，这些用例会变绿）。
// 另外把 `content/templates/run/claims.json|verdicts.json`（写者契约）钉到解析面——模板键集合
// 与 core 的接受键漂移即红（模板不是第三份规格，是同一 schema 的编码）。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  auditClaimVerdicts,
  CLAIMS_CONTRACT_DATE,
  MAX_ROUNDS,
  normalizeVerbatim,
  parseClaims,
  parseVerdicts,
  sha256Text,
  stripCitations,
} from '../../scripts/lib/verdict-audit-core.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const TEMPLATES = join(ROOT, 'packages', 'deep-research-pack', 'content', 'templates', 'run')

const CLAIM_TEXT = 'X 在 2026 年降到 0.28 美元'
const FINAL = `# 报告\n\n${CLAIM_TEXT}。[来源: evidence/a.md]\n\nY 的份额是 40%。\n`
const C1 = { id: 'C1', text: CLAIM_TEXT, critical: true, urls: ['https://a.example/x'] }
const C2 = { id: 'C2', text: 'Y 的份额是 40%', critical: false }
const ITEM = { claim_id: 'C1', verdict: 'supported', quote: '0.28 美元', reason: '原文一致', rechecked_urls: ['https://a.example/x'], source_tier_ok: true }

const rawOf = (items) => JSON.stringify(items)
const withBatch = (item, batch = 0) => ({ ...item, batch })
const claimsTextOf = (claims = [C1, C2], finalRef = 1) => JSON.stringify({ version: 1, finalRef, claims })
const verdictsTextOf = ({ round = 1, raw = rawOf([ITEM]), verdicts = [withBatch(ITEM)], session = 's1', preset = 'critic', depth = 1 } = {}) => JSON.stringify({
  version: 1,
  round,
  batches: [{ session, preset, depth, raw }],
  verdicts,
})

function fixture(overrides = {}) {
  const raw = overrides.raw ?? rawOf([ITEM])
  const round = overrides.round ?? 1
  const session = overrides.session ?? 's1'
  const preset = overrides.preset ?? 'critic'
  const depth = overrides.depth ?? 1
  const claimsText = 'claimsText' in overrides ? overrides.claimsText : claimsTextOf(overrides.claims)
  const rounds = overrides.rounds ?? [{
    round,
    text: verdictsTextOf({ round, raw, verdicts: overrides.verdicts, session, preset, depth }),
  }]
  return {
    required: overrides.required ?? true,
    claimsText,
    rounds,
    finalVersion: 'finalVersion' in overrides ? overrides.finalVersion : 1,
    finalText: 'finalText' in overrides ? overrides.finalText : FINAL,
    reviewText: 'reviewText' in overrides ? overrides.reviewText : `## readiness: PASS\n\n当前裁决 = verdicts-r${round}.json\n`,
    sessions: overrides.sessions ?? {
      [session]: {
        preset,
        depth,
        parentSession: 'lead-session',
        assistantTexts: overrides.assistantTexts ?? [raw],
        toolNames: overrides.toolNames ?? ['read', 'web_fetch'],
      },
    },
  }
}

const codes = (result) => result.problems.map((p) => p.code)
const warnCodes = (result) => result.warnings.map((w) => w.code)

test('绿基线：claim 表在 final 里、critical 有结论性裁决、child 原文逐字一致、验证者没写盘', () => {
  const result = auditClaimVerdicts(fixture())
  assert.deepEqual(result.problems, [], JSON.stringify(result.problems))
  assert.equal(result.stats.claims, 2)
  assert.equal(result.stats.critical, 1)
  assert.equal(result.stats.covered, 1)
  assert.equal(result.stats.claimsSha256, sha256Text(claimsTextOf()))
})

test('旧 bundle / quick_factual：缺工件不判红，只打 legacy-not-applicable', () => {
  const result = auditClaimVerdicts({ required: false, claimsText: null, rounds: [] })
  assert.deepEqual(result.problems, [])
  assert.ok(warnCodes(result).includes('legacy-not-applicable'))
  assert.equal(result.stats.applicable, false)
})

test('新契约 run 缺 claims.json → no-claims', () => {
  const result = auditClaimVerdicts(fixture({ claimsText: null }))
  assert.ok(codes(result).includes('no-claims'))
})

test('有 claims 没裁决 → no-verdicts', () => {
  const result = auditClaimVerdicts(fixture({ rounds: [] }))
  assert.ok(codes(result).includes('no-verdicts'))
})

test('claim 不是 final 原句 → claim-not-in-final', () => {
  const result = auditClaimVerdicts(fixture({ claims: [C1, { ...C2, text: 'Y 的份额是 41%' }] }))
  assert.ok(codes(result).includes('claim-not-in-final'))
})

test('claim 表对的是旧稿 → claims-stale', () => {
  const result = auditClaimVerdicts(fixture({ finalVersion: 2 }))
  assert.ok(codes(result).includes('claims-stale'))
})

test('critical 没有裁决 → coverage-gap', () => {
  const raw = rawOf([])
  const result = auditClaimVerdicts(fixture({ raw, verdicts: [] }))
  assert.ok(codes(result).includes('coverage-gap'))
})

test('critical 判 unverifiable 而 review 写 PASS → pass-with-unverified（不能写成带缺口的 PASS）', () => {
  const item = { ...ITEM, verdict: 'unverifiable', quote: undefined, rechecked_urls: [] }
  const raw = rawOf([item])
  const result = auditClaimVerdicts(fixture({ raw, verdicts: [withBatch(item)] }))
  const found = codes(result)
  assert.ok(found.includes('pass-with-unverified'))
  assert.ok(warnCodes(result).includes('unverified-critical'))
})

test('critical 判 unsupported 而 review 写 PASS → pass-with-unsupported', () => {
  const item = { ...ITEM, verdict: 'unsupported', quote: undefined, reason: '原文只说了 0.30', rechecked_urls: [] }
  const raw = rawOf([item])
  const result = auditClaimVerdicts(fixture({ raw, verdicts: [withBatch(item)] }))
  assert.ok(codes(result).includes('pass-with-unsupported'))
})

test('verdict 值不是四值（含尾空格）→ verdict-invalid', () => {
  const item = { ...ITEM, verdict: 'supported ' }
  const raw = rawOf([item])
  const result = auditClaimVerdicts(fixture({ raw, verdicts: [withBatch(item)] }))
  assert.ok(codes(result).includes('verdict-invalid'))
})

test('supported 缺 quote → verdict-invalid', () => {
  const item = { ...ITEM, quote: '' }
  const raw = rawOf([item])
  const result = auditClaimVerdicts(fixture({ raw, verdicts: [withBatch(item)] }))
  assert.ok(codes(result).includes('verdict-invalid'))
})

test('claim 带 URL 而 supported 没记 rechecked_urls → verdict-invalid', () => {
  const item = { ...ITEM, rechecked_urls: [] }
  const raw = rawOf([item])
  const result = auditClaimVerdicts(fixture({ raw, verdicts: [withBatch(item)] }))
  assert.ok(codes(result).includes('verdict-invalid'))
})

test('解析投影与 raw 原文不一致（手改表）→ raw-reparse', () => {
  const result = auditClaimVerdicts(fixture({ verdicts: [{ ...withBatch(ITEM), quote: '改过的引文' }] }))
  assert.ok(codes(result).includes('raw-reparse'))
})

// 2026-11-11 P4 实测：critic child 常把 JSON 数组包在 ```json 围栏里。raw 仍是逐字原文，
// 解析只剥一层围栏；不能因为围栏把「原文一致」放宽——raw 与 child 正文仍逐字比。
test('raw 带 ```json 围栏：剥围栏解析、raw 仍按原文与 child 正文比对（绿）', () => {
  const fenced = `\`\`\`json\n${rawOf([ITEM])}\n\`\`\``
  const result = auditClaimVerdicts(fixture({ raw: fenced, assistantTexts: [fenced] }))
  assert.deepEqual(result.problems, [], JSON.stringify(result.problems))
})

test('raw 带围栏但投影被改 → raw-reparse（围栏不是放宽投影的借口）', () => {
  const fenced = `\`\`\`json\n${rawOf([ITEM])}\n\`\`\``
  const result = auditClaimVerdicts(fixture({
    raw: fenced,
    assistantTexts: [fenced],
    verdicts: [{ ...withBatch(ITEM), reason: '改过的理由' }],
  }))
  assert.ok(codes(result).includes('raw-reparse'))
})

test('raw 带围栏而 child 正文没有围栏 → not-verbatim（原文比对不吃围栏归一）', () => {
  const fenced = `\`\`\`json\n${rawOf([ITEM])}\n\`\`\``
  const result = auditClaimVerdicts(fixture({ raw: fenced, assistantTexts: [rawOf([ITEM])] }))
  assert.ok(codes(result).includes('not-verbatim'))
  assert.ok(!codes(result).includes('raw-reparse'), '围栏本身可解析，不该误报 raw-reparse')
})

test('围栏内不是可解析 JSON → raw-reparse', () => {
  const bad = '```json\n[not json]\n```'
  const result = auditClaimVerdicts(fixture({ raw: bad, assistantTexts: [bad] }))
  assert.ok(codes(result).includes('raw-reparse'))
})

test('裁决指向不存在的 claim → verdict-orphan；batch 越界 → batch-orphan', () => {
  const item = { ...ITEM, claim_id: 'C9' }
  const raw = rawOf([item])
  const orphan = auditClaimVerdicts(fixture({ raw, verdicts: [withBatch(item)] }))
  assert.ok(codes(orphan).includes('verdict-orphan'))
  const batch = auditClaimVerdicts(fixture({ raw: rawOf([ITEM]), verdicts: [withBatch(ITEM, 5)] }))
  assert.ok(codes(batch).includes('batch-orphan'))
})

test('review.md 没引用最新一轮 → review-round-ref', () => {
  const result = auditClaimVerdicts(fixture({ reviewText: 'readiness: PASS\n' }))
  assert.ok(codes(result).includes('review-round-ref'))
})

test('轮次超上限 → rounds-exceeded；缺 r1 → no-round-1；重复轮 → duplicate-round', () => {
  const third = auditClaimVerdicts(fixture({ rounds: [{ round: 3, text: verdictsTextOf({ round: 3 }) }] }))
  assert.ok(codes(third).includes('rounds-exceeded'))
  assert.ok(codes(third).includes('no-round-1'))
  const dup = auditClaimVerdicts(fixture({ rounds: [{ round: 1, text: verdictsTextOf() }, { round: 1, text: verdictsTextOf() }] }))
  assert.ok(codes(dup).includes('duplicate-round'))
  assert.equal(MAX_ROUNDS, 2)
})

test('child 会话 preset 不符 → session-preset；不是独立 child → session-depth', () => {
  const preset = auditClaimVerdicts(fixture({
    sessions: { s1: { preset: 'scout', depth: 1, parentSession: 'lead-session', assistantTexts: [rawOf([ITEM])], toolNames: [] } },
  }))
  assert.ok(codes(preset).includes('session-preset'))
  const depth = auditClaimVerdicts(fixture({ depth: 0 }))
  assert.ok(codes(depth).includes('session-depth'))
  const noParent = auditClaimVerdicts(fixture({ sessions: { s1: { preset: 'critic', depth: 1, parentSession: null, assistantTexts: [rawOf([ITEM])], toolNames: [] } } }))
  assert.ok(codes(noParent).includes('session-depth'))
})

test('验证者调过 write/edit/bash → verifier-wrote', () => {
  const result = auditClaimVerdicts(fixture({ toolNames: ['read', 'write'] }))
  assert.ok(codes(result).includes('verifier-wrote'))
})

test('裁决正文不是 child 原文 → not-verbatim', () => {
  const raw = rawOf([{ ...ITEM, reason: '另一份正文' }])
  const result = auditClaimVerdicts(fixture({ raw, verdicts: [withBatch({ ...ITEM, reason: '另一份正文' })], assistantTexts: [rawOf([ITEM])] }))
  assert.ok(codes(result).includes('not-verbatim'))
})

test('复验轮拿早期正文冒充后一轮 → not-verbatim（原文一致跨轮单调向后）', () => {
  const round1 = rawOf([ITEM])
  const round2 = rawOf([{ ...ITEM, reason: '复验后的正文' }])
  const result = auditClaimVerdicts(fixture({
    rounds: [
      { round: 1, text: verdictsTextOf({ round: 1, raw: round1 }) },
      { round: 2, text: verdictsTextOf({ round: 2, raw: round1 }) },
    ],
    assistantTexts: [round1, round2],
    reviewText: 'readiness: PASS\n\n见 verdicts-r2.json\n',
  }))
  assert.ok(codes(result).includes('not-verbatim'))
})

test('会话日志不可读 → 只打 session-missing 警告（不假装核过原文）', () => {
  const result = auditClaimVerdicts(fixture({ sessions: {} }))
  assert.deepEqual(result.problems, [])
  assert.ok(warnCodes(result).includes('session-missing'))
})

test('claim 表没有 critical → no-critical 警告（覆盖判据仍绿）', () => {
  const result = auditClaimVerdicts(fixture({ claims: [{ ...C1, critical: false }, C2] }))
  assert.deepEqual(result.problems, [])
  assert.ok(warnCodes(result).includes('no-critical'))
})

test('final 不可读 → final-missing 警告，不做原文核对', () => {
  const result = auditClaimVerdicts(fixture({ finalText: null }))
  assert.deepEqual(result.problems, [])
  assert.ok(warnCodes(result).includes('final-missing'))
})

test('claims 形状错误：未知字段 / 重复 id / 非对象顶层 → claims-invalid', () => {
  assert.ok(parseClaims(JSON.stringify({ version: 1, finalRef: 1, claims: [{ ...C1, extra: 1 }] })).problems.some((p) => p.code === 'claims-invalid'))
  assert.ok(parseClaims(claimsTextOf([C1, { ...C2, id: 'C1' }])).problems.some((p) => p.code === 'claims-invalid'))
  assert.ok(parseClaims('[]').problems.some((p) => p.code === 'claims-invalid'))
  assert.ok(parseClaims('{').problems.some((p) => p.code === 'claims-invalid'))
})

test('verdicts 形状错误：未知字段 / 空 batches / raw 非字符串 → verdicts-invalid', () => {
  assert.ok(parseVerdicts(JSON.stringify({ version: 1, round: 1, batches: [{ session: 's', preset: 'critic', depth: 1, raw: 'x', extra: 1 }], verdicts: [] })).problems.some((p) => p.code === 'verdicts-invalid'))
  assert.ok(parseVerdicts(JSON.stringify({ version: 1, round: 1, batches: [], verdicts: [] })).problems.some((p) => p.code === 'verdicts-invalid'))
  assert.ok(parseVerdicts(JSON.stringify({ version: 1, round: 1, batches: [{ session: 's', preset: 'critic', depth: 1, raw: 1 }], verdicts: [] })).problems.some((p) => p.code === 'verdicts-invalid'))
})

test('归一化口径：去 [来源:] 与空白；逐字只去尾空白', () => {
  assert.equal(stripCitations('甲 乙。[来源: evidence/a.md]'), '甲 乙。')
  assert.equal(normalizeVerbatim('正文\n\n'), '正文')
  assert.equal(normalizeVerbatim('正文 \n 尾'), '正文 \n 尾')
})

test('写者契约：templates/run/claims.json 与 verdicts.json 必须能被 core 原样解析', () => {
  const claims = parseClaims(readFileSync(join(TEMPLATES, 'claims.json'), 'utf8'))
  assert.deepEqual(claims.problems, [], JSON.stringify(claims.problems))
  assert.ok(claims.value.claims.length > 0)
  const verdicts = parseVerdicts(readFileSync(join(TEMPLATES, 'verdicts.json'), 'utf8'))
  assert.deepEqual(verdicts.problems, [], JSON.stringify(verdicts.problems))
  // raw 里的条目键 = verdicts 行的键（模板不能示范一个 core 不认的形状）
  const rawItems = JSON.parse(verdicts.value.batches[0].raw)
  const fileItem = verdicts.value.verdicts[0]
  assert.deepEqual(Object.keys(rawItems[0]).sort(), Object.keys(fileItem).filter((k) => k !== 'batch').sort())
})

test('契约日常量在场（epoch 豁免的唯一依据）', () => {
  assert.match(CLAIMS_CONTRACT_DATE, /^\d{4}-\d{2}-\d{2}$/)
})
