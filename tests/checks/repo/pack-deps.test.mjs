// pack-deps.test.mjs — 发布物依赖闭包判据的纯函数矩阵（BUG-229 / 232 / 238）。
//
// 边界：真实 require/import 的抽取对象是构建产物（lib/），keyless 回归无 lib/ → 真产物判据住
// checks/smoke/pack.e2e.mjs；本文件钉纯函数（包名归一、正/反向、版本范围）与 manifest 不动量。
//
// 负例留证 2026-11-17：BUG-229 / BUG-232 / BUG-238——把 `react` 从 peers 删掉（正向用例红）、
// 注入一个未声明 require（正向红）、留一个无消费方的 peer（反向红）、把 DSH 组 peer 改成 `^0.3.0`
// （范围红）；还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  declaredNamesOf, externalImportsOf, forwardDepIssues, packageNameOf, peerRangeIssues,
  requiresOf, unusedPeerIssues,
} from '../../../checks/lib/repo/pack-deps.mjs'

const PKG = JSON.parse(readFileSync(new URL('../../../packages/deep-research-pack/package.json', import.meta.url), 'utf8'))

test('包名归一：scoped / 子路径 / 相对 / node:（BUG-232 纯函数）', () => {
  assert.equal(packageNameOf('react'), 'react')
  assert.equal(packageNameOf('react/jsx-runtime'), 'react')
  assert.equal(packageNameOf('@deepseek-ai/dsh-tools/sub/path'), '@deepseek-ai/dsh-tools')
  assert.equal(packageNameOf('./chunk.js'), null)
  assert.equal(packageNameOf('node:crypto'), null)
  assert.equal(packageNameOf('@scope'), null)
})

test('抽取器：JS require / d.ts external import / YAML 点名（BUG-232）', () => {
  const requires = requiresOf("const a = require('react')\nconst b = require('./chunk.js')\nconst c = require('@deepseek-ai/dsh-tools')")
  assert.deepEqual(requires.map((entry) => entry.name), ['react', '@deepseek-ai/dsh-tools'])
  const imports = externalImportsOf("import type { A } from '@deepseek-ai/cordis'\nimport { b } from './local.ts'\n")
  assert.deepEqual(imports.map((entry) => entry.name), ['@deepseek-ai/cordis'])
  const yaml = "name: '@deepseek-ai/dsh-agent-preset'\n  # @deepseek-ai/ignored-comment\n  name: cordis\n  plugins: [x]\n"
  assert.deepEqual([...declaredNamesOf(yaml)].sort(), ['@deepseek-ai/dsh-agent-preset', 'cordis'])
})

test('正向：发布物 require/import ⊆ peers（BUG-229/232）', () => {
  const peers = { react: '^18.2.0' }
  assert.deepEqual(forwardDepIssues({ peers, requires: [{ spec: 'react/jsx-runtime' }] }), [])
  const issues = forwardDepIssues({ peers, requires: [{ spec: 'react-dom' }], imports: [{ spec: '@deepseek-ai/cordis' }] })
  assert.equal(issues.length, 2)
  assert.ok(issues.every((issue) => issue.includes('不在 peerDependencies')))
})

test('反向：非 host-row peer 必须被用到或在随包 YAML 里点名（BUG-232）', () => {
  const peers = { react: '^18.2.0', 'left-pad': '^1.0.0', '@deepseek-ai/dsh-tools': '1' }
  assert.deepEqual(unusedPeerIssues({ peers, requires: [{ spec: 'react' }] }),
    ['peerDependency「left-pad」既没被发布物 require/import，也没在随包 YAML 行里点名——死 peer（删掉或补消费方）'])
  assert.deepEqual(unusedPeerIssues({ peers, requires: [{ spec: 'react' }], declaredYaml: new Set(['left-pad']) }), [])
})

test('版本：DSH-tag 组 peer 必须与 engines.dsh 同一范围（BUG-238）', () => {
  const ok = { engines: { dsh: '>=0.2.1-rc.2 <=0.2.1-rc.5' }, peerDependencies: { '@deepseek-ai/dsh-tools': '>=0.2.1-rc.2 <=0.2.1-rc.5', '@deepseek-ai/cordis': '^4.0.5' } }
  assert.deepEqual(peerRangeIssues(ok), [])
  const bad = { engines: { dsh: '>=0.2.1-rc.2 <=0.2.1-rc.5' }, peerDependencies: { '@deepseek-ai/dsh-tools': '^0.3.0' } }
  assert.ok(peerRangeIssues(bad).some((issue) => issue.includes('≠ engines.dsh')))
  assert.deepEqual(peerRangeIssues({ engines: {}, peerDependencies: {} }), ['pkg.engines.dsh 缺席——版本合同没有可对账的正本'])
})

test('真实 manifest：React peer 在场、DSH-tag 范围 = engines.dsh（BUG-229/238）', () => {
  for (const name of ['react', 'react-dom']) {
    assert.ok(Object.hasOwn(PKG.peerDependencies, name), `${name} 必须在 peerDependencies（client bundle 运行时 require）`)
  }
  assert.deepEqual(peerRangeIssues(PKG), [], 'DSH-tag peer 范围必须等于 engines.dsh')
  assert.equal(PKG.engines.dsh, '>=0.2.1-rc.2 <=0.2.1-rc.5')
})
