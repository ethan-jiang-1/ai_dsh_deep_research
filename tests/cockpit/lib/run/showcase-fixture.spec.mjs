/**
 * showcase-fixture.spec.mjs — 校验零 Key 标杆示范夹具（tests/fixtures/showcase-home）
 * 与运行态纯折算面完全对齐：Host 投影双态（delivered + hitl_pending）、5 张证据卡 8 字段、
 * claims × verdicts 风险统计、读者版/审计版终稿目录与引用链及下一版优先项。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { foldResearchRunEvents } from '../../../../packages/deep-research-pack/src/lib/events/research-projection.ts'
import { extractEvidencePreview, extractTocHeadings, filterClaimRows, countRiskClaims } from '../../../../packages/deep-research-pack/src/lib/run/evidence-preview.ts'
import { decodeClaims, decodeVerdicts, joinClaimsVerdicts } from '../../../../packages/deep-research-pack/src/lib/run/claims-verdicts.ts'
import { decodeProtocol } from '../../../../packages/deep-research-pack/src/lib/run/protocol-fold.ts'
import { parseTopicsLenses, parseEvidenceMeta } from '../../../../packages/deep-research-pack/src/lib/run/evidence-matrix.ts'
import { extractNextVersionPriorities } from '../../../../packages/deep-research-pack/src/lib/run/rerun-triage.ts'
import { planIndex, planIssuesOf } from '../../../../packages/deep-research-pack/src/lib/plan/plan-index.ts'
import { coverageOf, coverageWarningOf, planMappingOf } from '../../../../packages/deep-research-pack/src/lib/plan/graph-model.ts'
import { runVersionFaceOf } from '../../../../packages/deep-research-pack/src/lib/run/run-version.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const FIXTURE = join(ROOT, 'tests', 'fixtures', 'showcase-home')
const WS = join(FIXTURE, 'workspace', 'research-workspace')
const DELIVERED_BUNDLE = join(WS, 'drt_dsh-plugin-ecosystem-2026')
const ARCHIVE_BUNDLE = join(WS, 'archive', 'drt_agentic-eval-benchmarks')

function parseSessionLog(rel) {
  const raw = readFileSync(join(FIXTURE, 'sessions', rel, 'session.v4.jsonl'), 'utf8')
    .replaceAll('__WORKSPACE__', '/showcase/research-workspace')
    .replaceAll('__REPO_ROOT__', '/repo')
  const lines = raw.trim().split('\n').map((line) => JSON.parse(line))
  return { header: lines[0], events: lines.slice(1) }
}

test('showcase-home 会话日志：Host researchRun 投影分别产出 delivered 与 hitl_pending 双态', () => {
  const lead = parseSessionLog('session-showcase-lead-0001')
  assert.equal(lead.header.id, 'session-showcase-lead-0001')
  assert.equal(lead.header.cwd, '/showcase/research-workspace')
  const leadProj = foldResearchRunEvents(lead.events, lead.header)
  assert.equal(leadProj.phase, 'delivered')
  assert.equal(leadProj.slug, 'dsh-plugin-ecosystem-2026')
  assert.equal(leadProj.deliveredPath, 'drt_dsh-plugin-ecosystem-2026/final/readable-v1.md')

  const hitl = parseSessionLog('session-showcase-hitl-0002')
  assert.equal(hitl.header.id, 'session-showcase-hitl-0002')
  const hitlProj = foldResearchRunEvents(hitl.events, hitl.header)
  assert.equal(hitlProj.phase, 'hitl_pending')
  assert.equal(hitlProj.slug, 'edge-inference-2026')
  assert.equal(hitlProj.hitlKind, 'hitl1')
})

test('showcase-home 证据卡、协议与核查清单：protocol 合法、3 主题雷达对齐、5 张证据卡完整可预览、6 条主张含 2 条风险项', () => {
  const proto = decodeProtocol(JSON.parse(readFileSync(join(DELIVERED_BUNDLE, 'protocol.json'), 'utf8')))
  assert.equal(proto.ok, true, 'protocol.json 解码失败')
  const topics = parseTopicsLenses(readFileSync(join(DELIVERED_BUNDLE, 'topics.md'), 'utf8'))
  assert.equal(topics.length, 3, 'topics.md 应解析出 3 个 topic')

  const evDir = join(DELIVERED_BUNDLE, 'evidence')
  const files = readdirSync(evDir).filter((f) => f.endsWith('.md')).sort()
  assert.equal(files.length, 5)
  for (const name of files) {
    const raw = readFileSync(join(evDir, name), 'utf8')
    const meta = parseEvidenceMeta(name, raw)
    assert.ok(meta !== null && meta.supports.length >= 1, `${name} supports 未解析`)
    const preview = extractEvidencePreview(`evidence/${name}`, raw)
    assert.ok(preview.title.length > 0, `${name} 缺标题`)
    assert.ok(preview.quality !== null, `${name} 缺 quality`)
    assert.ok(preview.sourceTier !== null, `${name} 缺 source_tier`)
    assert.ok(preview.excerptLines.length >= 1, `${name} 缺正文摘录`)
  }

  const claimsRaw = readFileSync(join(DELIVERED_BUNDLE, 'claims.json'), 'utf8')
  const verdictsRaw = readFileSync(join(DELIVERED_BUNDLE, 'verdicts.json'), 'utf8')
  const claimsDec = decodeClaims(JSON.parse(claimsRaw))
  const verdictsDec = decodeVerdicts(JSON.parse(verdictsRaw))
  assert.equal(claimsDec.ok, true)
  assert.equal(verdictsDec.ok, true)
  const joined = joinClaimsVerdicts(
    { state: 'ok', text: claimsRaw, value: claimsDec.value },
    { state: 'ok', text: verdictsRaw, value: verdictsDec.value },
  )
  assert.equal(joined.rows.length, 6)
  assert.equal(countRiskClaims(joined.counts), 2)
  assert.equal(filterClaimRows(joined.rows, 'risk').length, 2)
  assert.equal(filterClaimRows(joined.rows, 'supported').length, 4)
})

test('showcase-home 终稿与归档：目录/引用链/下一版优先项完整，且包含只读归档样本', () => {
  for (const rel of ['final/readable-v1.md', 'final/v1.md', 'final.md']) {
    const text = readFileSync(join(DELIVERED_BUNDLE, rel), 'utf8')
    const headings = extractTocHeadings(text)
    assert.ok(headings.length >= 4, `${rel} 目录标题过少`)
    assert.match(text, /\[来源:\s*evidence\/e1-cordis-plugin-seam\.md\]/, `${rel} 缺行内证据引用`)
    const priorities = extractNextVersionPriorities(text)
    assert.ok(priorities.length >= 2, `${rel} 缺下一版优先项列表`)
  }
  assert.ok(existsSync(join(ARCHIVE_BUNDLE, 'delivered.json')), '缺少只读归档样本 delivered.json')
  assert.ok(existsSync(join(ARCHIVE_BUNDLE, 'final', 'readable-v1.md')), '缺少只读归档样本 readable-v1.md')
})

test('showcase-home plan.md：图版本明确声明 v1、采用 W<wave>.<index> 层级编号且 plan-only 零告警', () => {
  const planRaw = readFileSync(join(DELIVERED_BUNDLE, 'plan.md'), 'utf8')
  const idx = planIndex(planRaw)
  assert.equal(idx.version, 'v1', 'plan.md 应声明图版本 v1')
  assert.equal(idx.topLevel.length, 5)
  assert.deepEqual(planIssuesOf(idx), [], '示范 plan.md 不应触发任何结构告警（如旧 flat W）')
  const mapping = planMappingOf(idx, [])
  const coverage = coverageOf(idx, [], mapping)
  assert.equal(coverageWarningOf(coverage), null, '示范 plan.md 标记 plan-only 后不应触发映射缺口告警')
  const vFace = runVersionFaceOf({
    planText: planRaw,
    finalFileNames: ['v1.md', 'readable-v1.md'],
    delivered: true,
    deliveredVersion: 1,
    draftPresent: true,
  })
  assert.equal(vFace.currentPlanVersion, 1)
  assert.doesNotMatch(vFace.label, /plan 版本未声明/)
})
