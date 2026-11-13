// 角色消费者矩阵（W2-3）——新增/改名 role 时，四个消费者面必须同时接线：
//   ① presets/<role>.patch.yml 内有 `id: preset-<role>` 行（roster 可挂）；
//   ② presets/<role>/skills/ 至少一个 skill（能力可发现）；
//   ③ snapshots/replay/research-face/snapshot.json 的 roleFace 含该角色（回放证据覆盖）；
//   ④ 盘上 presetRoles() 与 roleFace 精确相等（漏登记/幽灵角色都红）。
// 这是 C2「消费者遗漏」的窄矩阵：不做跨五件的总图，只钉 role 这一条主链。
// 反证：从 snapshot.json 删 method-editor → ③/④ 红；还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { presetRoles } from '../../scripts/lib/roles.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const SCENE = join(ROOT, 'snapshots', 'replay', 'research-face', 'snapshot.json')
const roles = presetRoles(ROOT)
const roleFace = JSON.parse(readFileSync(SCENE, 'utf8')).roleFace

test('角色消费者矩阵：patch 行 / skills / snapshot roleFace / 盘上 roster 四面对齐', () => {
  assert.ok(roles.length >= 5, `防空语料：presetRoles 只有 ${roles.length}`)
  assert.ok(Array.isArray(roleFace), 'snapshot.json 缺 roleFace')
  for (const role of roles) {
    const patch = readFileSync(join(PACK, 'presets', `${role}.patch.yml`), 'utf8')
    assert.match(patch, new RegExp(`id:\\s*preset-${role}\\b`), `${role}: patch 缺 id: preset-${role}`)
    const skillsDir = join(PACK, 'presets', role, 'skills')
    assert.ok(existsSync(skillsDir), `${role}: 缺 skills/ 目录`)
    assert.ok(readdirSync(skillsDir, { withFileTypes: true }).some((e) => e.isDirectory()), `${role}: skills/ 为空`)
    assert.ok(roleFace.includes(role), `${role}: snapshot roleFace 未覆盖（回放证据缺失）`)
  }
  assert.deepEqual([...roleFace].sort(), [...roles].sort(), 'roleFace 与盘上 presetRoles 必须精确相等——漏登记/幽灵角色都不许')
})
