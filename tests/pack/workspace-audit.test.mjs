// workspace-audit — preflight 的工作区判据：不能只看“文件在场”，要看它是不是我们的种子、
// 有没有被改过、是不是不可读；untracked 的 AGENTS/NODES/模板必须阻断“就绪”。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { sha256 } from '../../packages/deep-research-pack/scripts/lib/seed-core.mjs'
import { auditWorkspace } from '../../packages/deep-research-pack/scripts/lib/workspace-audit.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-workspace-audit-'))
  t.after(() => {
    try { chmodSync(join(root, 'AGENTS.md'), 0o644) } catch {}
    rmSync(root, { recursive: true, force: true })
  })
  return root
}

const TEXT = {
  'AGENTS.md': '# research manual\n',
  'NODES.md': '# nodes\n',
  '.gitignore': 'drt_*/\n',
  'templates/run/plan.md': '# plan\n',
  'method-library.md': '# my library\n',
}

function seedOf() {
  return {
    version: '0.1.2',
    files: Object.fromEntries(Object.entries(TEXT)
      .filter(([rel]) => rel !== 'method-library.md')
      .map(([rel, text]) => [rel, sha256(text)])),
  }
}

function writeWorkspace(root, { state = true, skip = [], override = {} } = {}) {
  for (const [rel, text] of Object.entries(TEXT)) {
    if (skip.includes(rel)) continue
    const dest = join(root, rel)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, override[rel] ?? text)
  }
  if (state) {
    const seed = seedOf()
    writeFileSync(join(root, '.dsh-research-seed.json'), `${JSON.stringify({
      version: seed.version,
      files: Object.fromEntries(Object.entries(seed.files).filter(([rel]) => !skip.includes(rel))),
      skipped: [],
    }, null, 2)}\n`)
  }
  return seedOf()
}

const blockingRels = (result) => result.blocking.map((item) => item.rel).sort()
const warningRels = (result) => result.warnings.map((item) => item.rel).sort()

test('auditWorkspace：全部 current + 状态一致 → 无阻断', (t) => {
  const root = fixture(t)
  const seed = writeWorkspace(root)
  const result = auditWorkspace({ workspace: root, seed })
  assert.deepEqual(result.blocking, [])
  assert.deepEqual(result.warnings, [])
})

test('auditWorkspace：缺失关键种子 → 阻断', (t) => {
  const root = fixture(t)
  const seed = writeWorkspace(root, { skip: ['AGENTS.md'] })
  const result = auditWorkspace({ workspace: root, seed })
  assert.deepEqual(blockingRels(result), ['AGENTS.md'])
})

test('auditWorkspace：无状态且目标与种子不同 → untracked 阻断（关键种子）', (t) => {
  const root = fixture(t)
  const seed = writeWorkspace(root, { state: false, override: { 'AGENTS.md': '# existing project instructions\n' } })
  const result = auditWorkspace({ workspace: root, seed })
  assert.deepEqual(blockingRels(result), ['AGENTS.md'])
  assert.equal(result.blocking[0].status, 'untracked')
})

test('auditWorkspace：有状态但用户改过 → modified 警告，不阻断', (t) => {
  const root = fixture(t)
  const seed = writeWorkspace(root, { override: { 'AGENTS.md': '# my customized manual\n' } })
  const result = auditWorkspace({ workspace: root, seed })
  assert.deepEqual(result.blocking, [])
  assert.deepEqual(warningRels(result), ['AGENTS.md'])
  assert.equal(result.warnings[0].status, 'modified')
})

test('auditWorkspace：untracked 的 .gitignore 只警告，不阻断研究就绪', (t) => {
  const root = fixture(t)
  const seed = writeWorkspace(root, { state: false, override: { '.gitignore': '# my ignore\n' } })
  const result = auditWorkspace({ workspace: root, seed })
  assert.deepEqual(result.blocking, [])
  assert.ok(warningRels(result).includes('.gitignore'))
})

