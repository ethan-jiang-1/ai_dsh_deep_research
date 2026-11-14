// smoke-assets 契约（BUG-176）——`scripts/smoke` 顶层分类必须看见 symlink / 目录：
//   `Dirent.isFile()/isDirectory()` 对 symlink 均为 false；若只用它们过滤，链接会从 registry/
//   车道/oracle 三个消费者同时消失。本测试用临时目录造四种形态，钉住分类与红项。
//
// 反证：把 inspectSmokeDir 改回 `readdirSync(dir)` 只看名字 → symlink/dir 例红；把 smokeFiles
// 的 `stat.isFile()` 换成 `ent.isFile()` → symlink 文件被算进 files，例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inspectSmokeDir, smokeFiles, smokeSurfaceIssues } from '../../scripts/lib/smoke-assets.mjs'

test('smoke-assets：普通文件 / 目录 / symlink 文件 / symlink 目录分类可见', () => {
  const dir = mkdtempSync(join(tmpdir(), 'smoke-assets-'))
  try {
    writeFileSync(join(dir, 'a.e2e.mjs'), 'process.exit(0)\n')
    writeFileSync(join(dir, 'notes.txt'), 'not a smoke\n')
    mkdirSync(join(dir, 'nested'))
    symlinkSync('a.e2e.mjs', join(dir, 'link.e2e.mjs'))
    symlinkSync('nested', join(dir, 'link-dir'), 'dir')

    const inspected = inspectSmokeDir(dir)
    assert.deepEqual(inspected.files, ['a.e2e.mjs', 'notes.txt'])
    assert.deepEqual(inspected.dirs, ['nested'])
    assert.deepEqual(inspected.symlinks, ['link-dir', 'link.e2e.mjs'])
    assert.deepEqual(inspected.others, [])
    assert.deepEqual(smokeFiles(dir), ['a.e2e.mjs'])
    assert.deepEqual(smokeSurfaceIssues(dir).sort(), [
      '子目录 nested/',
      '符号链接 link-dir',
      '符号链接 link.e2e.mjs',
    ].sort())
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
