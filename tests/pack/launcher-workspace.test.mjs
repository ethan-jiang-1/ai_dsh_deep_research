// launcher-workspace — 工作区解析、模式判定、安全边界与 .gitignore 托管块。
// 反证：删掉 hasResearchContract 的 "AGENTS+NODES 同时在场" 条件 / 删掉 project-subdir 分支 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  appendGitignoreBlock, assertWorkspaceSafety, GITIGNORE_MARKER, hasGitignoreBlock, hasResearchContract,
  isEmptyDir, isInside, resolveResearchRoot, resolveWorkspaceSource,
} from '../../packages/deep-research-pack/scripts/lib/launcher/workspace.mjs'

const temp = () => mkdtempSync(join(tmpdir(), 'dr-workspace-'))
const cleanup = (dir) => rmSync(dir, { recursive: true, force: true })

test('hasResearchContract：seed 状态或 AGENTS+NODES 才算；单独 AGENTS 不算', () => {
  const dir = temp()
  try {
    assert.equal(hasResearchContract(dir), false)
    writeFileSync(join(dir, 'AGENTS.md'), '# project')
    assert.equal(hasResearchContract(dir), false, '用户项目自己的 AGENTS.md 不能算研究契约')
    writeFileSync(join(dir, 'NODES.md'), '# nodes')
    assert.equal(hasResearchContract(dir), true)
    rmSync(join(dir, 'AGENTS.md'))
    writeFileSync(join(dir, '.dsh-research-seed.json'), '{}')
    assert.equal(hasResearchContract(dir), true)
  } finally {
    cleanup(dir)
  }
})

test('isEmptyDir：不存在/空为 true；隐藏文件也算非空', () => {
  const dir = temp()
  try {
    assert.equal(isEmptyDir(join(dir, 'missing')), true)
    assert.equal(isEmptyDir(dir), true)
    writeFileSync(join(dir, '.hidden'), 'x')
    assert.equal(isEmptyDir(dir), false)
  } finally {
    cleanup(dir)
  }
})

test('resolveWorkspaceSource：flag > env > settings', () => {
  assert.deepEqual(resolveWorkspaceSource({ explicit: '/flag', env: { DEEP_RESEARCH_WORKSPACE: '/env' }, saved: '/saved' }), { raw: '/flag', source: 'flag' })
  assert.deepEqual(resolveWorkspaceSource({ env: { DEEP_RESEARCH_WORKSPACE: '/env' }, saved: '/saved' }), { raw: '/env', source: 'env' })
  assert.deepEqual(resolveWorkspaceSource({ saved: '/saved' }), { raw: '/saved', source: 'settings' })
  assert.deepEqual(resolveWorkspaceSource({}), { raw: null, source: null })
})

test('resolveResearchRoot：空目录/已有契约/项目子目录/in-place/显式 root', () => {
  const dir = temp()
  try {
    assert.equal(resolveResearchRoot({ workspaceDir: dir }).mode, 'empty')
    writeFileSync(join(dir, 'AGENTS.md'), '# a')
    writeFileSync(join(dir, 'NODES.md'), '# n')
    assert.equal(resolveResearchRoot({ workspaceDir: dir }).mode, 'existing')
    rmSync(join(dir, 'AGENTS.md'))
    rmSync(join(dir, 'NODES.md'))
    writeFileSync(join(dir, 'README.md'), '# project')
    const sub = resolveResearchRoot({ workspaceDir: dir })
    assert.equal(sub.mode, 'project-subdir')
    assert.equal(sub.root, join(realpathSync(dir), 'research'))
    assert.equal(resolveResearchRoot({ workspaceDir: dir, inPlace: true }).mode, 'in-place')
    const explicit = resolveResearchRoot({ workspaceDir: dir, root: join(dir, 'elsewhere') })
    assert.equal(explicit.mode, 'explicit-root')
    assert.equal(explicit.root, join(realpathSync(dir), 'elsewhere'))
  } finally {
    cleanup(dir)
  }
})

test('assertWorkspaceSafety：HOME/DSH_HOME/pack/profile 的本身/祖先/内部按 guard 语义拒绝或警告', () => {
  const base = temp()
  try {
    const home = join(base, 'home')
    const dshHome = join(base, 'dsh-root', 'dsh')
    const packDir = join(base, 'pack')
    const profileDir = join(base, 'profiles', 'deep-research')
    const dshParent = join(base, 'dsh-root')
    for (const dir of [home, dshHome, packDir, profileDir, dshParent, join(packDir, 'inside')]) mkdirSync(dir, { recursive: true })
    const guard = (workspace) => assertWorkspaceSafety({ workspace, home, dshHome, packDir, profileDir })

    assert.throws(() => guard(home), /HOME/)
    assert.throws(() => guard(base), /HOME 的祖先/)
    assert.throws(() => guard(dshHome), /DSH_HOME/)
    assert.throws(() => guard(dshParent), /DSH_HOME/)
    assert.throws(() => guard(join(packDir, 'inside')), /pack/)
    assert.throws(() => guard(packDir), /pack/)
    assert.throws(() => guard(profileDir), /profile/)
    assert.throws(() => guard(join(profileDir, 'x')), /profile/)

    const allowed = guard(join(home, 'research'))
    assert.equal(allowed.workspace, join(realpathSync(home), 'research'))
    const warned = guard(join(dshHome, 'research'))
    assert.ok(warned.warnings.some((line) => line.includes('DSH_HOME')))
  } finally {
    cleanup(base)
  }
})

test('.gitignore 托管块：追加幂等、保留原内容、标记在场', () => {
  const dir = temp()
  try {
    const file = join(dir, '.gitignore')
    writeFileSync(file, 'node_modules/\n')
    assert.equal(hasGitignoreBlock(dir), false)
    const first = appendGitignoreBlock(dir)
    assert.equal(first.ok, true)
    assert.equal(first.appended, true)
    const text = readFileSync(file, 'utf8')
    assert.match(text, /node_modules\//)
    assert.match(text, new RegExp(GITIGNORE_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    const second = appendGitignoreBlock(dir)
    assert.equal(second.appended, false)
    assert.equal(readFileSync(file, 'utf8'), text)
    assert.equal(hasGitignoreBlock(dir), true)
  } finally {
    cleanup(dir)
  }
})

test('.gitignore 托管块：文件不存在时创建', () => {
  const dir = temp()
  try {
    const result = appendGitignoreBlock(dir)
    assert.equal(result.appended, true)
    assert.ok(existsSync(join(dir, '.gitignore')))
    assert.match(readFileSync(join(dir, '.gitignore'), 'utf8'), /drt_\*\//)
  } finally {
    cleanup(dir)
  }
})

test('isInside：realpath 语义；不在内部/父目录为 false', () => {
  const dir = temp()
  try {
    mkdirSync(join(dir, 'a'), { recursive: true })
    assert.equal(isInside(dir, join(dir, 'a', 'x.md')), true)
    assert.equal(isInside(join(dir, 'a'), dir), false)
  } finally {
    cleanup(dir)
  }
})
