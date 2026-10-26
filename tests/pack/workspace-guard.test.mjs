// workspace-guard — scaffold 的数据隔离边界：工作区不能是 HOME/DSH_HOME/pack 的祖先，
// 种子不能穿过父目录 symlink 写到工作区外。反证：把 realpath 比较换成字符串前缀、
// 或只看叶子 symlink → 外部写入用例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assertSafeWorkspace, assertSeedTargetInsideWorkspace } from '../../packages/deep-research-pack/scripts/lib/workspace-guard.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-workspace-guard-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const dirs = {
    root,
    home: join(root, 'home'),
    dshHome: join(root, 'home', '.dsh'),
    pack: join(root, 'repo', 'packages', 'pack'),
    ws: join(root, 'work', 'research'),
    profile: join(root, 'home', '.dsh', 'profiles', 'research'),
  }
  for (const dir of Object.values(dirs)) mkdirSync(dir, { recursive: true })
  return dirs
}

test('assertSafeWorkspace：正常独立工作区通过', (t) => {
  const dirs = fixture(t)
  const result = assertSafeWorkspace({ workspace: dirs.ws, home: dirs.home, dshHome: dirs.dshHome, packDir: dirs.pack, profileDir: dirs.profile })
  assert.deepEqual(result.warnings, [])
})

test('assertSafeWorkspace：HOME / DSH_HOME 本身拒绝', (t) => {
  const dirs = fixture(t)
  assert.throws(() => assertSafeWorkspace({ workspace: dirs.home, home: dirs.home, dshHome: dirs.dshHome, packDir: dirs.pack }), /HOME/)
  assert.throws(() => assertSafeWorkspace({ workspace: dirs.dshHome, home: dirs.home, dshHome: dirs.dshHome, packDir: dirs.pack }), /DSH_HOME/)
})

test('assertSafeWorkspace：DSH_HOME/pack 的祖先拒绝（会写进 home 或仓库根）', (t) => {
  const dirs = fixture(t)
  assert.throws(() => assertSafeWorkspace({ workspace: dirs.home, home: dirs.home, dshHome: dirs.dshHome, packDir: dirs.pack }), /祖先|HOME/)
  const repo = join(dirs.root, 'repo')
  assert.throws(() => assertSafeWorkspace({ workspace: repo, home: dirs.home, dshHome: dirs.dshHome, packDir: dirs.pack }), /pack/)
  assert.throws(() => assertSafeWorkspace({ workspace: join(dirs.root, 'repo', 'packages'), home: dirs.home, dshHome: dirs.dshHome, packDir: dirs.pack }), /pack/)
})

test('assertSafeWorkspace：pack 内部 / profile 目录拒绝', (t) => {
  const dirs = fixture(t)
  assert.throws(() => assertSafeWorkspace({ workspace: join(dirs.pack, 'workspace'), home: dirs.home, dshHome: dirs.dshHome, packDir: dirs.pack }), /pack/)
  assert.throws(() => assertSafeWorkspace({ workspace: dirs.profile, home: dirs.home, dshHome: dirs.dshHome, packDir: dirs.pack, profileDir: dirs.profile }), /profile/)
})

test('assertSafeWorkspace：workspace 在 DSH_HOME 内 → 允许但警告', (t) => {
  const dirs = fixture(t)
  const nested = join(dirs.dshHome, 'scratch')
  mkdirSync(nested, { recursive: true })
  const result = assertSafeWorkspace({ workspace: nested, home: dirs.home, dshHome: dirs.dshHome, packDir: dirs.pack })
  assert.ok(result.warnings.some((line) => /DSH_HOME/.test(line)))
})

test('assertSeedTargetInsideWorkspace：父目录 symlink 指向外部 → 拒绝', (t) => {
  const dirs = fixture(t)
  const victim = join(dirs.root, 'victim')
  mkdirSync(victim, { recursive: true })
  mkdirSync(join(dirs.ws, 'templates'), { recursive: true })
  symlinkSync(victim, join(dirs.ws, 'templates', 'run'))
  assert.throws(
    () => assertSeedTargetInsideWorkspace({ workspace: dirs.ws, rel: 'templates/run/plan.md' }),
    /symlink|外部|工作区/,
  )
})

test('assertSeedTargetInsideWorkspace：父目录 symlink 指向工作区内 → 允许', (t) => {
  const dirs = fixture(t)
  mkdirSync(join(dirs.ws, 'real-templates'), { recursive: true })
  symlinkSync(join(dirs.ws, 'real-templates'), join(dirs.ws, 'templates'))
  assert.doesNotThrow(() => assertSeedTargetInsideWorkspace({ workspace: dirs.ws, rel: 'templates/run/plan.md' }))
})

test('assertSeedTargetInsideWorkspace：workspace 尚不存在（dry-run / 首装）也按工作区自身算', (t) => {
  const dirs = fixture(t)
  const future = join(dirs.root, 'future-ws')
  assert.doesNotThrow(() => assertSeedTargetInsideWorkspace({ workspace: future, rel: '.gitignore' }))
  assert.doesNotThrow(() => assertSeedTargetInsideWorkspace({ workspace: future, rel: 'templates/run/plan.md' }))
})

test('assertSeedTargetInsideWorkspace：普通嵌套/叶子 symlink 允许（叶子由 scaffold 替换）', (t) => {
  const dirs = fixture(t)
  assert.doesNotThrow(() => assertSeedTargetInsideWorkspace({ workspace: dirs.ws, rel: 'templates/run/plan.md' }))
  const victim = join(dirs.root, 'victim-file')
  writeFileSync(victim, 'ORIGINAL\n')
  symlinkSync(victim, join(dirs.ws, 'AGENTS.md'))
  assert.doesNotThrow(() => assertSeedTargetInsideWorkspace({ workspace: dirs.ws, rel: 'AGENTS.md' }))
})
