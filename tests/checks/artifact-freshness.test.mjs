// artifact-freshness 契约（BUG-174）——`_dist` 产物不早于被它打包的源/构建文件：
//   旧 tarball 装上也能 ALL PASS，断言对象就不是当前 HEAD；本谓词让入口 fail-loud 成 exit 2。
// 反证：把 `artifactFreshness` 的 mtime 比较反过来 → 下方 stale 例绿；删掉 node_modules 跳过 →
// 「忽略目录」例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { artifactFileSetProblems, artifactFreshness, newestMtimeIn, writeBuildManifest } from '../../scripts/lib/artifact-freshness.mjs'

const at = (iso) => new Date(iso)
const touch = (path, iso) => utimesSync(path, at(iso), at(iso))

test('artifactFreshness：产物不早于源/构建 = fresh；旧产物 = stale 并点名路径', () => {
  const dir = mkdtempSync(join(tmpdir(), 'artifact-freshness-'))
  try {
    const src = join(dir, 'src')
    const lib = join(dir, 'lib')
    mkdirSync(src)
    mkdirSync(lib)
    writeFileSync(join(src, 'a.ts'), 'a\n')
    writeFileSync(join(lib, 'b.js'), 'b\n')
    const artifact = join(dir, 'dist.tgz')
    writeFileSync(artifact, 'tar\n')
    touch(join(src, 'a.ts'), '2026-01-01T00:00:00Z')
    touch(join(lib, 'b.js'), '2026-01-01T00:00:00Z')
    touch(artifact, '2026-01-02T00:00:00Z')
    assert.equal(artifactFreshness(artifact, [src, lib]).fresh, true)

    touch(join(src, 'a.ts'), '2026-01-03T00:00:00Z')
    const stale = artifactFreshness(artifact, [src, lib])
    assert.equal(stale.fresh, false)
    assert.match(stale.reason, /早于/)
    assert.match(stale.reason, /a\.ts/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('artifactFreshness：缺席产物 / 无源 = fail-closed；node_modules 不参与最新 mtime', () => {
  const dir = mkdtempSync(join(tmpdir(), 'artifact-freshness-'))
  try {
    const src = join(dir, 'src')
    mkdirSync(join(src, 'node_modules'), { recursive: true })
    writeFileSync(join(src, 'node_modules', 'ignored.txt'), 'x\n')
    touch(join(src, 'node_modules', 'ignored.txt'), '2030-01-01T00:00:00Z')
    writeFileSync(join(src, 'a.ts'), 'a\n')
    touch(join(src, 'a.ts'), '2026-01-01T00:00:00Z')
    const artifact = join(dir, 'dist.tgz')
    writeFileSync(artifact, 'tar\n')
    touch(artifact, '2026-01-02T00:00:00Z')

    assert.equal(artifactFreshness(artifact, [src]).fresh, true, 'node_modules 里的新文件不得把产物判旧')
    assert.equal(artifactFreshness(join(dir, 'missing.tgz'), [src]).reason, 'artifact-missing')
    assert.equal(artifactFreshness(artifact, [join(dir, 'none')]).reason, 'no-sources')
    assert.equal(newestMtimeIn([join(dir, 'none')]), null)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('manifest：源文件删除 / 内容替换（同 mtime）/ tarball 替换 → stale；清单优先于 mtime', () => {
  const dir = mkdtempSync(join(tmpdir(), 'artifact-manifest-'))
  try {
    const src = join(dir, 'src')
    mkdirSync(src)
    writeFileSync(join(src, 'a.ts'), 'a\n')
    writeFileSync(join(src, 'b.ts'), 'b\n')
    const artifact = join(dir, 'dist.tgz')
    writeFileSync(artifact, 'tar\n')
    const manifestPath = join(dir, 'build-manifest.json')
    writeBuildManifest({ artifact, roots: [src], manifestPath })
    assert.equal(artifactFreshness(artifact, [src], { manifestPath }).fresh, true)
    assert.equal(artifactFreshness(artifact, [src], { manifestPath }).mode, 'manifest')

    // 删除源文件：mtime 仍可能「不比 artifact 新」，清单必须判 stale（BUG-181 核心）。
    rmSync(join(src, 'b.ts'))
    const deleted = artifactFreshness(artifact, [src], { manifestPath })
    assert.equal(deleted.fresh, false)
    assert.match(deleted.reason, /source-changed/)

    // 内容替换但 mtime 回拨到旧值：内容哈希仍能发现。
    writeFileSync(join(src, 'b.ts'), 'b\n')
    writeBuildManifest({ artifact, roots: [src], manifestPath })
    writeFileSync(join(src, 'a.ts'), 'A\n')
    const old = new Date('2026-01-01T00:00:00Z')
    utimesSync(join(src, 'a.ts'), old, old)
    assert.match(artifactFreshness(artifact, [src], { manifestPath }).reason, /source-changed/)

    // artifact 被换掉：哈希不一致，不能只看源。
    writeBuildManifest({ artifact, roots: [src], manifestPath })
    writeFileSync(artifact, 'tampered\n')
    assert.match(artifactFreshness(artifact, [src], { manifestPath }).reason, /artifact-changed/)

    // 无清单：显式退回 mtime-only（旧 tarball 兼容路径）。
    const fallback = artifactFreshness(artifact, [src], { manifestPath: join(dir, 'missing.json') })
    assert.equal(fallback.mode, 'mtime-only')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('file-set 回退：tarball 多出已删源 / 缺少新增源 → stale（无清单的旧 tarball）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'artifact-fileset-'))
  try {
    const src = join(dir, 'src')
    mkdirSync(src)
    writeFileSync(join(src, 'a.mjs'), 'a\n')
    const artifact = join(dir, 'dist.tgz')
    writeFileSync(artifact, 'tar\n')
    const sourceEntries = ['package/a.mjs']
    const missing = artifactFileSetProblems({ artifactEntries: [], sourceEntries })
    assert.deepEqual(missing, { missing: ['a.mjs'], extra: [] })
    const extra = artifactFileSetProblems({ artifactEntries: ['package/a.mjs', 'package/b.mjs'], sourceEntries })
    assert.deepEqual(extra.extra, ['b.mjs'])
    const stale = artifactFreshness(artifact, [src], {
      artifactEntries: ['package/a.mjs', 'package/b.mjs'],
      sourceEntries,
    })
    assert.equal(stale.fresh, false)
    assert.equal(stale.mode, 'file-set')
    assert.match(stale.reason, /文件集/)
    const ok = artifactFreshness(artifact, [src], { artifactEntries: ['package/a.mjs'], sourceEntries })
    assert.notEqual(ok.mode, 'file-set')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
