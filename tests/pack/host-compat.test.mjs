// 宿主兼容裁决 — 用 vendor 的真实决策函数证明 pack 的 engines.dsh 会被拒绝/放行，
// 而不只断言“字段在场”。反证：删 pack 的 engines.dsh 或改成另一个版本 → 本文件红。
// 边界：这是宿主决策函数的单元证据；安装命令的 exit/nothing-installed 由 vendor operations
// 负责，L2 只证安装形状。vendor 是 pinned 机制基线（submodule），不走网络。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluatePluginCompatibility } from '../../vendor/dsh/packages/boot/app-boot/src/plugin-compatibility.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const pkg = JSON.parse(readFileSync(join(ROOT, 'packages', 'deep-research-pack', 'package.json'), 'utf8'))

test('宿主兼容：engines.dsh 声明的版本放行', () => {
  assert.equal(evaluatePluginCompatibility(pkg, {}, '0.2.1-rc.2'), undefined)
})

test('宿主兼容：不满足 engines.dsh 的版本被拒绝，且要求里点名 engines.dsh', () => {
  const denied = evaluatePluginCompatibility(pkg, {}, '0.2.1-rc.3')
  assert.ok(denied, '宿主未拒绝不兼容版本——engines.dsh 没有生效')
  assert.deepEqual(denied.requirements, { 'engines.dsh': '0.2.1-rc.2' })
  assert.equal(denied.exempted, false)
  assert.equal(denied.name, pkg.name)
  assert.equal(denied.version, pkg.version)
})
