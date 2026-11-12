// defaults-command.test.mjs — `/research-defaults` 的核心：原子写、revision、stale、路径安全。
//
// 判据（issue A6）：set/unset/clear 走原子写 + revision+1 + 回读；expectedRevision 不匹配
// → stale；非法 enum/未知键/method/gates → 拒绝；symlink/目录/相对 cwd → 拒绝；clear 删文件。
//
// 红证：把 stale 比较翻成恒等、删 safeTarget 的 symlink 检查、或让 unset 不升 revision → 红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runDefaultsCommand } from '../../packages/deep-research-pack/src/defaults/command.ts'
import { DEFAULTS_FILE, parseDefaults } from '../../packages/deep-research-pack/src/lib/research-defaults.ts'

const dirs = []
function workspace() {
  const dir = mkdtempSync(join(tmpdir(), 'research-defaults-'))
  dirs.push(dir)
  return dir
}

function run(cwd, rawInput) {
  return runDefaultsCommand({ cwd, rawInput, now: () => new Date('2026-11-12T19:30:00.000Z') })
}

function written(cwd) {
  return parseDefaults(readFileSync(join(cwd, DEFAULTS_FILE), 'utf8'))
}

test.after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

test('空工作区 show = ok empty；set 创建文件、revision 1、回读可解析', () => {
  const cwd = workspace()
  assert.equal(run(cwd, '').text, 'ok revision=0 empty')
  const set = run(cwd, 'set {"patch":{"effort":"deep","output":{"shape":"full_report","audience":"决策层"},"source":{"families":["official","regulatory"],"authority":"primary","recency":"12m"}}}')
  assert.equal(set.kind, 'success', set.text)
  assert.match(set.text, /^ok revision=1 /)
  const parsed = written(cwd)
  assert.deepEqual(parsed.problems, [])
  assert.equal(parsed.value.revision, 1)
  assert.equal(parsed.value.effort, 'deep')
  assert.equal(parsed.value.output?.shape, 'full_report')
  assert.deepEqual(parsed.value.source?.families, ['official', 'regulatory'])
  assert.equal(parsed.value.updatedAt, '2026-11-12T19:30:00.000Z')
})

test('stale：expectedRevision 不匹配拒绝且文件不变', () => {
  const cwd = workspace()
  run(cwd, 'set {"patch":{"effort":"deep"}}')
  const before = readFileSync(join(cwd, DEFAULTS_FILE), 'utf8')
  const stale = run(cwd, 'set {"expectedRevision":0,"patch":{"effort":"standard"}}')
  assert.equal(stale.kind, 'error')
  assert.equal(stale.text, 'error stale revision=1')
  assert.equal(readFileSync(join(cwd, DEFAULTS_FILE), 'utf8'), before)
})

test('非法 patch：auto/未知轴/method/gates/空 patch 都拒绝，不创建文件', () => {
  const cwd = workspace()
  for (const patch of [
    '{"patch":{"effort":"auto"}}',
    '{"patch":{"method":"x"}}',
    '{"patch":{"gates":{}}}',
    '{"patch":{}}',
    '{"patch":{"output":{}}}',
    '{"patch":{"source":{"families":[]}}}',
  ]) {
    const result = run(cwd, `set ${patch}`)
    assert.equal(result.kind, 'error', `${patch} 应拒绝：${result.text}`)
  }
  assert.equal(existsSync(join(cwd, DEFAULTS_FILE)), false)
  assert.equal(run(cwd, 'set not-json').kind, 'error')
  assert.equal(run(cwd, 'set {"patch":{"effort":"deep"}').kind, 'error') // 截断 JSON
})

test('unset：删除轴并升 revision；旧值不残留；revision 不匹配拒绝', () => {
  const cwd = workspace()
  run(cwd, 'set {"patch":{"effort":"deep","output":{"shape":"full_report"},"source":{"authority":"primary"}}}')
  const unset = run(cwd, 'unset effort,output revision=1')
  assert.equal(unset.kind, 'success', unset.text)
  assert.match(unset.text, /^ok revision=2/)
  const parsed = written(cwd)
  assert.equal(parsed.value.effort, undefined)
  assert.equal(parsed.value.output, undefined)
  assert.equal(parsed.value.source?.authority, 'primary')
  assert.equal(parsed.value.revision, 2)
  assert.equal(JSON.stringify(parsed.value).includes('auto'), false)

  const stale = run(cwd, 'unset source revision=1')
  assert.equal(stale.text, 'error stale revision=2')
  assert.equal(written(cwd).value.source?.authority, 'primary')
})

test('unset 全部轴后文件保留 metadata；parse 视为 auto；show 仍有 revision', () => {
  const cwd = workspace()
  run(cwd, 'set {"patch":{"effort":"deep"}}')
  run(cwd, 'unset effort revision=1')
  const parsed = written(cwd)
  assert.equal(parsed.value.effort, undefined)
  assert.equal(parsed.value.revision, 2)
  assert.equal(parsed.hasAnyValue, false)
  const show = run(cwd, 'show')
  assert.equal(show.kind, 'success')
  assert.match(show.text, /revision=2/)
  assert.doesNotMatch(show.text, /effort=/)
})

test('clear：删文件；revision 不匹配拒绝；已不存在 = ok', () => {
  const cwd = workspace()
  run(cwd, 'set {"patch":{"effort":"deep"}}')
  assert.equal(run(cwd, 'clear revision=0').text, 'error stale revision=1')
  assert.equal(existsSync(join(cwd, DEFAULTS_FILE)), true)
  assert.equal(run(cwd, 'clear revision=1').kind, 'success')
  assert.equal(existsSync(join(cwd, DEFAULTS_FILE)), false)
  assert.equal(run(cwd, 'clear').kind, 'success')
})

