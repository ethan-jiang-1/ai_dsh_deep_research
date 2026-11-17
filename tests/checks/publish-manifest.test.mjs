// publish-manifest.test.mjs — 发布 manifest 剥离的纯函数矩阵（BUG-236）。
//
// 负例留证 2026-11-17：BUG-236——把 devDependencies 留在发布 manifest → pack.e2e 的
// 「tarball manifest 无 devDependencies / 无 workspace 协议」红；stripDevDependencies 的用例同时钉住
// 「其余字段原样保留、入参不被改动」。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stripDevDependencies, workspaceProtocolIssues } from '../../checks/lib/repo/publish-manifest.mjs'

test('剥离 devDependencies：其余字段保序保留，入参不改（BUG-236）', () => {
  const source = {
    name: 'dsh-deep-research-pack',
    version: '0.3.6',
    files: ['lib/*.js'],
    peerDependencies: { react: '^18.2.0' },
    devDependencies: { '@deepseek-ai/dsh-session': 'workspace:*' },
  }
  const stripped = stripDevDependencies(source)
  assert.equal('devDependencies' in stripped, false)
  assert.deepEqual(Object.keys(stripped), ['name', 'version', 'files', 'peerDependencies'])
  assert.equal('devDependencies' in source, true, '入参不可被改动（导出方还要写回源）')
})

test('协议检查：workspace: 在任一依赖字段都点名', () => {
  assert.deepEqual(workspaceProtocolIssues({ peerDependencies: { react: '^18.2.0' } }), [])
  const issues = workspaceProtocolIssues({
    dependencies: { a: 'workspace:*' },
    devDependencies: { b: 'workspace:^' },
  })
  assert.equal(issues.length, 2)
  assert.ok(issues.every((issue) => issue.includes('workspace 协议')))
})
