// content 覆盖守卫（keyless，纯 fs）：研究类型词表、lens 选择矩阵、run 模板消费面。
//
// 为什么存在：content/ 是模型按需读的产品内容。文件在场不等于被接线——一个 lens 可以存在
// 却从不进入题型默认集；一个模板可以存在却没有任何角色/手册点名；研究类型可以在四个面各说
// 各的。参照 company 仓 tests/content 的 coverage 做法：从盘上枚举资产，断言每个资产被消费面
// 点名、每个引用能解析，而不是维护一份会和盘上漂移的手写清单。
//
// 判据：
//   ① 研究类型闭集 = {quick_factual, exploratory_map, claim_verification}，且在 question 模板
//      的枚举、team-assembly 组队矩阵、research-brief 判型三处一致；content/presets 里不出现
//      闭集外的 `*_factual / *_map / *_verification` 词；
//   ② question-patterns 的 P1–P8 默认集表：八行齐、每行默认 lens 1–4 个且都真实存在、
//      每个 lens 至少被一行（默认或加面）点名；
//   ③ content/templates/run 每件都被 manual 或某个 persona/skill 点名；所有
//      `templates/run/<name>` 字面引用可解析；
//   ④ manual 里 `{{research_pack_root}}` 的模板根路径真实存在。
//
// 不证明：模型是否按这些内容执行（→ L4 真模型档）；模板字段级 schema（→ node-gate /
// schema-scan 的 bundle 契约）。
//
// 红配方（本次落地前实跑）：question 模板把 claim_verification 改成 claim_check → ①红；
//   P7 默认 lens 改成不存在的 ghost → ②红；新增未点名的 templates/run/orphan.md → ③红；
//   把 lead persona 的 verdicts.json 引用改成 verdicts-missing.json → ③红（引用悬空）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PACK, presetRoles, skillsOf } from './preset-helpers.mjs';
import { TEMPLATES_DIR, templateFiles } from './template-files.mjs';

const CONTENT = join(PACK, 'content');
const LENSES = join(CONTENT, 'lenses');
const MANUAL = readFileSync(join(CONTENT, 'manual.md'), 'utf8');

/** 研究类型闭集（模板、组队矩阵、判型三处共用；新增类型 = 同 diff 改本表 + 三处消费面）。 */
const RESEARCH_TYPES = ['quick_factual', 'exploratory_map', 'claim_verification'];

const read = (rel) => readFileSync(join(CONTENT, rel), 'utf8');
const allPresetText = () => presetRoles().flatMap((role) => [
  readFileSync(join(PACK, 'presets', `${role}.patch.yml`), 'utf8'),
  ...skillsOf(role).map((skill) => readFileSync(join(PACK, 'presets', role, 'skills', skill, 'SKILL.md'), 'utf8')),
]).join('\n');