test('auditWorkspace：目标被目录/symlink 占据 → special 阻断', (t) => {
  const root = fixture(t)
  const seed = writeWorkspace(root, { skip: ['AGENTS.md'] })
  mkdirSync(join(root, 'AGENTS.md'))
  const result = auditWorkspace({ workspace: root, seed })
  assert.deepEqual(blockingRels(result), ['AGENTS.md'])
  assert.equal(result.blocking[0].status, 'special')
})

test('auditWorkspace：不可读目标 → unreadable 阻断，不抛栈', (t) => {
  const root = fixture(t)
  const seed = writeWorkspace(root)
  chmodSync(join(root, 'AGENTS.md'), 0o000)
  const result = auditWorkspace({ workspace: root, seed })
  assert.deepEqual(blockingRels(result), ['AGENTS.md'])
  assert.equal(result.blocking[0].status, 'unreadable')
})

test('auditWorkspace：方法库缺席、版本漂移、sidecar 未合并 → 警告', (t) => {
  const root = fixture(t)
  const seed = writeWorkspace(root, { skip: ['method-library.md'] })
  const state = JSON.parse(readFileSync(join(root, '.dsh-research-seed.json'), 'utf8'))
  state.version = '9.9.9'
  writeFileSync(join(root, '.dsh-research-seed.json'), `${JSON.stringify(state, null, 2)}\n`)
  writeFileSync(join(root, 'AGENTS.md.seed-new'), '# new seed\n')
  const result = auditWorkspace({ workspace: root, seed })
  assert.deepEqual(result.blocking, [])
  assert.ok(result.warnings.some((item) => item.kind === 'method-library-missing'))
  assert.ok(result.warnings.some((item) => item.kind === 'version-mismatch'))
  assert.ok(result.warnings.some((item) => item.kind === 'sidecar'))
})

test('auditWorkspace：state.adopted 的文件即使 seed 变了也按 modified（不是 stale）', (t) => {
  const root = fixture(t)
  const seed = writeWorkspace(root, { override: { 'AGENTS.md': '# my adopted manual\n' } })
  const statePath = join(root, '.dsh-research-seed.json')
  const state = JSON.parse(readFileSync(statePath, 'utf8'))
  state.files['AGENTS.md'] = sha256('# my adopted manual\n')
  state.adopted = ['AGENTS.md']
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`)
  const result = auditWorkspace({ workspace: root, seed })
  assert.deepEqual(result.blocking, [])
  assert.ok(result.warnings.some((item) => item.rel === 'AGENTS.md' && item.status === 'modified'))
})

test('auditWorkspace：state 里有、seed 里没有的孤儿 → 警告', (t) => {
  const root = fixture(t)
  const seed = writeWorkspace(root)
  const statePath = join(root, '.dsh-research-seed.json')
  const state = JSON.parse(readFileSync(statePath, 'utf8'))
  state.files['old-seed.md'] = sha256('old')
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`)
  writeFileSync(join(root, 'old-seed.md'), 'old')
  const result = auditWorkspace({ workspace: root, seed })
  assert.deepEqual(result.blocking, [])
  assert.ok(result.warnings.some((item) => item.kind === 'orphan' && item.rel === 'old-seed.md'))
})

test('审计 findings 带种子所有权：policy 透传，缺省 contract（供 preflight 点名契约漂移）', (t) => {
  const root = fixture(t)
  writeWorkspace(root)
  const seed = seedOf()
  seed.policy = { 'NODES.md': 'corpus', '.gitignore': 'user' }
  const audit = auditWorkspace({ workspace: root, seed })
  const byRel = Object.fromEntries(audit.findings.map((f) => [f.rel, f]))
  assert.equal(byRel['NODES.md'].policy, 'corpus')
  assert.equal(byRel['.gitignore'].policy, 'user')
  assert.equal(byRel['AGENTS.md'].policy, 'contract', '缺省按 contract（保守）')
  const legacy = auditWorkspace({ workspace: root, seed: seedOf() })
  assert.ok(legacy.findings.every((f) => f.policy === 'contract'), '旧清单（无 policy）全部按 contract')
})
