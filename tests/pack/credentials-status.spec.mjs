// credentials-status — preflight 的“研究就绪”不能把空凭据文件当有 key，也不能漏掉 DSH 支持的
// .env 来源。判据与 DSH credentials-local 的分层一致：存储文件 > 启动环境 > 项目 .env > home .env。
// 反证：去掉 refs 非空判断 / 只看文件存在 → 空文件用例红；只查 home → workspace .env 用例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { credentialStatus } from '../../packages/deep-research-pack/scripts/lib/credentials-status.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-credentials-'))
  t.after(() => {
    try { chmodSync(join(root, 'dshhome', '.credentials.yaml'), 0o600) } catch {}
    rmSync(root, { recursive: true, force: true })
  })
  const dshHome = join(root, 'dshhome')
  const workspace = join(root, 'ws')
  mkdirSync(dshHome, { recursive: true })
  mkdirSync(workspace, { recursive: true })
  return { root, dshHome, workspace }
}

const base = (fixture, overrides = {}) => ({
  env: {},
  dshHome: fixture.dshHome,
  workspace: fixture.workspace,
  cwd: fixture.root,
  ...overrides,
})

test('credentialStatus：启动环境里的非空 key 即配置', (t) => {
  const fx = fixture(t)
  const status = credentialStatus(base(fx, { env: { DEEPSEEK_API_KEY: 'sk-live' } }))
  assert.equal(status.ok, true)
  assert.equal(status.source, 'env')
})

test('credentialStatus：空/无 refs 的凭据文件 → false，不冒充已配置', (t) => {
  const fx = fixture(t)
  writeFileSync(join(fx.dshHome, '.credentials.yaml'), '')
  const status = credentialStatus(base(fx))
  assert.equal(status.ok, false)
  assert.match(status.detail, /DEEPSEEK_API_KEY|无 key|空/)
})

test('credentialStatus：refs 下有非空 DEEPSEEK_API_KEY → true', (t) => {
  const fx = fixture(t)
  writeFileSync(join(fx.dshHome, '.credentials.yaml'), [
    'version: 1',
    'refs:',
    '  DEEPSEEK_API_KEY: sk-stored',
    '  OPENAI_API_KEY: sk-other',
    'records: {}',
  ].join('\n'))
  const status = credentialStatus(base(fx))
  assert.equal(status.ok, true)
  assert.equal(status.source, 'credentials')
})

test('credentialStatus：refs 下空值 → false', (t) => {
  const fx = fixture(t)
  writeFileSync(join(fx.dshHome, '.credentials.yaml'), 'version: 1\nrefs:\n  DEEPSEEK_API_KEY:\n')
  const status = credentialStatus(base(fx))
  assert.equal(status.ok, false)
})

test('credentialStatus：workspace/.env 与 home/.env 都是有效来源', (t) => {
  const fx = fixture(t)
  writeFileSync(join(fx.workspace, '.env'), 'DEEPSEEK_API_KEY=sk-workspace\n')
  const fromWorkspace = credentialStatus(base(fx))
  assert.equal(fromWorkspace.ok, true)
  assert.equal(fromWorkspace.source, 'workspace-env')

  rmSync(join(fx.workspace, '.env'))
  writeFileSync(join(fx.dshHome, '.env'), 'DEEPSEEK_API_KEY=sk-home\n')
  const fromHome = credentialStatus(base(fx))
  assert.equal(fromHome.ok, true)
  assert.equal(fromHome.source, 'home-env')
})

test('credentialStatus：只有别的 key/注释 → false', (t) => {
  const fx = fixture(t)
  writeFileSync(join(fx.dshHome, '.env'), '# DEEPSEEK_API_KEY=sk-commented\nOPENAI_API_KEY=sk-other\n')
  const status = credentialStatus(base(fx))
  assert.equal(status.ok, false)
})

test('credentialStatus：不可读凭据文件 → false，不抛栈', (t) => {
  const fx = fixture(t)
  writeFileSync(join(fx.dshHome, '.credentials.yaml'), 'DEEPSEEK_API_KEY: sk-x\n')
  chmodSync(join(fx.dshHome, '.credentials.yaml'), 0o000)
  const status = credentialStatus(base(fx))
  assert.equal(status.ok, false)
  assert.match(status.detail, /不可读|EACCES|无法读取/)
})
