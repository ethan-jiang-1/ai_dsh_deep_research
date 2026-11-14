// artifact-freshness 契约（BUG-174）——`_dist` 产物不早于被它打包的源/构建文件：
//   旧 tarball 装上也能 ALL PASS，断言对象就不是当前 HEAD；本谓词让入口 fail-loud 成 exit 2。
// 反证：把 `artifactFreshness` 的 mtime 比较反过来 → 下方 stale 例绿；删掉 node_modules 跳过 →
// 「忽略目录」例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { artifactFreshness, newestMtimeIn } from '../../scripts/lib/artifact-freshness.mjs'

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
