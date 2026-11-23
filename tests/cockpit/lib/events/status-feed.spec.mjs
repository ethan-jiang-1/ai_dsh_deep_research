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
import {
  ABSENT_READS,
  collectStatusNotices,
  INITIAL_STATUS_FEED_STATE,
  reduceStatusFeed,
} from '../../../../packages/deep-research-pack/src/client/research-status/status-state.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

test('BUG-094 HITL2 锚点：final.md 在场但 present 缺席 → 不是 passed', () => {
  const anchors = deriveAnchors([], { question: true, delivered: false })
  assert.equal(anchors.find((a) => a.key === 'anchor-2')?.state, 'upcoming')
  const presented = deriveAnchors([], { question: true, delivered: true })
  assert.equal(presented.find((a) => a.key === 'anchor-2')?.state, 'passed')
})

test('BUG-087 接线：切会话清空 journalEvents/rows/journalSeen', () => {
  const dirty = {
    ...INITIAL_STATUS_FEED_STATE,
    journalEvents: [{ type: 'e' }],
    rows: [{ id: '1', icon: 'x', text: 'x' }],
    journalSeen: true,
    hitl: { pending: true, since: 1 },
  }
  const reset = reduceStatusFeed(dirty, { kind: 'reset-session' })
  assert.deepEqual(reset.journalEvents, [])
  assert.deepEqual(reset.rows, [])
  assert.equal(reset.journalSeen, false)
  assert.deepEqual(reset.hitl, { pending: false, since: undefined })

  const source = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/research-status/useStatusFeed.ts'), 'utf8')
  assert.match(source, /dispatch\(\{ kind: 'reset-session' \}\)/, '切会话必须派发 reset-session')
  assert.match(source, /delivered: delivery !== null/, 'HITL2 交付事实必须用 present 见证')
})

