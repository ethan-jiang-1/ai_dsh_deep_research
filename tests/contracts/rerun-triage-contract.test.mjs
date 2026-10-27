// rerun 不满转接层 · 跨面契约 — 词表/选项/报告末节/只读出口在三处文本与两个组件里必须同源。
// 为什么存在：这层的主体是**模型可见文本 + 用户可见文案**，机械面只能钉"三处说的是同一件事"，
// 钉不住"模型真的按它回话"（后者 = 真模型探针 + 人读）。本测试的失败面 = 任一处措辞漂回旧词。
// 负例留证 2026-10-28：把 synthesis SKILL 里的「定稿（按现稿交付）」改成「定稿（sabotage）」→
//   第 1 例「三选项三处逐字同源」红；还原 → 绿。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const PERSONA = 'packages/deep-research-pack/presets/lead.patch.yml'
const HANDBOOK = 'research-workspace/AGENTS.md'
const SYNTHESIS = 'packages/deep-research-pack/presets/lead/skills/synthesis/SKILL.md'
const TEMPLATE = 'research-workspace/templates/run/final.md'
const SKILL = 'packages/deep-research-pack/presets/lead/skills/rerun-triage/SKILL.md'

// 三选项标签（实施约定：推荐项置首且以 (Recommended) 结尾；括号内 = 后果，用户看得懂的那句话）。
const OPTIONS = {
  commit: '定稿（按现稿交付）',
  more: '补研究（补哪块看报告末节；会出新版本）',
  rewrite: '改说法（只改措辞，版本不变）',
}

test('HITL2 三选项在 persona / 手册 / synthesis 三处逐字同源且都带后果', () => {
  for (const rel of [PERSONA, HANDBOOK, SYNTHESIS]) {
    const text = read(rel)
    for (const label of Object.values(OPTIONS)) {
      assert.ok(text.includes(label), `${rel} 缺选项「${label}」（三处必须逐字同源）`)
    }
    // 后果句必须带版本后果（用户最关心的代价）
    assert.match(text, /版本不变/, `${rel} 缺「改说法」的版本不变后果`)
    assert.match(text, /新版本|vN\+1|下一版/, `${rel} 缺「补研究」的新版本后果`)
  }
  // 推荐项置首且以 (Recommended) 结尾（persona 的硬格式规则）
  assert.match(read(PERSONA), /定稿（按现稿交付）\(Recommended\)/, 'persona 的推荐项必须逐字以 (Recommended) 结尾')
})

test('HITL2 卡守 ≤200 字且题干给三个用户词（不新增问题）', () => {
  for (const rel of [PERSONA, SYNTHESIS]) {
    const text = read(rel)
    assert.match(text, /≤\s*200\s*字/, `${rel} 缺 ≤200 字约束`)
    assert.match(text, /太浅/, `${rel} 缺用户词「太浅」`)
    assert.match(text, /方向不对/, `${rel} 缺用户词「方向不对」`)
    assert.match(text, /太长/, `${rel} 缺用户词「太长」`)
  }
})

test('persona 的交付四步与 D28 一致：present 指 final/vN，final/ 是交付副本', () => {
  const p = read(PERSONA)
  assert.match(p, /present[^\n]{0,40}final\/vN/, 'persona 的 present 必须指 final/vN')
  assert.equal(/present 声明当前版（run 根 final\.md）/.test(p), false, '旧句「present 当前版 final.md」与门②冲突')
  assert.match(p, /交付副本/, 'persona 必须把 final/ 表述为交付副本')
})

test('报告末节：模板含两节 + quick_factual 缩略；synthesis 写成完成判据', () => {
  const t = read(TEMPLATE)
  assert.ok(t.includes('## 下一版优先项'), 'final 模板缺「下一版优先项」节')
  assert.ok(t.includes('## 什么会改变建议'), 'final 模板缺「什么会改变建议」节')
  assert.match(t, /quick_factual[^\n]*(缩略|一行)/, '模板缺 quick_factual 缩略形态')
  const s = read(SYNTHESIS)
  assert.match(s, /下一版优先项/, 'synthesis 未引用「下一版优先项」')
  assert.match(s, /什么会改变建议/, 'synthesis 未引用「什么会改变建议」')
})

test('L1 词表：skill 七类说法 / 四种手段 / 五条纪律，且被 persona 指向', () => {
  assert.ok(existsSync(join(ROOT, SKILL)), 'rerun-triage skill 不存在')
  const k = read(SKILL)
  for (const word of ['太浅', '方向不对', '结论跟我知道的不一样', '数据过时', '太长', '来源不合规', '过程我不放心']) {
    assert.ok(k.includes(word), `词表缺类别「${word}」`)
  }
  for (const method of ['补研究', '结构性重跑', '表述修订', 'steer']) {
    assert.ok(k.includes(method), `词表缺手段「${method}」`)
  }
  for (const discipline of ['先复述', '至多两个手段', '范围只从报告来', '不动手', '不自动分类']) {
    assert.ok(k.includes(discipline), `纪律缺「${discipline}」`)
  }
  assert.match(read(PERSONA), /rerun-triage/, 'persona 未指向 rerun-triage skill（交付前/后不满都说明书）')
})

test('L3 只读出口：两组件共用 src/lib 常量，且不引入动作按钮', () => {
  const lib = 'packages/deep-research-pack/src/lib/rerun-triage.ts'
  assert.ok(existsSync(join(ROOT, lib)), 'rerun-triage 文案常量模块不存在')
  for (const rel of ['packages/deep-research-pack/src/client/ResearchStatusTab.tsx', 'packages/deep-research-pack/src/client/ResearchFinalTab.tsx']) {
    const c = read(rel)
    assert.ok(c.includes("lib/rerun-triage.ts"), `${rel} 未引用共享常量`)
  }
  const libText = read(lib)
  assert.match(libText, /三种改法/, '常量缺折叠块标题')
  assert.match(libText, /这份/, '常量缺可复制的一句话')
  assert.equal(/spawn|send_message|team_task|run-accept/.test(libText), false, '常量模块不得含动作面（只读出口）')
})

test('词表与出口不新增交互点：手册两点交互句仍在场', () => {
  const h = read(HANDBOOK)
  assert.match(h, /只有两个人机交互点/, '手册的两点交互句被改动——本卡不得加第三颗 ◆')
})
