// persona↔fold 判型签名契约（审计 P3 件③；BUG-002 回归形态）。
// hitl-fold 的 askKindOf 按 include 签名判型（'按现稿定稿'→hitl2、'研究类型'→hitl1），
// 签名词的载体 = lead persona（presets/lead.patch.yml 的 HITL 问卡指令）——persona 改词
// 而fold 不跟 = 判型静默退化 unknown（观察面把 HITL 卡显示成未知类，不报错、难归因）。
// 本测试从 fold 源码**提取**全部判型签名再断言 persona 逐字携带（不手抄第二份词表）：
// fold 换签名 → 本测试要求 persona 同 diff 换词；persona 改词 → 本测试红。
// 反证实录：临时删除 persona 的「按现稿定稿」→ 红 → 还原绿（毕业 Note 载原始输出）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FOLD = join(ROOT, 'packages/deep-research-pack/src/lib/hitl-fold.ts')
const PERSONA = join(ROOT, 'packages/deep-research-pack/presets/lead.patch.yml')

const foldSrc = readFileSync(FOLD, 'utf8')
const persona = readFileSync(PERSONA, 'utf8')

test('判型签名提取非空（防空语料）：fold 判型结构变化时先改本测试的提取正则', () => {
  const sigs = [...foldSrc.matchAll(/text\.includes\('([^']+)'\)/g)].map((m) => m[1])
  assert.ok(sigs.length >= 2, `从 hitl-fold.ts 提取到 ${sigs.length} 个判型签名——askKindOf 结构或本测试正则漂移，fail-loud 不静默`)
})

test('persona↔fold 签名契约：fold 的每个判型签名都被 lead persona 逐字携带', () => {
  const sigs = [...foldSrc.matchAll(/text\.includes\('([^']+)'\)/g)].map((m) => m[1])
  for (const s of sigs) {
    assert.ok(
      persona.includes(s),
      `lead persona 缺 hitl-fold 判型签名「${s}」——改词会使 askKindOf 判型静默退化 unknown（BUG-002 形态）；persona 措辞与 hitl-fold.ts askKindOf 必须同 diff 对齐`,
    )
  }
})
