// skill-golden.test.mjs — skill 正文 sha256 金标准（BUG-258）。
//
// 负例留证 2026-11-18：BUG-258 / BUG-290 / BUG-293——改任一 SKILL.md 正文 → 本测试红（快照 B 只比 catalog，抓不到）；
// 还原 → 绿；金标准为空 → 红（防空语料）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillBodyManifest, skillGoldenIssues } from '../../../checks/lib/shared/skill-golden.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const GOLDEN = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'skill-golden', 'manifest.json'), 'utf8')).skills

test('skill 正文 = 金标准哈希；随包 + .agents 新增/删除/改动都必须显式重录（BUG-258 / BUG-290 / BUG-293）', () => {
  const actual = skillBodyManifest(ROOT)
  assert.ok(actual.length >= 10, `防空语料：skill 过少（${actual.length}）`)
  assert.deepEqual(skillGoldenIssues(actual, GOLDEN), [])
  const tampered = GOLDEN.map((e, i) => (i === 0 ? { ...e, sha256: '0'.repeat(64) } : e))
  assert.ok(skillGoldenIssues(actual, tampered).some((issue) => issue.includes('正文变更')))
  assert.ok(skillGoldenIssues(actual, GOLDEN.slice(1)).some((issue) => issue.includes('新增 skill 未入金标准')))
  assert.deepEqual(skillGoldenIssues(actual, []), ['skill 金标准为空——防空语料（先跑 record-skill-golden.mjs --update）'])
})
