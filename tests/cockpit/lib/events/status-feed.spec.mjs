// 状态页数据装配：HITL2 锚点的交付事实 = present 见证，不是 final.md 在场（BUG-094）；
// 切会话清空旧 journal 投影（BUG-087）。
// 负例留证 2026-11-12：BUG-094——修复前 deriveAnchors 收 final.md 在场即判 HITL2 passed；
// BUG-087——修复前 useStatusFeed 切会话不重置 journalEvents/rows/journalSeen。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deriveAnchors } from '../../../../packages/deep-research-pack/src/lib/events/hitl-fold.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

test('BUG-094 HITL2 锚点：final.md 在场但 present 缺席 → 不是 passed', () => {
  const anchors = deriveAnchors([], { question: true, delivered: false })
  assert.equal(anchors.find((a) => a.key === 'anchor-2')?.state, 'upcoming')
  const presented = deriveAnchors([], { question: true, delivered: true })
  assert.equal(presented.find((a) => a.key === 'anchor-2')?.state, 'passed')
})

test('BUG-087 接线：切会话清空 journalEvents/rows/journalSeen', () => {
  const source = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/research-status/useStatusFeed.ts'), 'utf8')
  for (const line of ['setJournalEvents([])', 'setRows([])', 'setJournalSeen(false)', 'setHitl({ pending: false, since: undefined })']) {
    assert.ok(source.includes(line), `切会话必须清 ${line}`)
  }
  assert.match(source, /delivered: delivery !== null/, 'HITL2 交付事实必须用 present 见证')
})

// 负例留证 2026-11-13：BUG-117——切会话只清 journal，旧 trust/face 继续驱动扫描；
// BUG-118——leads/findings 仍用 names.has。还原法 = 删 policy reset / 改回 names.has。
test('BUG-117/118 切会话清 trust/face/unbound；leads/findings 走 hasFile', () => {
  const source = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/research-status/useStatusFeed.ts'), 'utf8')
  for (const line of ["setTrust({ kind: 'unbound' })", 'setFace(null)', 'setUnbound(false)', 'setKickoffHold(false)', 'setMemberSummaries({})']) {
    assert.ok(source.includes(line), `切会话必须复位 ${line}`)
  }
  assert.match(source, /leads: view\.hasFile\('leads\.md'\)/)
  assert.match(source, /findings: view\.hasFile\('findings\.md'\)/)
})

// 负例留证 2026-11-13：D51——状态页 readiness 曾只读 review.md 散文，与门禁（读声明件）分叉。
// 红配方：把 useStatusFeed 的声明读取删掉、退回 terminalReadiness → 本组断言红。
test('D51 接线：状态页读 review/readiness.json，并与门禁共用 readinessOfSources', () => {
  const source = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/research-status/useStatusFeed.ts'), 'utf8')
  assert.match(source, /readArtifact\(view, 'review\/readiness\.json'/)
  assert.match(source, /readinessOfSources\(\{ reviewText, declarationText, hasReviewDir: names\.has\('review'\) \}\)/)
})

// 负例留证 2026-11-22：BUG-358/359/360——旧实现把 openRun/read/list 的 Outcome 折成 null/0，
// 视图无法区分读失败与缺席/空/进度。红配方：把 readArtifact/readStateOf 换回 `ok ? ... : null/0` → 本组断言红。
test('BUG-358/359/360 接线：bundle/review/evidence 的 Outcome 进 reads 三态，不折平', () => {
  const source = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/research-status/useStatusFeed.ts'), 'utf8')
  assert.match(source, /setReads\(\{ \.\.\.ABSENT_READS, bundle: readStateOf\(opened\)/, 'bundle openRun 失败必须进 reads')
  assert.match(source, /const evidenceState = readStateOf\(evidenceDir\)/, 'evidence list 失败必须进 reads')
  assert.match(source, /readArtifact\(view, 'review\.md'/, 'review 工件读取必须走统一入口')
  assert.match(source, /readArtifact\(view, 'question\.md'/, 'question 工件读取必须走统一入口')
  assert.match(source, /readArtifact\(view, 'delivered\.json'/, '回执读取必须走统一入口')
  assert.match(source, /setReads\(\{\n\s+bundle: 'ok',\n\s+question: questionArt\.state,/, '成功扫描必须写回六事实状态')
  assert.match(source, /unknown: \[/, '读失败步必须进 deriveSteps unknown')
  assert.match(source, /setRetryNonce\(/, '失败横幅必须有重试入口')
  assert.match(source, /const \[reads, setReads\]/, 'reads 必须是状态（视图可消费）')
  assert.match(source, /scanSettled/, '首扫未落定时不得把「还没读到」显示成失败')
  assert.doesNotMatch(source, /view\.read\(/, '状态页不得裸 view.read——工件读取必须走 readArtifact（G19）')
})

test('BUG-358/359/360 视图：失败横幅/重试/证据行使用三态文案键', () => {
  const source = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/ResearchStatusTab.tsx'), 'utf8')
  for (const key of ['statusReadFailed', 'statusReviewReadFailed', 'statusEvidenceReadFailed']) {
    assert.match(source, new RegExp(`props\\.t\\('${key}'\\)`), `视图缺 ${key}`)
  }
  assert.match(source, /onClick=\{retry\}/, '失败态必须接重试')
  assert.match(source, /reads\.bundle !== 'ok'/, 'bundle 读失败必须参与标题/摘要')
})
