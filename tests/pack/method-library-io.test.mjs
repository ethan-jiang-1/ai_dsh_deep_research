// method-library 写入边界：symlink 拒绝 / 原子 temp+rename / 跨进程锁（BUG-097/098/111）。
// 负例留证 2026-11-12：BUG-111——修复前 readFile/writeFile 跟随 symlink 写外部；
// BUG-098——直接 writeFileSync 截断；BUG-097——读-改-写无锁丢并发条目。
// 还原法 = safeMethodLibraryPath 直接 join；write 直接 writeFileSync；去掉 withMethodLibraryLock。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accessSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mutateMethodLibrary, readLibraryFile, safeMethodLibraryPath, withMethodLibraryLock, writeLibraryFileAtomic } from '../../packages/deep-research-pack/src/method-library-io.ts'

const root = () => mkdtempSync(join(tmpdir(), 'method-library-io-'))

test('BUG-111 symlink 目标：读/写都拒绝，外部文件不变', () => {
  const dir = root(); const outside = root()
  try {
    writeFileSync(join(outside, 'secret.md'), 'OUTSIDE ORIGINAL\n')
    symlinkSync(join(outside, 'secret.md'), join(dir, 'method-library.md'))
    assert.throws(() => safeMethodLibraryPath(dir), /symlink|普通文件/)
    assert.throws(() => readLibraryFile(dir), /symlink|普通文件/)
    assert.throws(() => writeLibraryFileAtomic(dir, '# hacked\n'), /symlink|普通文件/)
    assert.equal(readFileSync(join(outside, 'secret.md'), 'utf8'), 'OUTSIDE ORIGINAL\n')
  } finally { rmSync(dir, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }) }
})

test('BUG-098 原子写：正常写入无残留 temp；目标为目录时拒绝', () => {
  const dir = root()
  try {
    writeLibraryFileAtomic(dir, '# 库\n')
    assert.equal(readFileSync(join(dir, 'method-library.md'), 'utf8'), '# 库\n')
    assert.throws(() => accessSync(join(dir, '.method-library.md.tmp-x')))
    mkdirSync(join(dir, 'as-dir', 'method-library.md'), { recursive: true })
    assert.throws(() => writeLibraryFileAtomic(join(dir, 'as-dir'), 'x'), /普通文件/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('BUG-097 锁：活锁冲突不写；陈旧锁可接管；串行 mutate 不丢条目', () => {
  const dir = root()
  try {
    writeFileSync(join(dir, '.method-library.lock'), '{}')
    assert.throws(() => withMethodLibraryLock(dir, () => 1), /正在进行/)
    utimesSync(join(dir, '.method-library.lock'), new Date(Date.now() - 60_000), new Date(Date.now() - 60_000))
    assert.equal(withMethodLibraryLock(dir, () => 1), 1, '陈旧锁应接管')
    // 串行 mutate：后写者看到前写者的文本
    mutateMethodLibrary(dir, (text) => ({ text: `${text}## A\n`, value: null }))
    const second = mutateMethodLibrary(dir, (text) => ({ text: `${text}## B\n`, value: text }))
    assert.match(second.before, /## A/)
    assert.match(readLibraryFile(dir), /## A[\s\S]*## B/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
