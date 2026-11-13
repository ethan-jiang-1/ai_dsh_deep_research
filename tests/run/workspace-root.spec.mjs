// workspace-root — dev 工作区根解析 + vendor 同形 projectKey + 会话组解析。
// 反证：删掉分隔符合并 / 删掉非 ASCII 转义 / 删掉 legacy 回退 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  defaultDevWorkspace, groupForWorkspace, projectGroupDir, projectKey, workspaceName, workspaceRoot,
} from '../../scripts/lib/workspace-root.mjs'

test('projectKey：spike 路径 / 空格 / 非 ASCII / 连续分隔符 / 长路径', () => {
  assert.equal(projectKey('/private/tmp/dsh-product-boot/ws'), '--private-tmp-dsh-product-boot-ws--')
  assert.equal(projectKey('/Users/me/My Work'), '--Users-me-My~0020Work--')
  assert.equal(projectKey('/data/中文'), '--data-~4E2D~6587--')
  assert.equal(projectKey('/a//b\\\\c:d'), '--a-b-c-d--')
  const long = `/${'x'.repeat(400)}`
  const key = projectKey(long)
  assert.equal(key.length, 2 + 251 + 2)
  assert.equal(key.endsWith('--'), true)
})

test('projectKey：空/根/特殊字符', () => {
  assert.throws(() => projectKey(''), /non-empty/)
  assert.equal(projectKey('//'), '--root--')
  assert.equal(projectKey('/a/~b'), '--a-~007Eb--')
})

test('projectGroupDir / groupForWorkspace：projectKey 优先、legacy 回退', () => {
  const sessions = mkdtempSync(join(tmpdir(), 'dr-groups-'))
  try {
    const ws = join(sessions, '..', 'ws')
    const key = projectKey(ws)
    assert.equal(projectGroupDir(sessions, ws), join(sessions, key))
    assert.equal(groupForWorkspace({ sessionsRoot: sessions, workspace: ws }), null)
    mkdirSync(join(sessions, key), { recursive: true })
    assert.equal(groupForWorkspace({ sessionsRoot: sessions, workspace: ws }), key)
    const other = mkdtempSync(join(tmpdir(), 'dr-legacy-'))
    try {
      mkdirSync(join(other, '--Users-x-research-workspace--'), { recursive: true })
      assert.equal(groupForWorkspace({ sessionsRoot: other, workspace: join(other, 'ws') }), '--Users-x-research-workspace--')
    } finally {
      rmSync(other, { recursive: true, force: true })
    }
  } finally {
    rmSync(sessions, { recursive: true, force: true })
  }
})

test('workspaceRoot：flag > DSH_RUN_WORKSPACE > DEEP_RESEARCH_WORKSPACE > default', () => {
  const defaultRoot = '/repo/research-workspace'
  assert.equal(workspaceRoot({ argv: ['--workspace', '/flag'], env: {}, defaultRoot }).root, '/flag')
  assert.equal(workspaceRoot({ argv: ['--workspace=/eq'], env: {}, defaultRoot }).root, '/eq')
  assert.equal(workspaceRoot({ argv: [], env: { DSH_RUN_WORKSPACE: '/env' }, defaultRoot }).root, '/env')
  assert.equal(workspaceRoot({ argv: [], env: { DEEP_RESEARCH_WORKSPACE: '/product' }, defaultRoot }).root, '/product')
  assert.deepEqual(workspaceRoot({ argv: [], env: {}, defaultRoot }), { root: defaultRoot, source: 'default' })
})

test('workspaceName/defaultDevWorkspace：无根目录也返回可读名', () => {
  assert.equal(workspaceName('/a/b/c'), 'c')
  assert.equal(defaultDevWorkspace('/repo'), '/repo/research-workspace')
})
