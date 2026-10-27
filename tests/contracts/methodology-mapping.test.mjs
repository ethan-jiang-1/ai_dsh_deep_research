// L3 领域面判据 1 / 判据 4 的机械面（2026-10-28 评分轮 Phase A）。
//
// 为什么需要：evaluation §L3 的判据 1（生命周期映射）与判据 4（信噪比策略显式）此前**只有散文
// 载体**——"映射表审查"是人读。于是出现一种静默漂移：盘上新增一个 skill，映射表却没它，而
// L3 仍然"通过"（没人会去数）。本测试把两件事钉成可失败的事实：
//   ① 盘上每个角色 skill 都必须在映射表里出现（新 skill 不登记 = 红）；
//   ② 六个生命周期环节在表里都有落点行（环节被删/改名 = 红）；
//   ③ 信噪比三机制（来源分级 / 交叉验证 / 反例/弃用）确实写在角色 skill 里，不只是写在设计文档里。
//
// 边界（诚实记账）：本测试只证"映射表与 skill 盘面互相对得上"，不证"映射的语义正确"——
// 后者归 L3 的人工审查与 critic 狩猎；也不证 skill 内容真的被执行（那是 L4 真模型档）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const MAP = join(ROOT, 'docs', 'design', '30-methodology-mapping.md')
const PRESETS = join(ROOT, 'packages', 'deep-research-pack', 'presets')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

/** 盘上全部角色 skill（`presets/<role>/skills/<name>/SKILL.md`），返回 [{name, role, dir}]。 */
function skillsOnDisk() {
  const out = []
  for (const role of readdirSync(PRESETS)) {
    const dir = join(PRESETS, role, 'skills')
    if (!existsSync(dir)) continue
    for (const name of readdirSync(dir)) {
      if (existsSync(join(dir, name, 'SKILL.md'))) out.push({ name, role, dir: join(dir, name) })
    }
  }
  return out
}

test('L3-1：六个生命周期环节在映射表里各有落点行', () => {
  const text = read('docs/design/30-methodology-mapping.md')
  const stages = ['立项对齐', '广度侦察', '深度挖掘', '综合写作', '质量把关', '审阅交付']
  const rows = text.split('\n').filter((l) => l.startsWith('|'))
  assert.ok(rows.length >= 10, `映射表行数异常少（${rows.length}）——防空语料`)
  const missing = stages.filter((stage) => !rows.some((row) => row.includes(stage)))
  assert.deepEqual(missing, [], `映射表缺生命周期环节的落点行：${missing.join('、')}`)
})

test('L3-1：盘上每个角色 skill 都在映射表登记了落点（新 skill 不登记 = 红）', () => {
  const text = read('docs/design/30-methodology-mapping.md')
  const skills = skillsOnDisk()
  assert.ok(skills.length >= 8, `防空语料：盘上 skill 过少（${skills.length}）`)
  const missing = skills.filter((s) => !text.includes(`\`${s.name}\``) && !text.includes(s.name))
    .map((s) => `${s.role}/${s.name}`)
  assert.deepEqual(missing, [],
    `以下 skill 在 L3 映射表里没有落点（判据 1 要求每个环节的载体可追溯）：${missing.join('、')}`
    + '——若它是新机制，补一行"codex 环节 / 本插件载体 / 状态"；若它属既有环节，把名字写进该行的载体列')
})

test('L3-4：信噪比三机制写在角色 skill 里（不是只写在设计文档里）', () => {
  const scout = read('packages/deep-research-pack/presets/scout/skills/lead-mapping/SKILL.md')
  const analyst = read('packages/deep-research-pack/presets/analyst/skills/evidence-extraction/SKILL.md')
  // ① 来源质量分级（A–D）② 多源交叉验证 ③ 反例/弃用判据
  assert.ok(/A[–-]D/.test(scout) && scout.includes('分级'), 'scout 的 lead-mapping 缺来源质量分级（A–D）')
  assert.ok(analyst.includes('交叉验证'), 'analyst 的 evidence-extraction 缺多源交叉验证')
  assert.ok(analyst.includes('反例'), 'analyst 的 evidence-extraction 缺反例纪律')
  const map = read('docs/design/30-methodology-mapping.md')
  assert.ok(map.includes('信噪比'), 'design/30 未承载判据 4 的信噪比策略说明')
})
