// deploy-args — scaffold 的参数解析必须 fail-loud：未知 flag / 缺值 / 下一个参数是 flag
// 都不能静默降级成默认写盘；--workspace --force 曾把 "--force" 当路径创建目录。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseScaffoldArgs, validateProfileName } from '../../packages/deep-research-pack/scripts/lib/deploy-args.mjs'

test('parseScaffoldArgs：合法组合解析出 flags/values', () => {
  const parsed = parseScaffoldArgs(['--workspace', '/tmp/ws', '--profile', 'research', '--check'])
  assert.equal(parsed.ok, true)
  assert.equal(parsed.values.workspace, '/tmp/ws')
  assert.equal(parsed.values.profile, 'research')
  assert.equal(parsed.flags.check, true)
  assert.equal(parsed.flags.upgrade, false)
})

test('parseScaffoldArgs：未知 flag 报错，不静默忽略', () => {
  const parsed = parseScaffoldArgs(['--workspace', '/tmp/ws', '--chek'])
  assert.equal(parsed.ok, false)
  assert.ok(parsed.errors.some((line) => line.includes('--chek')))
})

test('parseScaffoldArgs：缺值/值是另一个 flag 都报错', () => {
  const missing = parseScaffoldArgs(['--workspace'])
  assert.equal(missing.ok, false)
  assert.ok(missing.errors.some((line) => line.includes('--workspace')))
  const swallowed = parseScaffoldArgs(['--workspace', '--force'])
  assert.equal(swallowed.ok, false)
  assert.ok(swallowed.errors.some((line) => line.includes('--workspace')))
})

test('parseScaffoldArgs：位置参数/短选项报错', () => {
  assert.equal(parseScaffoldArgs(['/tmp/ws']).ok, false)
  assert.equal(parseScaffoldArgs(['-f']).ok, false)
})

test('parseScaffoldArgs：--adopt 与 --check/--force/--upgrade 互斥', () => {
  assert.equal(parseScaffoldArgs(['--workspace', '/tmp/ws', '--adopt']).ok, true)
  for (const other of ['--check', '--force', '--upgrade']) {
    assert.equal(parseScaffoldArgs(['--workspace', '/tmp/ws', '--adopt', other]).ok, false, `--adopt 与 ${other} 应互斥`)
  }
})

test('parseScaffoldArgs：--check 与 --upgrade/--force 互斥；--help 优先', () => {
  const conflict = parseScaffoldArgs(['--workspace', '/tmp/ws', '--check', '--upgrade'])
  assert.equal(conflict.ok, false)
  const forceConflict = parseScaffoldArgs(['--workspace', '/tmp/ws', '--check', '--force'])
  assert.equal(forceConflict.ok, false)
  const help = parseScaffoldArgs(['--help', '--chek'])
  assert.equal(help.ok, true)
  assert.equal(help.flags.help, true)
})

test('parseScaffoldArgs：--profile 名不合法报错（路径分隔符/点/node_modules）', () => {
  for (const name of ['a/b', 'a\\b', '.', '..', 'node_modules', '']) {
    assert.equal(validateProfileName(name), false, `${JSON.stringify(name)} 应拒绝`)
  }
  assert.equal(validateProfileName('research-2'), true)
  assert.equal(validateProfileName('研究'), true)
  const parsed = parseScaffoldArgs(['--workspace', '/tmp/ws', '--profile', '../escape'])
  assert.equal(parsed.ok, false)
})

test('parseScaffoldArgs：install-anchor 是值参数，不会被当成 flag', () => {
  const parsed = parseScaffoldArgs(['--workspace', '/tmp/ws', '--install-anchor', '/opt/dsh/package.json'])
  assert.equal(parsed.ok, true)
  assert.equal(parsed.values.installAnchor, '/opt/dsh/package.json')
})
