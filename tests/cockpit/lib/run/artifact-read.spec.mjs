// artifact-read 回归 — 观察面工件五态与唯一读取器（keyless 纯函数 + 假 view）。
// 反证口径：0 字节 question/review/final、坏 JSON 回执、truncated 都不得落 ok/absent；
// 未登记工件不得猜策略（invalid），否则新读取点又会静默折平（BUG-361…368 的类）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ARTIFACT_POLICY, artifactBodyIssueOf, artifactPolicyOf, artifactReadIssueOf, artifactStateOf, assertNever, readArtifact, readStateOf,
} from '../../../../packages/deep-research-pack/src/lib/run/artifact-read.ts'
import { openRun, readPolicyOf } from '../../../../packages/deep-research-pack/src/lib/run/run-context.ts'
import { readProtocolContract } from '../../../../packages/deep-research-pack/src/lib/run/protocol-fold.ts'

const POLICY = { nonEmpty: true, json: false }
const OUT = (text, extra = {}) => ({ ok: true, value: { text, ...extra } })
const MISSING = { ok: false, reason: 'missing' }
const UNREADABLE = { ok: false, reason: 'unreadable' }

test('readStateOf：null/missing = absent；ok = ok；unreadable 原样', () => {
  assert.equal(readStateOf(null), 'absent')
  assert.equal(readStateOf({ ok: true }), 'ok')
  assert.equal(readStateOf(MISSING), 'absent')
  assert.equal(readStateOf(UNREADABLE), 'unreadable')
  assert.equal(readStateOf({ ok: false }), 'unreadable')
})

test('artifactStateOf：outcome × 空/非空/truncated × policy → 五态', () => {
  assert.equal(artifactStateOf(null, POLICY), 'absent')
  assert.equal(artifactStateOf(MISSING, POLICY), 'absent')
  assert.equal(artifactStateOf(UNREADABLE, POLICY), 'unreadable')
  assert.equal(artifactStateOf(OUT('内容'), POLICY), 'ok')
  assert.equal(artifactStateOf(OUT(''), POLICY), 'empty', '0 字节非空工件 = empty')
  assert.equal(artifactStateOf(OUT('  \n\t'), POLICY), 'empty', '纯空白 = empty')
  assert.equal(artifactStateOf(OUT('内容', { truncated: true }), POLICY), 'unreadable', 'truncated = 未读全，不是 ok')
  assert.equal(artifactStateOf(OUT(''), { nonEmpty: false, json: false }), 'ok', '允许空的工件（plan）空 = ok')
  assert.equal(artifactStateOf(OUT('内容'), null), 'invalid', '未登记策略 = invalid，不猜')
})

test('artifactPolicyOf：固定表 + final 动态名；未知 = null', () => {
  for (const name of ['question.md', 'review.md', 'review/readiness.json', 'delivered.json', 'plan.md', 'final.md', 'final/readable.md']) {
    assert.ok(artifactPolicyOf(name) !== null, `缺策略 ${name}`)
    assert.ok(Object.hasOwn(ARTIFACT_POLICY, name), `固定表缺 ${name}`)
  }
  assert.deepEqual(artifactPolicyOf('plan/v1.md'), { nonEmpty: true, json: false })
  assert.deepEqual(artifactPolicyOf('evidence/card.md'), { nonEmpty: true, json: false })
  assert.equal(artifactPolicyOf('evidence/_failed.md')?.nonEmpty, true)
  assert.deepEqual(artifactPolicyOf('final/v1.md'), { nonEmpty: true, json: false })
  assert.deepEqual(artifactPolicyOf('final/readable-v2.md'), { nonEmpty: true, json: false })
  assert.equal(artifactPolicyOf('final/v0.md'), null)
  assert.equal(artifactPolicyOf('delivered.json.bak'), null)
  assert.equal(artifactPolicyOf('notes/final.md'), null)
})

test('readArtifact：question 空/读失败；回执 JSON 强制 decoder 且 schema 不符 fail-closed；未登记不读', async () => {
  const calls = []
  const view = (outcome) => ({ read: async (name) => { calls.push(name); return outcome } })
  const receiptDecoder = (raw) => (raw && raw.version === 1 ? { ok: true, value: raw } : { ok: false, detail: 'bad' })
  assert.deepEqual(await readArtifact(view(OUT('Q')), 'question.md'), { state: 'ok', text: 'Q' })
  assert.deepEqual(await readArtifact(view(OUT('')), 'question.md'), { state: 'empty', text: null })
  assert.deepEqual(await readArtifact(view(UNREADABLE), 'question.md'), { state: 'unreadable', text: null })
  assert.deepEqual(await readArtifact(view(OUT('')), 'plan.md'), { state: 'empty', text: null })
  const receipt = { version: 1, slug: 'drt_x', acceptedAt: 't', gate: { status: 'PASS' } }
  assert.deepEqual(
    await readArtifact(view(OUT(JSON.stringify(receipt))), 'delivered.json', { decoder: receiptDecoder }),
    { state: 'ok', text: JSON.stringify(receipt), value: receipt },
  )
  assert.deepEqual(
    await readArtifact(view(OUT(JSON.stringify({ version: 99 }))), 'delivered.json', { decoder: receiptDecoder }),
    { state: 'invalid', text: null, value: null },
  )
  assert.deepEqual(
    await readArtifact(view(OUT('{bad json')), 'delivered.json', { decoder: receiptDecoder }),
    { state: 'invalid', text: null, value: null },
  )
  assert.deepEqual(
    await readArtifact(view(OUT('{"version":1}')), 'review/readiness.json', { decoder: (raw) => ({ ok: true, value: raw }) }),
    { state: 'ok', text: '{"version":1}', value: { version: 1 } },
  )
  // 运行期防绕过：未传 decoder 读 JSON 工件强制 fail-closed 为 invalid
  assert.deepEqual(
    await readArtifact(view(OUT(JSON.stringify(receipt))), 'delivered.json'),
    { state: 'invalid', text: null, value: null },
  )
  calls.length = 0
  assert.deepEqual(await readArtifact(view(OUT('x')), 'unknown.md'), { state: 'invalid', text: null })
  assert.deepEqual(calls, [], '未登记工件不得发起读取')
})