test('研究类型闭集：question 模板枚举 = team-assembly 矩阵 = research-brief 判型', () => {
  const question = read('templates/run/question.md');
  const line = /^-\s*研究类型:\s*([^\n（(]+)/m.exec(question)?.[1];
  assert.ok(line, 'question.md 缺「研究类型:」行——类型没有声明面');
  const enumTypes = line.split('|').map((value) => value.trim()).filter(Boolean).sort();
  assert.deepEqual(enumTypes, [...RESEARCH_TYPES].sort(), 'question.md 的研究类型枚举漂移');

  const matrix = readFileSync(join(PACK, 'presets', 'lead', 'skills', 'team-assembly', 'SKILL.md'), 'utf8');
  const matrixTypes = matrix.split('\n')
    .filter((row) => /^\|\s*`[a-z_]+`/.test(row))
    .map((row) => /^\|\s*`([^`]+)`/.exec(row)?.[1])
    .filter(Boolean)
    .sort();
  assert.deepEqual(matrixTypes, [...RESEARCH_TYPES].sort(), 'team-assembly 组队矩阵的研究类型漂移');

  const brief = readFileSync(join(PACK, 'presets', 'lead', 'skills', 'research-brief', 'SKILL.md'), 'utf8');
  for (const type of RESEARCH_TYPES) {
    assert.ok(brief.includes(type), `research-brief 缺研究类型 ${type}`);
  }
});

test('研究类型词表不出现闭集外的近形（content + presets 全文扫描）', () => {
  const text = [MANUAL, ...readdirSync(CONTENT, { recursive: true })
    .filter((name) => typeof name === 'string' && /\.(md|json)$/.test(name))
    .map((name) => readFileSync(join(CONTENT, name), 'utf8')), allPresetText()].join('\n');
  const observed = new Set([...text.matchAll(/\b[a-z][a-z0-9]*_(?:factual|map|verification)\b/g)].map((match) => match[0]));
  const unknown = [...observed].filter((token) => !RESEARCH_TYPES.includes(token));
  assert.deepEqual(unknown, [], `出现闭集外的研究类型词：${unknown.join(', ')}（类型枚举 = ${RESEARCH_TYPES.join(' / ')}）`);
});

test('lens 选择矩阵：P1–P8 八行齐，默认 lens 1–4 个，每个 lens 至少被一行点名', () => {
  const lensIds = readdirSync(LENSES)
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.replace(/\.md$/, ''))
    .sort();
  assert.ok(lensIds.length > 0, 'content/lenses/ 为空');

  const patterns = readFileSync(join(PACK, 'presets', 'lead', 'skills', 'question-patterns', 'SKILL.md'), 'utf8');
  const rows = patterns.split('\n').filter((row) => /^\|\s*P\d+\b/.test(row));
  const seenPatterns = new Set();
  const mentionedLenses = new Set();
  for (const row of rows) {
    const cells = row.split('|').map((cell) => cell.trim());
    const pattern = /^(P\d+)/.exec(cells[1] ?? '')?.[1];
    assert.ok(pattern, `题型行缺少 P 编号：${row.slice(0, 40)}`);
    seenPatterns.add(pattern);
    const defaults = [...(cells[2] ?? '').matchAll(/`([a-z][a-z-]+)`/g)].map((match) => match[1]);
    const additions = [...(cells[3] ?? '').matchAll(/`\+?([a-z][a-z-]+)`/g)].map((match) => match[1]);
    assert.ok(defaults.length >= 1 && defaults.length <= 4,
      `${pattern}: 默认 lens 必须 1–4 个（当前 ${defaults.length}：${defaults.join(', ')}）`);
    for (const lens of [...defaults, ...additions]) {
      assert.ok(lensIds.includes(lens), `${pattern}: 引用了不存在的 lens「${lens}」`);
      mentionedLenses.add(lens);
    }
  }
  const expectedPatterns = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
  assert.deepEqual([...seenPatterns].sort(), expectedPatterns, 'question-patterns 的题型行不是 P1–P8 各一行');
  const unmentioned = lensIds.filter((id) => !mentionedLenses.has(id));
  assert.deepEqual(unmentioned, [], `lens 存在但从不进入任何题型：${unmentioned.join(', ')}`);
});

test('run 模板都有消费面，且所有 templates/run/<name> 引用可解析', () => {
  const templates = templateFiles();
  assert.ok(templates.length > 0, 'content/templates/run/ 为空');
  const surface = [MANUAL, allPresetText()].join('\n');
  for (const file of templates) {
    const stem = file.replace(/\.(md|json)$/, '');
    assert.ok(surface.includes(file) || new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(surface),
      `模板 ${file} 没有任何 manual / persona / skill 点名（孤儿模板）`);
  }
  const refs = new Set([...surface.matchAll(/templates\/run\/([A-Za-z0-9._-]+)/g)].map((match) => match[1]));
  for (const ref of refs) {
    assert.ok(templates.includes(ref), `引用了不存在的模板 templates/run/${ref}`);
  }
});

test('manual 的模板根路径真实存在', () => {
  const match = /\{\{research_pack_root\}\}\/content\/templates\/run\//.exec(MANUAL);
  assert.ok(match, 'manual 缺 {{research_pack_root}}/content/templates/run/ 模板根');
  assert.ok(existsSync(TEMPLATES_DIR), 'content/templates/run/ 目录不在场');
});
