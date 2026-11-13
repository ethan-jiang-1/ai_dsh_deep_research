// node-gate-helpers.mjs — node-gate 测试共享的夹具定位与临时 bundle 助手。
// 非测试文件（默认 glob 只选 *.spec.mjs）；三件测试共用同一套路径/断代/审计摘要。
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const FX = join(HERE, '..', 'fixtures', 'node-gate')
export const bundle = (name) => join(FX, 'bundles', name)
export const sessions = (name) => join(FX, 'sessions', name)

// 断代与宿主 mtime 解耦：显式注入各门契约日之前一天（2026-10-25 clean-worktree 实证）。
export const PRE_CONTRACT_DATES = {
  hitlDate: '2026-10-04',
  leadsDate: '2026-10-02',
  versionDate: '2026-10-02',
  headingDate: '2026-10-05',
  auditDate: '2026-10-07',
  readerDate: '2026-10-22',
}

export const structuredAudit = (slug, criticalCount = 0, criticalBody = '（无）') => `# Evidence Audit — ${slug}（2026-10-08T00:00:00.000Z）

## 概要

| 检查 | 结果 |
|---|---|
| 发现 | CRITICAL ${criticalCount} · MAJOR 0 · INFO 0 |

## CRITICAL（伪造链接 / 溯源断链）

${criticalBody}

## MAJOR（契约不符 / 转写不符）

（无）
`

export const withCompleteBundle = (run) => {
  const tempBase = realpathSync(tmpdir())
  const tempRoot = mkdtempSync(join(tempBase, 'node-gate-test-'))
  const tempBundle = join(tempRoot, 'fixture-complete')
  cpSync(bundle('fixture-complete'), tempBundle, { recursive: true })
  try { return run(tempBundle) } finally {
    if (dirname(tempRoot) !== tempBase || !basename(tempRoot).startsWith('node-gate-test-')) {
      throw new Error(`refusing cleanup outside node-gate temp: ${tempRoot}`)
    }
    rmSync(tempRoot, { recursive: true, force: true })
  }
}

/** 新契约（有 run.md）的完整见证会话：绑定写 + HITL1 + HITL2 ask/答复 + present。 */
export const newContractSession = (root, slug = 'x', { withPresent = true } = {}) => {
  const T = Date.parse('2026-10-23T10:00:00+08:00')
  const at = (obj, time = T) => JSON.stringify({ ...obj, time })
  const dir = join(root, 'sessions', 'sess')
  mkdirSync(dir, { recursive: true })
  const lines = [
    at({ type: 'session', version: 4, id: 's', cwd: '/x', delegationDepth: 0, agentPreset: 'lead' }),
    at({ type: 'tool/call', data: { turn: 1, callId: 'w1', name: 'write', arguments: JSON.stringify({ file_path: `drt_${slug}/question.md`, content: '# Q' }) } }),
    at({ type: 'tool/call', data: { turn: 1, callId: 'ask-h1', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ id: 'research_type', header: '研究类型', question: '这次研究按哪种类型立项？', options: [{ label: '快速事实核查（Recommended）' }] }] }) } }),
    at({ type: 'tool/call', data: { turn: 1, callId: 'ask-h2', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ id: 'hitl2_delivery', header: '交付审阅（HITL2）', question: `按现稿定稿？drt_${slug}` }] }) } }),
    at({ type: 'agent/inbox/spliced', data: { inserted: [{ source: { kind: 'user-question-reply', callId: 'ask-h2', outcome: 'answered' }, content: [{ type: 'text', text: JSON.stringify({ answers: [{ id: 'hitl2_delivery', selected: ['定稿（按现稿交付）'] }] }) }] }] } }, T + 60_000),
  ]
  if (withPresent) lines.push(at({ type: 'deliverables/presented', data: { turn: 1, callId: 'p1', files: [{ path: `drt_${slug}/final/v1.md` }] } }, T + 120_000))
  writeFileSync(join(dir, 'session.jsonl'), lines.join('\n') + '\n')
  return join(root, 'sessions')
}
