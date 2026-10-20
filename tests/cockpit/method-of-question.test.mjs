// 「本次研究」区折算回归（method-of-question）——面板五态 + 方法节解析（子卡① ①-1／①-6）。
// 判读原则：判不了就说判不了，**绝不回落成默认打法名**（旧 run 未记录 = 合法形态，不回填）。
// 红证：任一态退化成"借用默认名"或解析器放宽到臆断即红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adoptedNameOf, foldMethodAdoption, parseMethodSection } from '../../packages/deep-research-pack/src/lib/method-of-question.ts';

const QUESTION_FULL = [
  '# Question — drt_demo',
  '',
  '## 研究问题（定稿）',
  '',
  '某问题',
  '',
  '## 研究方法（本次实际采用）',
  '',
  '- 采用: **领域地图**（主）——风险与实践地图式分节；研究侧结论按"方案比较"的检验纪律处理',
  '- 来源: 接受推荐（官方/一手优先，第三方只作线索与旁证）',
  '- 调查要求: ①同一批官方页只钻一遍；②每类关键结论 ≥2 独立注册域',
  '- 明确不承诺: 不做排行榜式绝对排名',
  '',
  '## HITL1 Alignment Snapshot',
  '',
  '- 研究类型: exploratory_map',
].join('\n');

test('foldMethodAdoption：无 run → no-run（不借 question 文本凑态）', () => {
  const s = foldMethodAdoption(QUESTION_FULL, { bundle: false, question: false });
  assert.equal(s.kind, 'no-run');
  assert.equal(s.adopted, null);
});

test('foldMethodAdoption：绑定在场但 question.md 缺 → missing', () => {
  assert.equal(foldMethodAdoption(null, { bundle: true, question: false }).kind, 'missing');
});

test('foldMethodAdoption：question 在但无方法节 → unrecorded（旧 run 合法形态，不回填）', () => {
  const text = '# Question\n\n## 研究问题（定稿）\n\n某问题\n';
  const s = foldMethodAdoption(text, { bundle: true, question: true });
  assert.equal(s.kind, 'unrecorded');
  assert.equal(s.adopted, null);
});

test('foldMethodAdoption：方法节在但「采用」行缺/空 → unrecorded（不是无法判定）', () => {
  const noLine = '## 研究方法（本次实际采用）\n\n- 来源: 接受推荐\n';
  assert.equal(foldMethodAdoption(noLine, { bundle: true, question: true }).kind, 'unrecorded');
  const empty = '## 研究方法（本次实际采用）\n\n- 采用:\n- 来源: 接受推荐\n';
  assert.equal(foldMethodAdoption(empty, { bundle: true, question: true }).kind, 'unrecorded');
});

test('foldMethodAdoption：模板占位符「采用」行 → unparsable（在场但读不出，不臆断）', () => {
  const text = '## 研究方法（本次实际采用）\n\n- 采用: <事实核查 | 领域地图 | 主张核查 | 方案比较 | 自动采用（quick_factual 默认）| 用户自定义描述>\n';
  const s = foldMethodAdoption(text, { bundle: true, question: true });
  assert.equal(s.kind, 'unparsable');
  assert.equal(s.adopted, null);
});

test('foldMethodAdoption：真实加粗带括注形态 → recorded，取方法名本体', () => {
  const s = foldMethodAdoption(QUESTION_FULL, { bundle: true, question: true });
  assert.equal(s.kind, 'recorded');
  assert.equal(s.adopted, '领域地图');
  assert.equal(s.origin, '接受推荐（官方/一手优先，第三方只作线索与旁证）');
  assert.ok(s.requirements.startsWith('①同一批官方页只钻一遍'), '调查要求首段在场');
});

test('foldMethodAdoption：简单值与自动采用 → recorded（不动用默认名，如实取原文）', () => {
  const plain = '## 研究方法（本次实际采用）\n\n- 采用: 方案比较\n';
  assert.equal(foldMethodAdoption(plain, { bundle: true, question: true }).adopted, '方案比较');
  const auto = '## 研究方法（本次实际采用）\n\n- 采用: 自动采用（quick_factual 默认）\n';
  assert.equal(foldMethodAdoption(auto, { bundle: true, question: true }).adopted, '自动采用');
});

test('parseMethodSection：截取到下一个 ## 标题为止（不误读 Snapshot 段的字段）', () => {
  const text = '## 研究方法（本次实际采用）\n\n- 来源: 推荐接受\n\n## HITL1 Alignment Snapshot\n\n- 采用: 不该被读到\n';
  const section = parseMethodSection(text);
  assert.equal(section.sectionSeen, true);
  assert.equal(section.adoptedRaw, null);
  assert.equal(section.origin, '推荐接受');
});

test('adoptedNameOf：截断点覆盖括注/破折号/分句符；空与占位符 → null', () => {
  assert.equal(adoptedNameOf('**事实核查**（含数据表档）'), '事实核查');
  assert.equal(adoptedNameOf('时间线与信号——按官方节点排'), '时间线与信号');
  assert.equal(adoptedNameOf('方案比较；含选型'), '方案比较');
  assert.equal(adoptedNameOf('   '), null);
  assert.equal(adoptedNameOf('<…>'), null);
  assert.equal(adoptedNameOf('**'), null);
});

test('no run 负例：四个非 recorded 态一律不携带默认打法名（互补案例）', () => {
  const cases = [
    foldMethodAdoption('## 研究方法（本次实际采用）\n\n- 采用: 方案比较\n', { bundle: false, question: false }),
    foldMethodAdoption(null, { bundle: true, question: false }),
    foldMethodAdoption('# Question\n', { bundle: true, question: true }),
    foldMethodAdoption('## 研究方法（本次实际采用）\n\n- 采用: <…>\n', { bundle: true, question: true }),
  ];
  for (const s of cases) {
    assert.notEqual(s.kind, 'recorded');
    assert.equal(s.adopted, null, `${s.kind} 不得携带方法名（不回落默认）`);
  }
});
