// hitl-answer 代答 provenance 写盘回归（BUG-014 正修）——代理模拟必须真落 §Decisions/journal，
// 不许只打印承诺（BUG-014 症状实录：驱动输出声称"写进 bundle 的 question.md §Decisions 与
// journal.md"，两文件零命中，拍板行误归因"用户"）。立红记录：2026-10-05 首跑 = 模块缺席即红；
// 反证（缺件 fail-loud）同套钉住。红绿实录见 BUG-014 卡修复关联。
//
// 负例留证 2026-10-09：BUG-014（补记，正修红录见卡）——batchToAnswered 批缺席返回 null /
//   丢 id 标签（provenance 数据源缺席）→「盘侧 answer 批」测红；还原 → 绿。
// 负例留证 2026-10-09：BUG-017——空 id 走 ?? 链不回退 header（旧实现即红形态：空题面落盘）→
//   「questions 富集」deepEqual 红；还原 → 绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { provenanceLines, appendProvenance, batchToAnswered } from '../scripts/lib/hitl-provenance.mjs';

const ANSWERED = [
  { step: 1, prompt: '定稿还是补研究？', selected: '按现稿定稿交付（Recommended）' },
];

test('batchToAnswered：盘侧 answer 批 → answered 形态（id 作标签——UI 预选零点击形态的 provenance 数据源，BUG-014 第二缺口）', () => {
  const batch = [
    { id: 'delivery_review', selected: ['按现稿定稿（Recommended）'] },
    { id: 'research_type', selected: ['探索性全景（Recommended）'] },
  ];
  assert.deepEqual(batchToAnswered(batch), [
    { step: 1, prompt: 'delivery_review', selected: '按现稿定稿（Recommended）' },
    { step: 2, prompt: 'research_type', selected: '探索性全景（Recommended）' },
  ]);
  assert.deepEqual(batchToAnswered(null), [], '批缺席 → 空数组（不猜）');
});

test('batchToAnswered：questions 富集（BUG-017——空 id 不再落空题面；mcp-hosts 实证 Q1「」形态）', () => {
  const questions = [
    { id: 'delivery_review', header: '交付审阅', prompt: '成稿质量如何，是否定稿？', options: [] },
    { id: 'research_type', header: '研究类型', prompt: '这是什么类型的研究？', options: [] },
  ];
  // 空 id（'' 非 nullish，旧实现 ?? 链不回退 → 空题面）+ 位序 join → header 标签
  assert.deepEqual(
    batchToAnswered([{ id: '', selected: ['按现稿定稿（Recommended）'] }], questions),
    [{ step: 1, prompt: '交付审阅', selected: '按现稿定稿（Recommended）' }],
  );
  // id join 优先于位序（乱序批）
  assert.equal(batchToAnswered([{ id: 'research_type', selected: ['x'] }], questions)[0].prompt, '研究类型');
  // 无 questions 时 id 仍在（既有行为不变）
  assert.equal(batchToAnswered([{ id: 'research_type', selected: ['x'] }])[0].prompt, 'research_type');
  // 无任何可解析标签 → 诚实标记而非空串（空串 = 静默，与「显性化而不是静默」纪律相悖）
  assert.equal(batchToAnswered([{ selected: ['x'] }], [])[0].prompt, '（题面缺席）');
});

test('provenanceLines：两行都带代理模拟标注、作答内容与日期', () => {
  const lines = provenanceLines({ date: '2026-10-05', pick: 'recommended', answered: ANSWERED });
  assert.ok(lines.decisions.includes('操作侧代理模拟'), '§Decisions 行缺代理模拟标注');
  assert.ok(lines.decisions.includes('按现稿定稿交付'), '§Decisions 行缺作答内容');
  assert.ok(lines.decisions.includes('2026-10-05'), '§Decisions 行缺日期');
  assert.ok(lines.decisions.includes('hitl-answer'), '§Decisions 行缺驱动名');
  assert.ok(lines.journal.includes('hitl-answer'), 'journal 行缺驱动名');
  assert.ok(lines.journal.includes('代理模拟'), 'journal 行缺代理模拟标注');
});

test('appendProvenance：两文件各追加一行；二次调用 = 两行（追加式，不改写既有内容）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hitl-prov-'));
  const bundle = join(dir, 'drt_probe');
  mkdirSync(bundle);
  writeFileSync(join(bundle, 'question.md'), '# Question\n\n## Decisions\n\n- 旧拍板行\n');
  writeFileSync(join(bundle, 'journal.md'), '# Journal\n\n- 旧记账行\n');
  try {
    const written = appendProvenance({ bundle, date: '2026-10-05', pick: 'recommended', answered: ANSWERED });
    assert.ok(written.question.endsWith('question.md'), '返回的 question 路径异常');
    const q = readFileSync(join(bundle, 'question.md'), 'utf8');
    const j = readFileSync(join(bundle, 'journal.md'), 'utf8');
    assert.ok(q.includes('- 旧拍板行'), 'question.md 既有内容被改写');
    assert.ok(q.includes('操作侧代理模拟'), 'question.md 未落代理模拟行');
    assert.ok(j.includes('hitl-answer'), 'journal.md 未落记账行');
    assert.ok((q.match(/操作侧代理模拟/g) ?? []).length === 1, 'question.md 追加次数异常');
    appendProvenance({ bundle, date: '2026-10-05', pick: 'recommended', answered: ANSWERED });
    const q2 = readFileSync(join(bundle, 'question.md'), 'utf8');
    assert.ok((q2.match(/操作侧代理模拟/g) ?? []).length === 2, '幂等追加失败（二次应两行）');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('appendProvenance：缺件 fail-loud——bundle 缺 journal.md 即抛并报出文件名，不静默', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hitl-prov-neg-'));
  const bundle = join(dir, 'drt_probe');
  mkdirSync(bundle);
  writeFileSync(join(bundle, 'question.md'), '# Q\n');
  try {
    assert.throws(
      () => appendProvenance({ bundle, date: '2026-10-05', pick: 'recommended', answered: ANSWERED }),
      /journal\.md/,
      '缺 journal.md 应 fail-loud 报出文件名',
    );
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