// 负例留证 2026-11-23：G21 跨面读取点清单——status/final/graph/config 已全部收口至 readArtifact。
// 新增任何裸 view.read 会让本清单多出一项 → 红。
test('G21 cockpit canonical 读取点清单：裸 view.read 已清零（0 处逃逸）', async () => {
  const { readFileSync, readdirSync } = await import('node:fs')
  const { join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const root = fileURLToPath(new URL('../../../../packages/deep-research-pack/src/client/', import.meta.url))
  const counts = {}
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) { walk(p); continue }
      if (!/\.(ts|tsx)$/.test(ent.name)) continue
      const hits = (readFileSync(p, 'utf8').match(/\bview\.read\(/g) ?? []).length
      if (hits > 0) counts[p.slice(root.length)] = hits
    }
  }
  walk(root)
  assert.deepEqual(counts, {})
})

test('artifactReadIssueOf / artifactBodyIssueOf / assertNever：闭集五态穷举不漏 invalid', () => {
  assert.equal(artifactReadIssueOf('ok'), null)
  assert.equal(artifactReadIssueOf('absent'), null)
  assert.equal(artifactReadIssueOf('empty'), 'empty')
  assert.equal(artifactReadIssueOf('unreadable'), 'unreadable')
  assert.equal(artifactReadIssueOf('invalid'), 'unreadable')

  assert.equal(artifactBodyIssueOf('ok', true), null)
  assert.equal(artifactBodyIssueOf('ok', false), 'body-empty')
  assert.equal(artifactBodyIssueOf('absent', false), null)
  assert.equal(artifactBodyIssueOf('empty', false), 'empty')
  assert.equal(artifactBodyIssueOf('unreadable', false), 'unreadable')
  assert.equal(artifactBodyIssueOf('invalid', false), 'unreadable')

  assert.throws(() => assertNever(/** @type {never} */ ('bogus')), /Unexpected union member: bogus/)
})

// 负例留证 2026-11-27：BUG-436——run-context EOF_NAME 漏掉 protocol.json / topics.md / review/claims.json /
// review/verdicts-r<N>.json，导致模板（52 行）超过 DEFAULT_LINES=40 被截断判为 unreadable。
// 红配方：从 EOF_NAME 移除 protocol\.json 或 topics\.md → 下方 readPolicyOf 与 52 行模板读测均红。
test('BUG-436 readPolicyOf：全部 canonical 工件（含 protocol.json / topics.md / claims / verdicts）读到 eof，不落入 40 行截断', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  for (const name of [
    'protocol.json',
    'topics.md',
    'review/claims.json',
    'review/verdicts-r1.json',
    'review/verdicts-r2.json',
    'claims.json',
    'verdicts.json',
  ]) {
    assert.equal(readPolicyOf(name), 'eof', `${name} 必须走 eof 策略，不能截断成 40 行`)
    assert.ok(artifactPolicyOf(name) !== null, `${name} 必须登记在 artifactPolicyOf`)
  }
  for (const name of Object.keys(ARTIFACT_POLICY)) {
    if (name === 'plan.md') continue
    assert.equal(readPolicyOf(name), 'eof', `ARTIFACT_POLICY.${name} 必须与 EOF_NAME 同步`)
  }
  // 真实 52 行模板协议经 40 行上限拦截源读取时，必须走 eof 页读而不被截断
  const tplPath = fileURLToPath(new URL('../../../../packages/deep-research-pack/content/templates/run/protocol.json', import.meta.url))
  const tplText = readFileSync(tplPath, 'utf8')
  const tplLines = tplText.split('\n')
  assert.ok(tplLines.length > 40, `protocol.json 模板应超过 40 行（实际 ${tplLines.length}）`)
  const cappedSource = {
    list: async (dir) => (dir === 'drt_demo' ? { ok: true, value: [{ name: 'protocol.json', type: 'file' }] } : { ok: false, reason: 'missing' }),
    read: async (_path, { offset, limit }) => {
      const slice = tplLines.slice(offset - 1, offset - 1 + limit)
      const eof = offset - 1 + slice.length >= tplLines.length
      return { ok: true, value: { text: slice.join('\n'), lines: slice.length, eof } }
    },
    version: async () => ({ ok: true, value: 'v1' }),
  }
  const opened = await openRun(cappedSource, 'drt_demo')
  assert.equal(opened.ok, true)
  const res = await readProtocolContract(opened.value)
  assert.equal(res.state, 'ok', '超过 40 行的真实 protocol.json 不得因截断误判为 unreadable')
  assert.equal(res.value?.status, 'draft')
})