test('路径安全：相对 cwd / symlink / 目录 / 无 cwd 拒绝', () => {
  assert.equal(run(undefined, '').text, 'error no-workspace')
  assert.equal(run('relative/path', '').text, 'error unsafe cwd-relative')

  const cwd = workspace()
  const outside = join(workspace(), 'outside.json')
  writeFileSync(outside, '{"schema":1,"effort":"deep"}')
  symlinkSync(outside, join(cwd, DEFAULTS_FILE))
  assert.equal(run(cwd, 'show').text, 'error unsafe symlink')
  assert.equal(run(cwd, 'set {"patch":{"effort":"standard"}}').text, 'error unsafe symlink')

  const dirCwd = workspace()
  mkdirSync(join(dirCwd, DEFAULTS_FILE))
  assert.equal(run(dirCwd, '').text, 'error unsafe directory')
})

test('坏文件不静默覆盖：set/show 报 invalid；clear 可修复', () => {
  const cwd = workspace()
  writeFileSync(join(cwd, DEFAULTS_FILE), '{"schema":1,"effort":"bogus"}\n')
  const show = run(cwd, 'show')
  assert.equal(show.kind, 'error')
  assert.match(show.text, /effort=invalid/)
  const set = run(cwd, 'set {"patch":{"effort":"deep"}}')
  assert.equal(set.kind, 'error')
  assert.match(set.text, /effort=invalid/)
  // 坏文件仍在（不覆盖用户内容）
  assert.match(readFileSync(join(cwd, DEFAULTS_FILE), 'utf8'), /bogus/)
  assert.equal(run(cwd, 'clear').kind, 'success')
  assert.equal(existsSync(join(cwd, DEFAULTS_FILE)), false)
})

test('schema 不符/截断 JSON 的 set 拒绝；show 报 invalid', () => {
  const cwd = workspace()
  writeFileSync(join(cwd, DEFAULTS_FILE), '{"schema":2,"effort":"deep"}\n')
  assert.match(run(cwd, 'show').text, /schema/)
  assert.match(run(cwd, 'set {"patch":{"effort":"deep"}}').text, /schema/)
  assert.equal(run(cwd, 'clear').kind, 'success')

  writeFileSync(join(cwd, DEFAULTS_FILE), 'not-json')
  assert.match(run(cwd, 'show').text, /parse/)
  assert.equal(run(cwd, 'clear').kind, 'success')
})

test('patch 可只改 audience；shape 保持 auto（不物化 shape）', () => {
  const cwd = workspace()
  const set = run(cwd, 'set {"patch":{"output":{"audience":"工程团队"}}}')
  assert.equal(set.kind, 'success', set.text)
  const parsed = written(cwd)
  assert.equal(parsed.value.output?.shape, undefined)
  assert.equal(parsed.value.output?.audience, '工程团队')
})


// 负例留证 2026-11-13：BUG-131——未知键 show 零提示，set 静默删除。还原法 = show 不拼 warn / set 不看 warnings。
test('BUG-131 未知键：show 带 warn，set 拒绝而不是静默删除', async () => {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'defaults-warn-'))
  try {
    const file = join(root, 'research-defaults.json')
    writeFileSync(file, JSON.stringify({ schema: 1, revision: 3, efort: 'deep', effort: 'deep', output: { shape: 'full_report', audiance: 'CFO' } }, null, 2))
    const shown = runDefaultsCommand({ cwd: root, rawInput: 'show' })
    assert.equal(shown.kind, 'success')
    assert.match(shown.text, /warn=.*unknown/)
    assert.match(shown.text, /efort=unknown/)
    assert.match(shown.text, /audiance=unknown/)
    const before = readFileSync(file, 'utf8')
    const set = runDefaultsCommand({ cwd: root, rawInput: 'set {"patch":{"source":{"authority":"primary"}}}' })
    assert.equal(set.kind, 'error')
    assert.match(set.text, /unknown-keys/)
    assert.equal(readFileSync(file, 'utf8'), before, '拒绝写入时文件不得变化')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

// 负例留证 2026-11-13：BUG-132——expectedRevision 非原子 CAS，并发双双成功；
// BUG-133——未知子键 set 成功但字段丢失。还原法 = 去掉 withDefaultsLock / warnings 传 []。
test('BUG-132 expectedRevision 串行 CAS：同 revision 第二次 stale', () => {
  const root = workspace()
  writeFileSync(join(root, DEFAULTS_FILE), JSON.stringify({ schema: 1, revision: 3, effort: 'quick' }))
  const first = runDefaultsCommand({ cwd: root, rawInput: 'set {"expectedRevision":3,"patch":{"effort":"deep"}}' })
  assert.equal(first.kind, 'success')
  const second = runDefaultsCommand({ cwd: root, rawInput: 'set {"expectedRevision":3,"patch":{"effort":"standard"}}' })
  assert.equal(second.kind, 'error')
  assert.match(second.text, /stale/)
  assert.equal(JSON.parse(readFileSync(join(root, DEFAULTS_FILE), 'utf8')).effort, 'deep')
})

test('BUG-133 set 未知子键：返回 invalid 且不写文件', () => {
  const root = workspace()
  const before = JSON.stringify({ schema: 1, revision: 1, effort: 'quick' })
  writeFileSync(join(root, DEFAULTS_FILE), before)
  const r = runDefaultsCommand({ cwd: root, rawInput: 'set {"patch":{"output":{"shape":"full_report","audiance":"CFO"}}}' })
  assert.equal(r.kind, 'error')
  assert.match(r.text, /output\.audiance/)
  assert.equal(readFileSync(join(root, DEFAULTS_FILE), 'utf8'), before)
})
