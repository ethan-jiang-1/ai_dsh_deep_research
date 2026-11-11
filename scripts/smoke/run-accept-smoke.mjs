#!/usr/bin/env node
// run-accept-smoke — 交付验收全链的 keyless 回归（合成 bundle + 合成会话日志，真 CLI）。
//
// 证明：run-accept 的「预检 → 门禁/审计落盘 → 回执」在四条路径上符合合同：
//   ① 绝对 present（vendor 真实语义）→ 回执归一为 drt_<slug>/final/vN，path/secret 干净；
//   ② 连续两次绿（幂等）；③ present 指向 bundle 外 → 预检红且不写回执；
//   ④ final 含高置信凭据 → secret-scan 红且不写回执；⑤ --repair 修旧回执后仍绿；
//   ⑥ 整数契约（`schema: 2` + `created`）→ 回执日期取 created、manifest 同时记 schema。
// 不证明：真模型行为、rc.3 客户端（compat-client-smoke）、真实 run 内容。
//
// 用法：node scripts/smoke/run-accept-smoke.mjs
// 退出码：0 全绿；失败时非零退出。
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrubbedEnv } from '../lib/env.mjs'
import { projectionOf } from '../lib/protocol-audit-core.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const CLI = join(ROOT, 'scripts', 'run-ops', 'run-accept.mjs')
const HYGIENE = join(ROOT, 'scripts', 'run-gates', 'path-hygiene.mjs')
const SECRET = join(ROOT, 'scripts', 'run-gates', 'secret-scan.mjs')
const SCHEMA_SCAN = join(ROOT, 'scripts', 'run-gates', 'schema-scan.mjs')
const VERDICT = join(ROOT, 'scripts', 'run-gates', 'verdict-audit.mjs')
const TEMP = join(ROOT, 'runtime', 'smoke-workspace', `run-accept-smoke-${String(process.pid)}`)
const HOME = join(TEMP, 'home')
const WS = join(TEMP, 'ws')
const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}
const T0 = Date.parse('2026-10-24T10:00:00+08:00')
const at = (value, t0 = T0) => ({ ...value, time: t0 + (value.seq ?? 0) * 1000 })
const runNode = (script, args, env) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env, timeout: 180_000 })
const env = () => scrubbedEnv({ DSH_HOME: HOME })

function writeSession(path, slug, cwd, presentPath, t0 = T0) {
  const stamp = (value) => at(value, t0)
  const head = stamp({ type: 'session', version: 4, id: 's', cwd, delegationDepth: 0, agentPreset: 'lead', seq: 0 })
  const ask1 = stamp({ type: 'tool/call', seq: 1, data: { turn: 1, callId: 'ask1', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ id: 'research_type', header: '研究类型', question: '这次研究按哪种类型立项？' }] }) } })
  const write = stamp({ type: 'tool/call', seq: 2, data: { turn: 1, callId: 'w1', name: 'write', arguments: JSON.stringify({ file_path: `drt_${slug}/question.md`, content: '# Q' }) } })
  const ask2 = stamp({ type: 'tool/call', seq: 3, data: { turn: 1, callId: 'ask2', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ id: 'hitl2_delivery', header: '交付审阅（HITL2）', question: `按现稿定稿？drt_${slug}` }] }) } })
  const reply = stamp({ type: 'tool/result', seq: 4, data: { turn: 1, step: 1, message: { role: 'tool', source: { kind: 'tool', callId: 'ask2' }, toolCallId: 'ask2', content: [{ type: 'text', text: JSON.stringify({ answers: [{ id: 'hitl2_delivery', selected: ['按现稿定稿（Recommended）'] }] }) }], isError: false, id: 'r1' } } })
  const present = stamp({ type: 'deliverables/presented', seq: 5, data: { turn: 1, callId: 'p1', files: [{ path: presentPath }] } })
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, [head, ask1, write, ask2, reply, present].map((e) => JSON.stringify(e)).join('\n') + '\n')
}

