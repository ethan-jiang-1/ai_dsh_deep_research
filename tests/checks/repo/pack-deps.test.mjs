// pack-deps.test.mjs — 发布物依赖闭包判据的纯函数矩阵（BUG-229 / 232 / 238 / 246 / 247）。
//
// 边界：真实 require/import 的抽取对象是构建产物（lib/），keyless 回归无 lib/ → 真产物判据住
// checks/smoke/pack.e2e.mjs；本文件钉纯函数（包名归一、正/反向、版本范围、host allowlist）与 manifest 不动量。
//
// 负例留证 2026-11-17：BUG-229 / BUG-232 / BUG-238——把 `react` 从 peers 删掉（正向用例红）、
// 注入一个未声明 require（正向红）、留一个无消费方的 peer（反向红）、把 DSH 组 peer 改成 `^0.3.0`
// （范围红）；还原 → 绿。
// 负例留证 2026-11-18：BUG-246 / BUG-247——把 host peer 从 allowlist 删掉（反向红）、
// 把动态 import() 从抽取面去掉（动态抽取用例红）；还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  declaredNamesOf, dynamicImportsOf, externalImportsOf, forwardDepIssues, HOST_ROW_PEERS,
  hostRowIssues, packageNameOf, packDepsIssues, peerRangeIssues, requiresOf, unusedPeerIssues,
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

test('抽取器：JS require / 动态 import() / d.ts external import / YAML 点名（BUG-232/247）', () => {
  const requires = requiresOf("const a = require('react')\nconst b = require('./chunk.js')\nconst c = require('@deepseek-ai/dsh-tools')")
  assert.deepEqual(requires.map((entry) => entry.name), ['react', '@deepseek-ai/dsh-tools'])
  const dynamic = dynamicImportsOf("const a = await import('@deepseek-ai/dsh-tools')\nconst b = await import('./chunk.js')\n")
  assert.deepEqual(dynamic.map((entry) => entry.name), ['@deepseek-ai/dsh-tools'], '动态 import() 必须进闭包（BUG-247）')
  const imports = externalImportsOf("import type { A } from '@deepseek-ai/cordis'\nimport { b } from './local.ts'\n")
  assert.deepEqual(imports.map((entry) => entry.name), ['@deepseek-ai/cordis'])
  const yaml = "name: '@deepseek-ai/dsh-agent-preset'\n  # @deepseek-ai/ignored-comment\n  name: cordis\n  plugins: [x]\n"
  assert.deepEqual([...declaredNamesOf(yaml)].sort(), ['@deepseek-ai/dsh-agent-preset', 'cordis'])
})

test('正向：发布物 require/import/动态 import ⊆ peers（BUG-229/232/247）', () => {
  const peers = { react: '^18.2.0' }
  assert.deepEqual(forwardDepIssues({ peers, requires: [{ spec: 'react/jsx-runtime' }] }), [])
  const issues = forwardDepIssues({
    peers,
    requires: [{ spec: 'react-dom' }],
    imports: [{ spec: '@deepseek-ai/cordis' }, { spec: '@deepseek-ai/dsh-tools' }],
  })
  assert.equal(issues.length, 3)
  assert.ok(issues.every((issue) => issue.includes('不在 peerDependencies')))
})

test('反向：每个 peer 必须被用到、YAML 点名，或在显式 host-row allowlist（BUG-232/246）', () => {
  const peers = { react: '^18.2.0', 'left-pad': '^1.0.0', '@deepseek-ai/dsh-fake-tool': '1' }
  const issues = unusedPeerIssues({ peers, requires: [{ spec: 'react' }] })
  assert.equal(issues.length, 2)
  assert.ok(issues.every((issue) => issue.includes('host-row allowlist')), '失败文案必须点名 allowlist 修正入口')
  assert.deepEqual(unusedPeerIssues({ peers, requires: [{ spec: 'react' }], declaredYaml: new Set(['left-pad']) })
    .map((issue) => issue.match(/「([^」]+)」/)?.[1]), ['@deepseek-ai/dsh-fake-tool'], 'host peer 不再吃前缀豁免')
  assert.deepEqual(unusedPeerIssues({
    peers, requires: [{ spec: 'react' }], declaredYaml: new Set(['left-pad']),
    hostRowPeers: { '@deepseek-ai/dsh-fake-tool': '测试理由' },
  }), [])
})

test('汇总闭包：动态 import() 进入 packDepsIssues（BUG-247 端到端）', () => {
  const issues = packDepsIssues({
    pkg: { engines: { dsh: '>=0.2.1-rc.2 <=0.2.1-rc.5' }, peerDependencies: {} },
    jsTexts: ["const m = await import('left-pad')"],
  })
  assert.ok(issues.some((issue) => issue.includes('left-pad')), '动态 import() 未声明 peer 必须被汇总判出')
})

test('host-row allowlist 自身可腐烂：键必须是 peer 且理由非空（BUG-246）', () => {
  const pkg = { peerDependencies: { '@deepseek-ai/dsh-tools': '1' } }
  assert.deepEqual(hostRowIssues(pkg, { '@deepseek-ai/dsh-tools': '理由' }), [])
  assert.ok(hostRowIssues(pkg, { '@deepseek-ai/dsh-gone': '理由' })[0].includes('已不是 peerDependency'))
  assert.ok(hostRowIssues(pkg, { '@deepseek-ai/dsh-tools': ' ' })[0].includes('缺理由'))
  assert.deepEqual(hostRowIssues(PKG), [], '真实 allowlist 的每个键都必须仍是 peer 且有理由')
  for (const name of Object.keys(HOST_ROW_PEERS)) {
    assert.ok(Object.hasOwn(PKG.peerDependencies, name), `allowlist 键 ${name} 已不是 peer`)
  }
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
