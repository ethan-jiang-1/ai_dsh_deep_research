// hitl-answer 代答 provenance 写盘回归（BUG-014 正修）——代理模拟必须真落 §Decisions/journal，
// 不许只打印承诺（BUG-014 症状实录：驱动输出声称"写进 bundle 的 question.md §Decisions 与
// journal.md"，两文件零命中，拍板行误归因"用户"）。立红记录：2026-10-05 首跑 = 模块缺席即红；
// 反证（缺件 fail-loud）同套钉住。红绿实录见 BUG-014 卡修复关联。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { provenanceLines, appendProvenance } from '../scripts/lib/hitl-provenance.mjs';

const ANSWERED = [
  { step: 1, prompt: '定稿还是补研究？', selected: '按现稿定稿交付（Recommended）' },
];

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
