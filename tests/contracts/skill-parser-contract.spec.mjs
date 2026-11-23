// skill-parser-contract.spec.mjs — Skill / Template ↔ Parser / Gate 双向契约扫描器。
//
// 为什么存在（Issue 3 §3）：过去只有 template-contract 检查部分模板键；skill 里的 fenced 代码样例
// 与 gate/lib 解析器之间仍可能各写一套（如 review/readiness v1 vs v2、evidence 八字段增删、method 标题格式）。
// 本测试从 `presets/*/skills/*/SKILL.md` 与 `content/templates/run/*` 自动抽取可执行样例，直接送入
// 仓库真实解析器 / 门禁函数双向对账。
//
// 红证：故意把 skill fenced 样例的 readiness version 改成 1、从 evidence frontmatter 删 source_tier、
// 或从 claims.json 删 finalRef → 下方「双向扫描负控」用例当场红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fromMarkdown } from '../../checks/lib/test-infra/workspace-parsers.mjs'
import { splitFrontmatter } from '../../checks/lib/shared/frontmatter.mjs'
import { EVIDENCE_FIELDS } from '../../checks/lib/gates/evidence-audit-core.mjs'
import { GAP_STATES, LENS_IDS, SCOPE_ROLES } from '../../checks/lib/gates/findings-core.mjs'
import { parseClaims, parseVerdicts, VERDICT_VALUES } from '../../checks/lib/gates/verdict-audit-core.mjs'
import { AUTHORITIES, OUTPUT_SHAPES, SOURCE_FAMILIES, validateProtocol } from '../../checks/lib/gates/protocol-core.mjs'
import { planGate } from '../../checks/lib/gates/plan-gate.mjs'
import { parseReadinessDeclaration } from '../../packages/deep-research-pack/src/lib/review/review-readiness.ts'
import { foldLibrary } from '../../packages/deep-research-pack/src/lib/method-library/library-fold.ts'
import { planIndex } from '../../packages/deep-research-pack/src/lib/plan/plan-index.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const readSkill = (role, skill) => readFileSync(join(PACK, 'presets', role, 'skills', skill, 'SKILL.md'), 'utf8')
const readTemplate = (name) => readFileSync(join(PACK, 'content', 'templates', 'run', name), 'utf8')

function codeBlocksOf(markdown) {
  const ast = fromMarkdown(markdown)
  return ast.children.filter((node) => node.type === 'code')
}

export function validateEvidenceSkillSnippet(snippet) {
  const { fm } = splitFrontmatter(snippet)
  if (fm === null) return ['evidence skill fenced 样例缺少合法 YAML frontmatter']
  const keys = Object.keys(fm).sort()
  const expected = [...EVIDENCE_FIELDS].sort()
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    return [`evidence skill frontmatter 键集 [${keys.join(', ')}] !== EVIDENCE_FIELDS [${expected.join(', ')}]`]
  }
  return []
}

test('双向契约 ①：critic/adversarial-review readiness JSON 样例 ↔ parseReadinessDeclaration', () => {
  const blocks = codeBlocksOf(readSkill('critic', 'adversarial-review'))
  const jsonBlock = blocks.find((b) => b.lang === 'json')
  assert.ok(jsonBlock, 'adversarial-review 必须含 readiness.json fenced json 样例')
  const parsed = parseReadinessDeclaration(jsonBlock.value)
  assert.equal(parsed.ok, true, `adversarial-review JSON 样例不过 parseReadinessDeclaration：${parsed.ok ? '' : parsed.detail}`)
  assert.equal(parsed.value.readiness, 'PASS')
})

test('双向契约 ②：critic/claim-verdict + claims/verdicts 模板 ↔ parseClaims / parseVerdicts', () => {
  const blocks = codeBlocksOf(readSkill('critic', 'claim-verdict'))
  const jsonBlock = blocks.find((b) => b.lang === 'json')
  assert.ok(jsonBlock, 'claim-verdict 必须含 verdicts 数组 json 样例')
  const items = JSON.parse(jsonBlock.value)
  assert.ok(Array.isArray(items) && items.length >= 1)
  const expectedKeys = ['claim_id', 'verdict', 'quote', 'reason', 'rechecked_urls', 'source_tier_ok'].sort()
  for (const item of items) {
    assert.deepEqual(Object.keys(item).sort(), expectedKeys, 'claim-verdict 样例字段与 verdicts schema 不一致')
    assert.ok(VERDICT_VALUES.includes(item.verdict), `claim-verdict verdict=${item.verdict} 越出闭集`)
  }

  const claimsRes = parseClaims(readTemplate('claims.json'))
  assert.deepEqual(claimsRes.problems, [], `claims.json 模板不过 parseClaims：${JSON.stringify(claimsRes.problems)}`)
  const verdictsRes = parseVerdicts(readTemplate('verdicts.json'))
  assert.deepEqual(verdictsRes.problems, [], `verdicts.json 模板不过 parseVerdicts：${JSON.stringify(verdictsRes.problems)}`)
})

test('双向契约 ③：evidence skill 样例 & evidence-entry 模板 ↔ EVIDENCE_FIELDS 全双向一致', () => {
  const blocks = codeBlocksOf(readSkill('analyst', 'evidence-extraction'))
  assert.ok(blocks.length >= 1, 'evidence-extraction 必须含证据卡 fenced 样例')
  assert.deepEqual(validateEvidenceSkillSnippet(blocks[0].value), [])

  const tpl = splitFrontmatter(readTemplate('evidence-entry.md'))
  assert.ok(tpl.fm !== null, 'evidence-entry.md 模板缺少 YAML frontmatter')
  assert.deepEqual(Object.keys(tpl.fm).sort(), [...EVIDENCE_FIELDS].sort())
})