function writeBundle(slug, presentPath, finalText = '# v1\n\nclean\n', runHead = '- contract: 2026-10-23', type = 'quick_factual') {
  const bundle = join(WS, `drt_${slug}`)
  mkdirSync(join(bundle, 'final'), { recursive: true })
  writeFileSync(join(bundle, 'run.md'), `# Run\n\n${runHead}\n- phase: delivery\n- next: none\n`)
  writeFileSync(join(bundle, 'question.md'), `# Q\n\n## 研究类型\n\n${type}\n\n## Decisions（append-only，最新在上）\n\n- 2026-10-24 HITL2 定稿（delta: 新增；agent interpretation: 按现稿交付）\n`)
  writeFileSync(join(bundle, 'final.md'), finalText)
  writeFileSync(join(bundle, 'final', 'v1.md'), finalText)
  writeFileSync(join(bundle, 'review.md'), '# Review\n\nreadiness: PASS\n')
  writeFileSync(join(bundle, 'audit.md'), `# Evidence Audit — drt_${slug}（2026-10-24T02:00:00.000Z）\n\n## 概要\n\n| 检查 | 结果 |\n|---|---|\n| 发现 | CRITICAL 0 · MAJOR 0 · INFO 0 |\n\n## CRITICAL（伪造链接 / 溯源断链）\n\n（无）\n\n## MAJOR（契约不符 / 转写不符）\n\n（无）\n`)
  const sessions = join(TEMP, 'sessions', slug)
  writeSession(join(sessions, 'sess', 'session.v4.jsonl'), slug, WS, presentPath)
  return { bundle, sessions }
}

function accept(bundle, sessions, extra = []) {
  return runNode(CLI, [bundle, '--sessions', sessions, ...extra], env())
}

/** claim 契约夹具：claims/verdicts + 一个 critic child 会话（preset/depth/parent + 逐字正文）。 */
function writeClaimFixtures(bundle, sessions, { verdict = 'supported' } = {}) {
  const claimText = 'X 在 2026 年降到 0.28 美元'
  const final = `# v1\n\n${claimText}。\n`
  writeFileSync(join(bundle, 'final.md'), final)
  writeFileSync(join(bundle, 'final', 'v1.md'), final)
  writeFileSync(join(bundle, 'review.md'), '# Review\n\n## readiness: PASS\n\n当前裁决 = verdicts-r1.json\n')
  writeFileSync(join(bundle, 'final', 'readable-v1.md'), [
    '# 读者版 — drt_claims',
    '',
    '> 对应 canonical: final/v1.md；以 canonical 为准。',
    '',
    '## 结论',
    'X 在 2026 年降价。',
    '## 为什么',
    '一手来源与独立来源一致。',
    '## 这对你意味着什么',
    '采购成本假设可以下调。',
    '## 什么会改变这个结论',
    '出现新的一手价目或口径变化。',
    '## 目前不能判断',
    '长期价格走势。',
    '## 依据与延伸',
    '依据与延伸见 canonical。',
    '',
  ].join('\n'))
  mkdirSync(join(bundle, 'review'), { recursive: true })
  writeFileSync(join(bundle, 'review', 'claims.json'), `${JSON.stringify({
    version: 1,
    finalRef: 1,
    claims: [{ id: 'C1', text: claimText, critical: true, urls: ['https://a.example/x'] }],
  }, null, 2)}\n`)
  const item = { claim_id: 'C1', verdict, quote: '0.28 美元', reason: '原文一致', rechecked_urls: ['https://a.example/x'], source_tier_ok: true }
  const raw = JSON.stringify([item])
  const verdicts = verdict === 'supported'
    ? [{ ...item, batch: 0 }]
    : []
  writeFileSync(join(bundle, 'review', 'verdicts-r1.json'), `${JSON.stringify({
    version: 1,
    round: 1,
    batches: [{ session: 'kid1', preset: 'critic', depth: 1, raw: verdict === 'supported' ? raw : '[]' }],
    verdicts,
  }, null, 2)}\n`)
  const child = join(sessions, 'children', 'kid1')
  mkdirSync(child, { recursive: true })
  const head = at({ type: 'session', version: 4, id: 'kid1', cwd: WS, delegationDepth: 1, agentPreset: 'critic', parentSession: 's', origin: 'subagent', seq: 0 })
  const call = at({ type: 'tool/call', seq: 1, data: { turn: 1, callId: 'c1', name: 'read', arguments: '{}' } })
  const msg = at({ type: 'assistant/message', seq: 2, data: { turn: 1, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: verdict === 'supported' ? raw : '[]' }] } } })
  writeFileSync(join(child, 'session.v4.jsonl'), [head, call, msg].map((e) => JSON.stringify(e)).join('\n') + '\n')
}

