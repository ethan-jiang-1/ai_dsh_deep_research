// status-state.spec.mjs — reduceStatusFeed 与 collectStatusNotices 无浏览器单测。
// 红证：把 reset-session 漏复位 reads/face，或把 evidence unreadable 从 collectStatusNotices 拿掉 → 下方断言立即转红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ABSENT_READS,
  collectStatusNotices,
  INITIAL_STATUS_FEED_STATE,
  planIssueKeyOf,
  receiptIssueKeyOf,
  reduceStatusFeed,
  trustKey,
} from '../../../../packages/deep-research-pack/src/client/research-status/status-state.ts'

test('reduceStatusFeed：journal-frame 保持同 trustKey 的对象引用稳定性，防止重复触发扫描', () => {
  const trustA = { kind: 'bound', slug: 's1', boundBy: 'write' }
  const s1 = reduceStatusFeed(INITIAL_STATUS_FEED_STATE, {
    kind: 'journal-frame',
    events: [{ type: 'x' }],
    rows: [],
    hitl: { pending: false, since: undefined },
    trust: trustA,
  })
  assert.equal(s1.journalSeen, true)
  assert.equal(s1.trust, trustA)

  const trustA2 = { kind: 'bound', slug: 's1', boundBy: 'write' }
  const s2 = reduceStatusFeed(s1, {
    kind: 'journal-frame',
    events: [{ type: 'x' }, { type: 'y' }],
    rows: [],
    hitl: { pending: true, since: 10 },
    trust: trustA2,
  })
  assert.equal(s2.trust, trustA, '同 trustKey 不应替换 trust 引用导致重复 scan')
  assert.equal(s2.hitl.pending, true)

  const trustB = { kind: 'bound', slug: 's1', boundBy: 'read' }
  const s3 = reduceStatusFeed(s2, {
    kind: 'journal-frame',
    events: s2.journalEvents,
    rows: [],
    hitl: s2.hitl,
    trust: trustB,
  })
  assert.equal(s3.trust, trustB)
  assert.notEqual(trustKey(trustA), trustKey(trustB))
})

test('reduceStatusFeed：reset-session 同步清空 journal 与 policy state；scan-threw/bundle-failed 保留错误可读态', () => {
  const populated = reduceStatusFeed(INITIAL_STATUS_FEED_STATE, {
    kind: 'scan-succeeded',
    reads: { ...ABSENT_READS, bundle: 'ok', question: 'ok' },
    face: {
      questionLine: 'Q', questionIssue: null, hasQuestion: true, leadsIssue: null, findingsIssue: null,
      evidenceIssue: null, steps: [], evidenceCount: 1, delivered: false, versions: 1, reviewFail: null,
      planText: null, planSnapshotNames: [], questionText: 'Q', finalFileNames: [], hasFinal: false,
    },
    receiptDelivery: null,
    reviewVerdict: 'pass',
    reviewDetail: 'ok',
  })
  const failed = reduceStatusFeed(populated, { kind: 'scan-threw' })
  assert.equal(failed.face, null)
  assert.equal(failed.reads.bundle, 'unreadable')
  assert.equal(failed.reviewVerdict, 'absent')
  assert.equal(failed.reviewDetail, null)
  assert.equal(failed.scanSettled, true)

  const retrying = reduceStatusFeed(failed, { kind: 'retry-requested' })
  assert.equal(retrying.scanSettled, false)

  const reset = reduceStatusFeed(populated, { kind: 'reset-session' })
  assert.deepEqual(reset, INITIAL_STATUS_FEED_STATE)

  const bundledFailed = reduceStatusFeed(populated, {
    kind: 'scan-bundle-failed',
    reads: { ...ABSENT_READS, bundle: 'absent' },
  })
  assert.equal(bundledFailed.reads.bundle, 'absent')
  assert.equal(bundledFailed.face, null)
  assert.equal(bundledFailed.scanSettled, true)
})

test('collectStatusNotices：七路工件异常与 unreadable 单条合并收敛且顺序确定', () => {
  const notices = collectStatusNotices({
    face: {
      questionLine: null, questionIssue: 'body-empty', hasQuestion: false,
      leadsIssue: 'unreadable', findingsIssue: 'empty', evidenceIssue: 'failed-only',
      steps: [], evidenceCount: 0, delivered: false, versions: 0, reviewFail: null,
      planText: null, planSnapshotNames: [], questionText: null, finalFileNames: [], hasFinal: false,
    },
    reads: { ...ABSENT_READS, bundle: 'ok', question: 'ok', review: 'unreadable', plan: 'empty', final: 'unreadable', evidence: 'unreadable' },
    reviewVerdict: 'conflict',
  })
  assert.deepEqual(notices.map((n) => [n.id, n.key]), [
    ['question', 'statusQuestionBodyEmpty'],
    ['leads', 'statusLeadsReadFailed'],
    ['findings', 'statusFindingsEmpty'],
    ['evidence', 'statusEvidenceReadFailed'],
    ['review', 'statusReviewConflict'],
    ['plan', 'statusPlanEmpty'],
    ['final', 'statusFinalDirReadFailed'],
  ])
  assert.equal(receiptIssueKeyOf('invalid'), 'statusReceiptInvalid')
  assert.equal(receiptIssueKeyOf('empty'), 'statusReceiptReadFailed')
  assert.equal(receiptIssueKeyOf('ok'), null)
  assert.equal(planIssueKeyOf('unreadable'), 'statusPlanReadFailed')
})