// 负例留证 2026-11-13：BUG-117——切会话只清 journal，旧 trust/face 继续驱动扫描；
// BUG-118——leads/findings 仍用 names.has。还原法 = 删 policy reset / 改回 names.has。
test('BUG-117/118 切会话清 trust/face/unbound；leads/findings 读入工件而非 hasFile', () => {
  const dirty = {
    ...INITIAL_STATUS_FEED_STATE,
    trust: { kind: 'bound', slug: 'old', boundBy: 'write' },
    face: null,
    unbound: true,
    kickoffHold: true,
    memberSummaries: { a: { sessionId: 'a', label: 'A', role: 'scout', rows: [], activeCount: 1, errorCount: 0 } },
  }
  const reset = reduceStatusFeed(dirty, { kind: 'reset-session' })
  assert.deepEqual(reset.trust, { kind: 'unbound' })
  assert.equal(reset.face, null)
  assert.equal(reset.unbound, false)
  assert.equal(reset.kickoffHold, false)
  assert.deepEqual(reset.memberSummaries, {})

  const source = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/research-status/useStatusFeed.ts'), 'utf8')
  assert.match(source, /dispatch\(\{ kind: 'reset-session' \}\)/)
  assert.match(source, /readArtifact\(view, 'leads\.md'/)
  assert.match(source, /readArtifact\(view, 'findings\.md'/)
  assert.match(source, /hasBodyText\(leadsArt\.text\)/)
  assert.match(source, /hasBodyText\(findingsArt\.text\)/)
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
  const failedBundle = reduceStatusFeed(INITIAL_STATUS_FEED_STATE, {
    kind: 'scan-bundle-failed',
    reads: { ...ABSENT_READS, bundle: 'unreadable' },
  })
  assert.equal(failedBundle.reads.bundle, 'unreadable')
  assert.equal(failedBundle.scanSettled, true)

  const source = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/research-status/useStatusFeed.ts'), 'utf8')
  assert.match(source, /dispatch\(\{ kind: 'scan-bundle-failed', reads: \{ \.\.\.ABSENT_READS, bundle: readStateOf\(opened\)/, 'bundle openRun 失败必须进 reads')
  assert.match(source, /const evidenceState = readStateOf\(evidenceDir\)/, 'evidence list 失败必须进 reads')
  assert.match(source, /readArtifact\(view, 'review\.md'/, 'review 工件读取必须走统一入口')
  assert.match(source, /readArtifact\(view, 'question\.md'/, 'question 工件读取必须走统一入口')
  assert.match(source, /readArtifact\(view, 'delivered\.json'/, '回执读取必须走统一入口')
  assert.match(source, /reads: \{\n\s+bundle: 'ok',\n\s+question: questionArt\.state,/, '成功扫描必须写回 reads 十事实状态')
  assert.match(source, /'unknown'/, '读失败步必须映射到 StepSignal unknown')
  assert.match(source, /reviewVerdictOf\(/, '审查判定必须走共享 reviewVerdictOf')
  assert.match(source, /reviewVerdict: nextReviewVerdict/, 'reviewVerdict 必须写回 state')
  assert.match(source, /reviewDetail:/, '审查判据细节必须写回 state')
  assert.match(source, /setRetryNonce\(/, '失败横幅必须有重试入口')
  assert.match(source, /scanSettled/, '首扫未落定时不得把「还没读到」显示成失败')
  assert.doesNotMatch(source, /view\.read\(/, '状态页不得裸 view.read——工件读取必须走 readArtifact（G19）')
  assert.doesNotMatch(source, /view\.hasFile\(/, '状态页不得裸 view.hasFile——final.md 等工件读取必须走 readArtifact + 内容谓词')
  assert.match(source, /readArtifact\(view, 'final\.md'/, 'final.md 必须走 readArtifact')
  assert.match(source, /\[journalEvents, face, delivery, t\]/, 'anchors useMemo 必须依赖 delivery（防已交付后锚点滞后）')
})

test('BUG-358/359/360/361…368 视图：失败/未定/空 keys 与数据驱动 notice 列表', () => {
  const notices = collectStatusNotices({
    face: null,
    reads: { ...ABSENT_READS, bundle: 'ok', question: 'unreadable', review: 'unreadable', evidence: 'unreadable', plan: 'unreadable', final: 'unreadable' },
    reviewVerdict: 'unconfirmed',
  })
  assert.ok(notices.some((n) => n.key === 'statusReviewReadFailed'))
  assert.ok(notices.some((n) => n.key === 'statusPlanReadFailed'))

  const tabSource = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/ResearchStatusTab.tsx'), 'utf8')
  const stateSource = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/research-status/status-state.ts'), 'utf8')
  const combined = `${tabSource}\n${stateSource}`
  for (const key of ['statusReadFailed', 'statusEvidenceReadFailed']) {
    assert.ok(tabSource.includes(`props.t('${key}')`), `视图缺 ${key}`)
  }
  for (const key of ['statusReviewReadFailed', 'statusReviewEmpty', 'statusReviewUnconfirmed', 'statusReviewConflict', 'statusPlanReadFailed', 'statusPlanEmpty', 'statusPlanVersionUnknown', 'statusFinalDirReadFailed', 'statusReceiptReadFailed', 'statusReceiptInvalid', 'statusQuestionReadFailed', 'statusQuestionEmpty', 'statusQuestionBodyEmpty', 'statusLeadsEmpty', 'statusLeadsReadFailed', 'statusFindingsEmpty', 'statusFindingsReadFailed', 'statusEvidenceEmpty', 'statusEvidenceFailedOnly']) {
    assert.ok(combined.includes(`'${key}'`), `状态/视图缺 ${key}`)
  }
  assert.ok(tabSource.includes('collectStatusNotices('), '警告必须经数据驱动 collectStatusNotices 派生')
  assert.ok(tabSource.includes('props.t(notice.key)'), '状态警告必须按 notice.key 渲染')
  assert.ok(tabSource.includes('props.t(receiptIssue)'), '回执读失败/非法必须按变量取词')
  assert.match(tabSource, /onClick=\{retry\}/, '失败态必须接重试')
  assert.match(tabSource, /reads\.bundle !== 'ok'/, 'bundle 读失败必须参与标题/摘要')
  assert.ok(tabSource.includes('receiptIssue'), '回执读失败/非法必须进 ⑤ 行')
})
