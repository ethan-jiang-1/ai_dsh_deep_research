// launcher-settings — 产品设置文件：profile 目录内、原子写、损坏回退、symlink 拒绝、无秘密。
// 反证：把 schemaVersion 校验删掉 / 把 symlink 守卫删掉 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  readLauncherSettings, removeLauncherSettings, settingsFileFor, writeLauncherSettings,
} from '../../packages/deep-research-pack/scripts/lib/launcher/settings.mjs'

const temp = () => mkdtempSync(join(tmpdir(), 'dr-settings-'))
const cleanup = (dir) => rmSync(dir, { recursive: true, force: true })

test('写/读：workspace 绝对化、schema/profile/updatedAt 在场、权限文件不带秘密', () => {
  const home = temp()
  try {
    const result = writeLauncherSettings({ home, profile: 'deep-research' }, { workspace: join(home, 'ws') })
    assert.equal(result.ok, true, result.error ?? '')
    const read = readLauncherSettings({ home, profile: 'deep-research' })
    assert.equal(read.error, null)
    assert.equal(read.settings.schemaVersion, 1)
    assert.equal(read.settings.workspace, join(home, 'ws'))
    assert.equal(read.settings.profile, 'deep-research')
    assert.match(read.settings.updatedAt, /^\d{4}-\d{2}-\d{2}T/)
    const text = readFileSync(settingsFileFor({ home, profile: 'deep-research' }), 'utf8')
    assert.doesNotMatch(text, /api[_-]?key|secret|token/i)
  } finally {
    cleanup(home)
  }
})

test('缺失/损坏/未知 schema：回退 null，不崩', () => {
  const home = temp()
  try {
    assert.equal(readLauncherSettings({ home, profile: 'p' }).settings, null)
    const path = settingsFileFor({ home, profile: 'p' })
    mkdirSync(join(home, 'profiles', 'p'), { recursive: true })
    writeFileSync(path, '{bad json')
    const broken = readLauncherSettings({ home, profile: 'p' })
    assert.equal(broken.settings, null)
    assert.ok(broken.error !== null)
    writeFileSync(path, JSON.stringify({ schemaVersion: 99, workspace: '/x' }))
    assert.equal(readLauncherSettings({ home, profile: 'p' }).settings, null)
    writeFileSync(path, JSON.stringify({ schemaVersion: 1 }))
    assert.equal(readLauncherSettings({ home, profile: 'p' }).settings, null)
  } finally {
    cleanup(home)
  }
})

test('symlink 设置文件：读忽略、写拒绝', () => {
  const home = temp()
  try {
    const path = settingsFileFor({ home, profile: 'p' })
    mkdirSync(join(home, 'profiles', 'p'), { recursive: true })
    const target = join(home, 'target.json')
    writeFileSync(target, JSON.stringify({ schemaVersion: 1, workspace: '/tmp/x' }))
    symlinkSync(target, path)
    const read = readLauncherSettings({ home, profile: 'p' })
    assert.equal(read.settings, null)
    assert.match(read.error ?? '', /symlink/)
    const write = writeLauncherSettings({ home, profile: 'p' }, { workspace: join(home, 'ws') })
    assert.equal(write.ok, false)
    assert.match(write.error ?? '', /symlink/)
  } finally {
    cleanup(home)
  }
})

test('profile 名非法：拒绝（不写出 profiles 之外）', () => {
  const home = temp()
  try {
    assert.throws(() => settingsFileFor({ home, profile: '../x' }), /profile 名不合法/)
    assert.throws(() => settingsFileFor({ home, profile: 'a/b' }), /profile 名不合法/)
  } finally {
    cleanup(home)
  }
})

test('remove：删除后读为 null', () => {
  const home = temp()
  try {
    writeLauncherSettings({ home, profile: 'p' }, { workspace: join(home, 'ws') })
    removeLauncherSettings({ home, profile: 'p' })
    assert.equal(readLauncherSettings({ home, profile: 'p' }).settings, null)
  } finally {
    cleanup(home)
  }
})