try {
  mkdirSync(HOME, { recursive: true })
  mkdirSync(WS, { recursive: true })

  // ① 绝对 present（bundle 内）→ 归一 + 两次绿
  {
    const { bundle, sessions } = writeBundle('x', '')
    // 重写会话里的 present 为 bundle 内绝对路径（vendor 真实语义）
    writeSession(join(sessions, 'sess', 'session.v4.jsonl'), 'x', WS, join(bundle, 'final', 'v1.md'))
    const first = accept(bundle, sessions)
    check(first.status === 0, '① 绝对 present：run-accept 绿', first.stdout + first.stderr)
    const delivered = JSON.parse(readFileSync(join(bundle, 'delivered.json'), 'utf8'))
    check(delivered.present.path === 'drt_x/final/v1.md', '① 回执 present 归一为 drt_x/final/v1.md', JSON.stringify(delivered.present))
    check(readFileSync(join(bundle, 'acceptance.md'), 'utf8').includes('drt_x/final/v1.md'), '① acceptance 用相对标签')
    check(!JSON.stringify(delivered).includes(WS), '① 回执不含本机绝对路径')
    check(runNode(HYGIENE, [bundle], env()).status === 0, '① path-hygiene 干净')
    check(runNode(SECRET, [bundle], env()).status === 0, '① secret-scan 干净')
    check(JSON.parse(readFileSync(join(bundle, 'manifest.json'), 'utf8')).files.some((f) => f.path === 'delivered.json'), '① manifest 登记 delivered.json')
    const second = accept(bundle, sessions)
    check(second.status === 0, '② 同一 bundle 第二次 run-accept 仍绿（幂等）', second.stdout + second.stderr)
  }

  // ②b --no-write = 真只读；未知参数必须红（此前 --no-write 被静默忽略，实际已写盘）
  {
    const { bundle, sessions } = writeBundle('dry', '')
    writeSession(join(sessions, 'sess', 'session.v4.jsonl'), 'dry', WS, join(bundle, 'final', 'v1.md'))
    const dry = accept(bundle, sessions, ['--no-write'])
    check(dry.status === 0, '②b --no-write 预检绿', dry.stdout.slice(-300))
    check(!existsSync(join(bundle, 'delivered.json')) && !existsSync(join(bundle, 'acceptance.md')) && !existsSync(join(bundle, 'node-gate.md')), '②b --no-write 不写 bundle')
    const typo = accept(bundle, sessions, ['--no-writee'])
    check(typo.status === 2 && /未知参数/.test(typo.stderr), '②b 未知参数 exit 2 并点名', typo.stderr.slice(-300))
    check(!existsSync(join(bundle, 'delivered.json')), '②b 未知参数不写回执')
  }

  // ③ present 指向 bundle 外 → 预检红、不写回执  // ③ present 指向 bundle 外 → 预检红、不写回执
  {
    const { bundle, sessions } = writeBundle('outside', '')
    const outside = join(TEMP, 'elsewhere', 'drt_outside', 'final', 'v1.md')
    mkdirSync(dirname(outside), { recursive: true })
    writeFileSync(outside, '# v1\n')
    writeSession(join(sessions, 'sess', 'session.v4.jsonl'), 'outside', WS, outside)
    const result = accept(bundle, sessions)
    check(result.status === 1, '③ bundle 外 present：预检红', result.stdout.slice(-400))
    check(!existsSync(join(bundle, 'delivered.json')) && !existsSync(join(bundle, 'acceptance.md')), '③ 红跑不写回执')
  }

  // ④ final 含高置信凭据 → secret-scan 红、不写回执
  {
    const key = 'sk-' + 'a'.repeat(32)
    const { bundle, sessions } = writeBundle('secret', '', `# v1\n\n${key}\n`)
    writeSession(join(sessions, 'sess', 'session.v4.jsonl'), 'secret', WS, join(bundle, 'final', 'v1.md'))
    const result = accept(bundle, sessions)
    check(result.status === 1, '④ 交付物含 sk-：预检红', result.stdout.slice(-400))
    check(!existsSync(join(bundle, 'delivered.json')) && !existsSync(join(bundle, 'acceptance.md')), '④ 红跑不写回执')
    check(!result.stdout.includes(key), '④ 扫描输出不回显凭据原文')
  }

  // ⑥ 整数契约：run.md 无 contract，只有 schema + created → 日期取 created、manifest 记版本
  {
    const { bundle, sessions } = writeBundle('schema2', '', '# v1\n\nclean\n', '- schema: 2\n- created: 2026-10-24')
    writeSession(join(sessions, 'sess', 'session.v4.jsonl'), 'schema2', WS, join(bundle, 'final', 'v1.md'))
    const result = accept(bundle, sessions)
    check(result.status === 0, '⑥ schema run：run-accept 绿', result.stdout.slice(-400))
    const manifest = JSON.parse(readFileSync(join(bundle, 'manifest.json'), 'utf8'))
    check(manifest.schema === 2, '⑥ manifest 记 schema=2', JSON.stringify(manifest.schema))
    check(manifest.contract === '2026-10-24', '⑥ manifest 日期取 created（不是空串）', JSON.stringify(manifest.contract))
    check(JSON.parse(readFileSync(join(bundle, 'delivered.json'), 'utf8')).present.path === 'drt_schema2/final/v1.md', '⑥ schema run 回执 present 相对化')
    // repair × 整数契约：把回执写坏成绝对路径后再修——repair 也走 evidence-audit，必须赶在补证据之前。
    const deliveredPath = join(bundle, 'delivered.json')
    const badReceipt = JSON.parse(readFileSync(deliveredPath, 'utf8'))
    badReceipt.present = { ...badReceipt.present, path: join(bundle, 'final', 'v1.md') }
    writeFileSync(deliveredPath, `${JSON.stringify(badReceipt, null, 2)}\n`)
    writeFileSync(join(bundle, 'acceptance.md'), '# Acceptance\n')
    const repaired = accept(bundle, sessions, ['--repair'])
    check(repaired.status === 0, '⑥ repair × schema 仍绿', repaired.stdout.slice(-400))
    check(JSON.parse(readFileSync(deliveredPath, 'utf8')).present.path === 'drt_schema2/final/v1.md', '⑥ repair 后 schema present 相对化')
    check(JSON.parse(readFileSync(join(bundle, 'manifest.json'), 'utf8')).schema === 2, '⑥ repair 不动 manifest 的 schema 快照')

    // schema-scan CLI 的绿面：在验收后补齐"完整 run"必备件（验收前的证据会触发 evidence-audit 对账，
    // 与本断言无关），再让真 CLI 判一次新契约。
    writeFileSync(join(bundle, 'topics.md'), '# Topics\n')
    writeFileSync(join(bundle, 'findings.md'), '# Findings\n')
    mkdirSync(join(bundle, 'evidence'), { recursive: true })
    writeFileSync(join(bundle, 'evidence', 'e1.md'), '---\nsource_url: https://example.com\nretrieved_at: 2026-10-24\nquality: A\nfound_by: scout\nsupports: F1\nsource_tier: primary\npublisher: example.com\n---\n\n> quote\n\n解读\n')
    const scan = runNode(SCHEMA_SCAN, [bundle], env())
    check(scan.status === 0 && /契约期 2026-10-24/.test(scan.stdout), '⑥ schema-scan CLI 认新契约（契约期 = created）', (scan.stdout || '').split('\n').slice(-3).join(' | '))
  }

  // ⑤ --repair：旧回执绝对 present → 修后仍绿
  {
    const { bundle, sessions } = writeBundle('repair', '', '# v1\n\nclean\n')
    writeSession(join(sessions, 'sess', 'session.v4.jsonl'), 'repair', WS, join(bundle, 'final', 'v1.md'))
    writeFileSync(join(bundle, 'delivered.json'), JSON.stringify({
      version: 1, slug: 'drt_repair', present: { path: join(bundle, 'final', 'v1.md'), callId: 'old', version: 1 },
    }, null, 2) + '\n')
    writeFileSync(join(bundle, 'acceptance.md'), '# Acceptance\n')
    writeFileSync(join(bundle, 'node-gate.md'), '# Gate\n')
    const result = accept(bundle, sessions, ['--repair'])
    check(result.status === 0, '⑤ --repair 后 run-accept 绿', result.stdout.slice(-400))
    const delivered = JSON.parse(readFileSync(join(bundle, 'delivered.json'), 'utf8'))
    check(delivered.present.path === 'drt_repair/final/v1.md', '⑤ repair 后 present 相对化', JSON.stringify(delivered.present))
    check(runNode(HYGIENE, [bundle], env()).status === 0, '⑤ repair 后 path-hygiene 干净')
  }
  // ⑦ claim 契约：claims/verdicts + child 会话齐 → 绿，裁决报告落 review/
  {
    const { bundle, sessions } = writeBundle('claims', '', '# v1\n\nclean\n', '- schema: 2\n- created: 2026-10-24', '探索性全景')
    writeSession(join(sessions, 'sess', 'session.v4.jsonl'), 'claims', WS, join(bundle, 'final', 'v1.md'))
    writeClaimFixtures(bundle, sessions)
    const result = accept(bundle, sessions)
    check(result.status === 0, '⑦ claim 契约齐：run-accept 绿', result.stdout.slice(-500))
    check(existsSync(join(bundle, 'review', 'verdict-audit-r1.md')), '⑦ verdict-audit 报告落 review/verdict-audit-r1.md')
    check(readFileSync(join(bundle, 'review', 'verdict-audit-r1.md'), 'utf8').includes('有结论性裁决 1'), '⑦ 报告记录覆盖计数')
  }

  // ⑧ critical 没有裁决 → 预检红、不写回执
  {
    const { bundle, sessions } = writeBundle('gap', '', '# v1\n\nclean\n', '- schema: 2\n- created: 2026-10-24', '探索性全景')
    writeSession(join(sessions, 'sess', 'session.v4.jsonl'), 'gap', WS, join(bundle, 'final', 'v1.md'))
    writeClaimFixtures(bundle, sessions, { verdict: 'none' })
    const result = accept(bundle, sessions)
    check(result.status === 1, '⑧ 覆盖缺口：预检红', result.stdout.slice(-500))
    check(/coverage-gap/.test(result.stdout + result.stderr), '⑧ 红项点名 coverage-gap')
    check(!existsSync(join(bundle, 'delivered.json')) && !existsSync(join(bundle, 'acceptance.md')), '⑧ 红跑不写回执')
  }

  // ⑨ --require 强制新契约面：非 quick_factual 无 claims → 红（epoch 尚未到，run-accept 侧仍豁免）
  {
    const { bundle, sessions } = writeBundle('noclaims', '', '# v1\n\nclean\n', '- schema: 2\n- created: 2026-10-24', '探索性全景')
    writeSession(join(sessions, 'sess', 'session.v4.jsonl'), 'noclaims', WS, join(bundle, 'final', 'v1.md'))
    const exempt = runNode(VERDICT, [bundle, '--sessions', sessions, '--no-write'], env())
    check(exempt.status === 0 && /不适用/.test(exempt.stdout + exempt.stderr), '⑨ 契约日前：无 claims → 不适用（epoch 豁免）', exempt.stdout.slice(-300))
    const forced = runNode(VERDICT, [bundle, '--sessions', sessions, '--no-write', '--require'], env())
    check(forced.status === 1 && /no-claims/.test(forced.stdout), '⑨ --require 强制：缺 claims → no-claims 红', forced.stdout.slice(-400))
  }

  // ⑩ protocol 契约（表达层补篇 / M2）：契约日后带有效 protocol → 绿 + protocol-audit.md；
  //    同形缺 protocol → 预检红（no-protocol），不写回执。
  {
    const quickProtocol = {
      schema: 1, version: 1, status: 'approved', created: '2026-11-13T07:00:00+08:00', approved_at: '2026-11-13T07:10:00+08:00', approval_basis: 'auto',
      method: { id: '事实核查', kind: 'preset', library_name: null, library_fields_sha256: null, fields: { source: '官方页优先', verify: '逐字转写', report: '答案+依据+限制', limit: '不做领域覆盖' }, adjustments: [] },
      source_scope: { families: ['official'], domains: [], exclude_domains: [], recency: '12m', language: ['zh'], authority: 'primary' },
      effort: { band: 'quick', band_v: 1, nodes_max: 6, cells_max: 2, waves_max: 5, allowed_depths: ['L0', 'L1'] },
      output: { shape: 'quick_answer', sections: ['answer', 'basis', 'limits'], length: { min: 300, max: 600, unit: 'words' }, format: 'md', audience: '采购' },
      gates: { hitl1: 'none', hitl2: 'review', evidence_threshold: 'B', critic: 'report', claim_verification: 'on' }, deviations: [],
    }
    const T1 = Date.parse('2026-11-13T09:00:00+08:00')
    const { bundle, sessions } = writeBundle('proto', '', '# v1\n\nclean\n', '- schema: 2\n- created: 2026-11-13', 'quick_factual')
    writeSession(join(sessions, 'sess', 'session.v4.jsonl'), 'proto', WS, join(bundle, 'final', 'v1.md'), T1)
    writeFileSync(join(bundle, 'protocol.json'), `${JSON.stringify(quickProtocol, null, 2)}\n`)
    writeFileSync(join(bundle, 'question.md'), `${readFileSync(join(bundle, 'question.md'), 'utf8')}\n## 研究方法（本次实际采用）\n\n- 采用: 事实核查（自动采用）\n\n${projectionOf(quickProtocol)}\n`)
    const ok = accept(bundle, sessions)
    check(ok.status === 0, '⑩ 契约日后有效 protocol：run-accept 绿', ok.stdout.slice(-500))
    check(existsSync(join(bundle, 'protocol-audit.md')), '⑩ protocol-audit.md 落盘')
    check(/^v1 design_sha256=[0-9a-f]{64}$/m.test(readFileSync(join(bundle, 'protocol-audit.md'), 'utf8')), '⑩ 报告含 v1 版本指纹行')

    // 改一个字节 → protocol-changed 红（版本指纹不是装饰；CLI 级反证）。
    const mutated = JSON.parse(readFileSync(join(bundle, 'protocol.json'), 'utf8'))
    mutated.output.audience = 'CFO'
    writeFileSync(join(bundle, 'protocol.json'), `${JSON.stringify(mutated, null, 2)}\n`)
    const drift = runNode(join(ROOT, 'scripts', 'run-gates', 'protocol-audit.mjs'), [bundle, '--no-write'], env())
    check(drift.status === 1 && /protocol-changed/.test(drift.stdout), '⑩ 改一个字节：protocol-changed 红', drift.stdout.slice(-300))

    const missing = writeBundle('proto-missing', '', '# v1\n\nclean\n', '- schema: 2\n- created: 2026-11-13', 'quick_factual')
    writeSession(join(missing.sessions, 'sess', 'session.v4.jsonl'), 'proto-missing', WS, join(missing.bundle, 'final', 'v1.md'), T1)
    const red = accept(missing.bundle, missing.sessions)
    check(red.status === 1, '⑩ 契约日后缺 protocol：预检红', red.stdout.slice(-500))
    check(/no-protocol/.test(red.stdout + red.stderr), '⑩ 红项点名 no-protocol')
    check(!existsSync(join(missing.bundle, 'delivered.json')) && !existsSync(join(missing.bundle, 'protocol-audit.md')), '⑩ 红跑不写回执/报告')
  }

} catch (error) {
  check(false, 'smoke 未抛异常', String(error))
} finally {
  if (failures.length === 0) rmSync(TEMP, { recursive: true, force: true })
  else console.error(`run-accept-smoke: 失败现场保留：${TEMP}`)
}

if (failures.length > 0) {
  console.error(`\nrun-accept-smoke: ${String(failures.length)} 项失败`)
  process.exit(1)
}
console.log('\nrun-accept-smoke: ALL PASS（回执归一/幂等/外部 present/秘密/repair/整数契约 + schema-scan CLI + claim 契约绿/覆盖缺口红/--require 强制 + protocol 绿/缺工件红）')
process.exit(0)
