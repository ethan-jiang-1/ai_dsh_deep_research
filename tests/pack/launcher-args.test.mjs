// launcher-args — 产品启动器的参数边界：产品 flag 消费、未知 token 原样转发、缺值 fail-loud。
// 反证：把 --workspace 的缺值分支删掉 / 把未知 token 当错误 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseLauncherArgs, helpText } from '../../packages/deep-research-pack/scripts/lib/launcher/args.mjs'

test('产品 flag 与 Web flag：产品消费、其余转发', () => {
  const parsed = parseLauncherArgs(['--workspace', '/tmp/ws', '--profile', 'deep-research', '--check', '--port', '3080', '--no-open'])
  assert.equal(parsed.ok, true)
  assert.equal(parsed.values.workspace, '/tmp/ws')
  assert.equal(parsed.values.profile, 'deep-research')
  assert.equal(parsed.flags.check, true)
  assert.deepEqual(parsed.forwarded, ['--port', '3080', '--no-open'])
})

test('--flag=value 形态', () => {
  const parsed = parseLauncherArgs(['--workspace=/tmp/ws', '--profile=dr', '--port=3080'])
  assert.equal(parsed.values.workspace, '/tmp/ws')
  assert.equal(parsed.values.profile, 'dr')
  assert.deepEqual(parsed.forwarded, ['--port=3080'])
})

test('第一个非产品 token = 转发起点；后面的产品同名 token 不再消费', () => {
  const parsed = parseLauncherArgs(['--no-open', '--workspace', '/tmp/ws'])
  assert.equal(parsed.values.workspace, undefined)
  assert.deepEqual(parsed.forwarded, ['--no-open', '--workspace', '/tmp/ws'])
})

test('缺值/吞 flag fail-loud', () => {
  for (const argv of [['--workspace'], ['--workspace', '--check'], ['--root='], ['--profile', '-x']]) {
    const parsed = parseLauncherArgs(argv)
    assert.equal(parsed.ok, false, JSON.stringify(argv))
    assert.ok(parsed.errors.length > 0)
  }
})

test('-- 之后全部转发', () => {
  const parsed = parseLauncherArgs(['--workspace', '/tmp/ws', '--', '--help', '--port', '3080'])
  assert.equal(parsed.values.workspace, '/tmp/ws')
  assert.deepEqual(parsed.forwarded, ['--help', '--port', '3080'])
})

test('布尔 flag 全量', () => {
  const parsed = parseLauncherArgs(['--check', '--setup-only', '--no-seed', '--in-place', '--gitignore-append', '--refresh-team', '--help'])
  assert.equal(parsed.ok, true)
  for (const key of ['check', 'setupOnly', 'noSeed', 'inPlace', 'gitignoreAppend', 'refreshTeam', 'help']) assert.equal(parsed.flags[key], true, key)
})

test('无产品 flag：全部转发；--help 文本含关键 flag', () => {
  const parsed = parseLauncherArgs(['--port', '3080'])
  assert.deepEqual(parsed.forwarded, ['--port', '3080'])
  const help = helpText('0.2.0')
  for (const token of ['--workspace', '--profile', '--home', '--check', '--setup-only', '--in-place', '--gitignore-append', '--refresh-team']) {
    assert.match(help, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})
