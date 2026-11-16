// release-anchor — 发布/移交锚的变异矩阵。
//
// 事故形态（2026-11-15 接手诊断）：0.3.4 tag 在 ec652a30（manual sha f41a6b），
// 但工作树的 0.3.4 `_dist` 制品由 HEAD 在次日重建（manual sha eed98）。`release-check`
// 只看 HEAD 是否打了同名 tag；`dist-tarball` 只看手册 sha = 制品 sha。两边各自绿，
// tag 与制品却从未被配对。本测试把配对判据钉成变异矩阵：每个输入错位都必须点名。
//
// 反证：本文件先于 `checks/lib/repo/release-anchor.mjs` 落地时红（模块缺席）；实现后绿。
// 真实世界红证 = `node checks/release/release-check.mjs --handoff` 在 0.3.4 树上失败
// （tag 不指向 HEAD + 手册 sha 与 tag 制品不一致），0.3.5 锚定后绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateHandoff, evaluateRelease, problemCodes } from '../../checks/lib/repo/release-anchor.mjs'

const SHA_A = 'a'.repeat(64)
const SHA_B = 'b'.repeat(64)
const COMMIT_A = '1'.repeat(40)
const COMMIT_B = '2'.repeat(40)

const validHandoff = {
  version: '0.3.5',
  tag: '0.3.5',
  tagType: 'tag',
  tagCommit: COMMIT_A,
  headCommit: COMMIT_A,
  worktreeClean: true,
  tarballSha: SHA_A,
  manualSha: SHA_A,
  manualVersion: '0.3.5',
  manifestSha: SHA_A,
  artifactFresh: true,
}

test('handoff：全对齐接受', () => {
  assert.deepEqual(evaluateHandoff(validHandoff), [])
})

test('handoff：tag 缺席 / 不指向 HEAD / lightweight 各自点名', () => {
  assert.ok(problemCodes(evaluateHandoff({ ...validHandoff, tag: null })).includes('handoff-tag-missing'))
  assert.ok(problemCodes(evaluateHandoff({ ...validHandoff, tagCommit: COMMIT_B })).includes('handoff-tag-not-head'))
  assert.ok(problemCodes(evaluateHandoff({ ...validHandoff, tagType: 'commit' })).includes('handoff-tag-not-annotated'))
})

test('handoff：手册 sha / manifest sha / 源指纹 / 工作树任一错位即红', () => {
  assert.ok(problemCodes(evaluateHandoff({ ...validHandoff, manualSha: SHA_B })).includes('handoff-manual-sha-mismatch'))
  assert.ok(problemCodes(evaluateHandoff({ ...validHandoff, manifestSha: SHA_B })).includes('handoff-manifest-sha-mismatch'))
  assert.ok(problemCodes(evaluateHandoff({ ...validHandoff, artifactFresh: false })).includes('handoff-artifact-stale'))
  assert.ok(problemCodes(evaluateHandoff({ ...validHandoff, worktreeClean: false })).includes('handoff-worktree-dirty'))
})

test('handoff：handoff receiver 只查 tag/manual/tarball/manifest，不重算源指纹', () => {
  assert.deepEqual(evaluateHandoff({ ...validHandoff, mode: 'receiver', artifactFresh: null }), [])
  assert.ok(problemCodes(evaluateHandoff({ ...validHandoff, mode: 'receiver', artifactFresh: null, manualSha: SHA_B })).includes('handoff-manual-sha-mismatch'))
  assert.ok(problemCodes(evaluateHandoff({ ...validHandoff, artifactFresh: false })).includes('handoff-artifact-stale'))
})

test('handoff：手册版本漂移 / 制品缺席不得静默', () => {
  assert.ok(problemCodes(evaluateHandoff({ ...validHandoff, manualVersion: '0.3.4' })).includes('handoff-manual-version-mismatch'))
  assert.ok(problemCodes(evaluateHandoff({ ...validHandoff, tarballSha: null })).includes('handoff-tarball-missing'))
  assert.ok(problemCodes(evaluateHandoff({ ...validHandoff, manualSha: null, manualVersion: null })).includes('handoff-manual-missing'))
  assert.ok(problemCodes(evaluateHandoff({ ...validHandoff, manifestSha: null })).includes('handoff-manifest-missing'))
})

test('release：root/pack 漂移、HEAD tag 同名与 annotated 各自点名', () => {
  assert.deepEqual(evaluateRelease({ rootVersion: '0.3.5', packVersion: '0.3.5', headTag: '0.3.5', headTagType: 'tag' }), [])
  assert.ok(problemCodes(evaluateRelease({ rootVersion: '0.3.4', packVersion: '0.3.5' })).includes('release-version-drift'))
  assert.ok(problemCodes(evaluateRelease({ rootVersion: '0.3.5', packVersion: '0.3.5', headTag: '0.3.4', headTagType: 'tag' })).includes('release-head-tag-version-mismatch'))
  assert.ok(problemCodes(evaluateRelease({ rootVersion: '0.3.5', packVersion: '0.3.5', headTag: '0.3.5', headTagType: 'commit' })).includes('release-head-tag-not-annotated'))
  assert.ok(problemCodes(evaluateRelease({ rootVersion: '0.3', packVersion: '0.3' })).includes('release-root-version-invalid'))
})