test('双向契约 ④：scout/lead-mapping 样例 & leads.md 模板四字段双向一致', () => {
  const blocks = codeBlocksOf(readSkill('scout', 'lead-mapping'))
  assert.ok(blocks.length >= 1)
  const extractLeadKeys = (text) => [...text.matchAll(/^-\s*([^:\n：]+?)\s*[:：]/gm)].map((m) => m[1].trim())
  const skillKeys = extractLeadKeys(blocks[0].value)
  const tplKeys = extractLeadKeys(readTemplate('leads.md'))
  assert.deepEqual([...new Set(skillKeys)].sort(), [...new Set(tplKeys)].sort(), 'lead-mapping skill 与 leads.md 模板字段集必须一致')
  for (const required of ['状态', '支持来源', '检索器', '关键线索', '建议 owner']) {
    assert.ok(skillKeys.includes(required), `lead-mapping 样例缺 ${required}`)
  }
})

test('双向契约 ⑤：analyst/wave-execution JSON 样例 ↔ wave schema 与 LENS_IDS', () => {
  const blocks = codeBlocksOf(readSkill('analyst', 'wave-execution'))
  const jsonBlock = blocks.find((b) => b.lang === 'json')
  assert.ok(jsonBlock, 'wave-execution 必须含 json 样例')
  const parsed = JSON.parse(jsonBlock.value)
  assert.equal(typeof parsed.wave, 'string')
  assert.equal(typeof parsed.bundle_dir, 'string')
  assert.ok(Array.isArray(parsed.cells) && parsed.cells.length >= 1)
  const requiredCellKeys = ['id', 'topic', 'question', 'lens', 'lens_path', 'output_path', 'lens_digest', 'budget', 'boundaries']
  for (const cell of parsed.cells) {
    for (const k of requiredCellKeys) assert.ok(Object.hasOwn(cell, k), `wave-execution cell 缺 ${k}`)
    assert.ok(LENS_IDS.includes(cell.lens), `wave-execution cell.lens=${cell.lens} 不在 LENS_IDS`)
  }
})

test('双向契约 ⑥：method-editor/method-interview 样例 ↔ foldLibrary 四分区', () => {
  const blocks = codeBlocksOf(readSkill('method-editor', 'method-interview'))
  const block = blocks.find((b) => b.lang === 'method-draft') ?? blocks[0]
  assert.ok(block, 'method-interview 必须含 method-draft 样例')
  const entries = foldLibrary(block.value)
  assert.equal(entries.length, 1, 'method-interview 样例应可被 foldLibrary 折成 1 条目')
  assert.ok(entries[0].sections.source !== null)
  assert.ok(entries[0].sections.verify !== null)
  assert.ok(entries[0].sections.report !== null)
  assert.ok(entries[0].sections.limit !== null)
})

test('双向契约 ⑦：protocol.json / plan.md 模板 ↔ validateProtocol / planIndex + planGate', () => {
  const rawProto = JSON.parse(readTemplate('protocol.json'))
  rawProto.method.id = '方案比较'
  rawProto.created = '2026-11-23T00:00:00Z'
  rawProto.output.audience = '决策层'
  assert.ok(OUTPUT_SHAPES.includes(rawProto.output.shape))
  assert.ok(AUTHORITIES.includes(rawProto.source_scope.authority))
  for (const fam of rawProto.source_scope.families) assert.ok(SOURCE_FAMILIES.includes(fam))
  const protoIssues = validateProtocol(rawProto)
  assert.deepEqual(protoIssues, [], `protocol.json 模板不过 validateProtocol：${JSON.stringify(protoIssues)}`)

  // 替换 plan.md 模板里的占位符并跑真实 planIndex + planGate（剩余工作填入 active 节点）
  const runnablePlan = readTemplate('plan.md')
    .replaceAll('<run slug>', 'demo')
    .replaceAll('protocol: v<N>', 'protocol: v1')
    .replace(/\| W(\d+\.\d+) \|([^|\n]+)\|([^|\n]+)\|([^|\n]+)\| <([^|\n]+)> \|/g, '| W$1 |$2|$3|$4| 任务说明 W$1 |')
    .replace('\n| — | 完成 |', '\n| W1.1 | 进行中 |')
  const idx = planIndex(runnablePlan)
  assert.equal(idx.table.status, 'decoded')
  assert.ok(idx.nodes.length >= 6)

  const dir = mkdtempSync(join(tmpdir(), 'drp-plan-tpl-'))
  try {
    writeFileSync(join(dir, 'plan.md'), runnablePlan, 'utf8')
    const gate = planGate(dir)
    assert.equal(gate.status, 'PASS', `plan.md 模板不过 planGate：${gate.detail}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }

  // 模板 findings/topics 闭集交叉校验
  const topics = readTemplate('topics.md')
  assert.ok(SCOPE_ROLES.some((r) => topics.includes(r)))
  const findings = readTemplate('findings.md')
  assert.ok(GAP_STATES.some((g) => findings.includes(g)))
})

test('双向扫描负控：样例漏字段 / 坏版本 / 模板缺键均必判红', () => {
  const brokenEvidence = '---\nsource_url: https://x\n---\n'
  assert.ok(validateEvidenceSkillSnippet(brokenEvidence).length > 0, '漏字段 evidence skill 样例必红')

  const badReadiness = JSON.stringify({ version: 1, readiness: 'PASS' })
  assert.equal(parseReadinessDeclaration(badReadiness).ok, false, 'v1 旧 readiness 样例必红')

  const brokenClaims = JSON.stringify({ version: 2, claims: [] })
  assert.ok(parseClaims(brokenClaims).problems.length > 0, '空 claims 模板必红')
})
