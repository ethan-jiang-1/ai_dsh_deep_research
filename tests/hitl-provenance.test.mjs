// hitl-answer 代答 provenance 写盘回归（BUG-014 正修）——代理模拟必须真落 §Decisions/journal，
// 不许只打印承诺（BUG-014 症状实录：驱动输出声称"写进 bundle 的 question.md §Decisions 与
// journal.md"，两文件零命中，拍板行误归因"用户"）。立红记录：2026-10-05 首跑 = 模块缺席即红；
// 反证（缺件 fail-loud）同套钉住。红绿实录见 BUG-014 卡修复关联。
//
// 负例留证 2026-10-09：BUG-014（补记，正修红录见卡）——batchToAnswered 批缺席返回 null /
//   丢 id 标签（provenance 数据源缺席）→「盘侧 answer 批」测红；还原 → 绿。
// 负例留证 2026-10-09：BUG-017——空 id 走 ?? 链不回退 header（旧实现即红形态：空题面落盘）→
//   「questions 富集」deepEqual 红；还原 → 绿。
// 负例留证 2026-10-11：BUG-020——代答 provenance 归属旧实现 = 工作区根 drt_* 字典序
//   （bundleStateOf().activeBundle），无关在飞 bundle 在场 + 新 run 未实例化时误归（MCP run
//   三问卡与 sibling 卡两次误落 drt_cn-moe-2026）。红绿三段：
//   ① 旧调用方形态对同 fixtures 演算 = 'drt_zeta'（字典序）≠ 归属期望 'drt_beta'——一次性
//      演算留痕于 BUG-020 卡修复关联（bundleStateOf 契约本体由 tests/run-state.test.mjs 钉）；
//   ② 归属谓词裸形态（写/读命中都归属）→「仅读命中」两用例红（read-misattribution 洞）；
//   ③ 收紧为「仅写命中归属，仅读一律延迟」→ 全绿（误归代价 ≫ 延迟代价的不对称裁决）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { provenanceLines, appendProvenance, batchToAnswered, attributionBundleOf } from '../scripts/lib/hitl-provenance.mjs';

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

// ── attributionBundleOf（BUG-020 正修）：归属 = 被答会话自己的 bundle-bind，字典序全废 ──
// fixtures 事件构造（wire 形状：data.arguments 为 JSON 字符串——与真 journal 一致）。
const call = (name, args) => ({ type: 'tool/call', data: { name, arguments: JSON.stringify(args) } });
const writeInto = (slug) => call('write', { file_path: `drt_${slug}/question.md`, content: '# Q' });
const readInto = (slug) => call('read', { file_path: `drt_${slug}/journal.md` });
const kickoffAsk = () => call('ask_user_question', { questions: [{ header: '研究类型', options: [] }] });

test('attributionBundleOf：归属 = 被答会话写命中；字典序更晚的无关在场 bundle 不参与（BUG-020 主反例）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hitl-attr-'));
  try {
    // 盘上两个在飞 bundle：被答会话写的是 beta，字典序更晚的 zeta 是无关停滞 run
    for (const s of ['beta', 'zeta']) mkdirSync(join(dir, `drt_${s}`));
    assert.equal(attributionBundleOf([writeInto('beta')]), 'beta');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('attributionBundleOf：仅读命中不归属（读 = 预检或恢复，写缺席即证据不足——延迟补记）', () => {
  // 恢复会话「继续 drt_gamma」形态：只有读。保守延迟而非归属（误归代价 ≫ 延迟代价）。
  assert.equal(attributionBundleOf([readInto('gamma')]), null);
});

test('attributionBundleOf：立项预检的仅读命中不归属（BUG-020 实测误归路径——三问卡时窗）', () => {
  // 新会话立项：research-brief/ask 信号 + 预检读过旧 bundle——新 bundle 未实例化 → 延迟
  assert.equal(attributionBundleOf([kickoffAsk(), readInto('alpha')]), null);
  assert.equal(attributionBundleOf([call('skill', { name: 'research-brief' }), readInto('alpha')]), null);
});

test('attributionBundleOf：无任何绑定 → null（零 bundle 与预检期同走延迟分支）', () => {
  assert.equal(attributionBundleOf([kickoffAsk()]), null);
  assert.equal(attributionBundleOf([]), null);
});

test('attributionBundleOf：写命中盖过立项窗口的预检读（计划确认卡形态——定稿写入后归属新 bundle）', () => {
  assert.equal(attributionBundleOf([kickoffAsk(), readInto('old'), writeInto('new')]), 'new');
});
