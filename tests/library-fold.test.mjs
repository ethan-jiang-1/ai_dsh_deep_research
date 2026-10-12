// 方法库折算回归（library-fold）——「研究配置」页签数据面（D25 期 1 + detail-ux 期 1.5）。
// 四字段新格式 + 旧格式兼容 + 解析容错 + 指令生成（管理动词正本 = research-brief skill；
// 面板只生成不直写）。红证：模块缺席/断言松绑即红（node --test 直接可验）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foldLibrary, instructionOf, editInstruction, createInstruction } from '../packages/deep-research-pack/src/lib/library-fold.ts';

const v2 = [
  '# 用户方法库（Lead 维护；仅用户显式要求时写入）',
  '',
  '## 只看官方来源（2026-10-12，源自 drt_demo）',
  '- 找来源: 官方/原始来源优先，第三方只作线索',
  '- 怎么核实: 关键来源独立重抓；单源结论显式标注',
  '- 报告怎么写: 答案+口径+依据+限制',
  '- 不承诺: 不做领域覆盖',
  '',
  '## 实惠优先〔默认偏好〕（2026-10-12，源自对话）',
  '- 找来源: 厂商定价页与真实使用反馈并重',
  '- 怎么核实: 口径对齐才可比',
  '- 报告怎么写: 维度化对比+取舍说明',
  '- 不承诺: 不替用户决定偏好',
].join('\n');

const legacy = [
  '## 只看官方来源（2026-10-12，源自 drt_demo）',
  '- 调查要求: 官方/原始来源优先，第三方只作线索',
  '- 适用说明: 核查类问题最稳',
].join('\n');

test('foldLibrary：四字段新格式 → sections 齐 + 名称剥〔〕/（）+ 默认标注 + 来源注记', () => {
  const entries = foldLibrary(v2);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].name, '只看官方来源');
  assert.equal(entries[0].provenance, '2026-10-12，源自 drt_demo');
  assert.equal(entries[0].isDefault, false);
  assert.deepEqual(entries[0].sections, {
    source: '官方/原始来源优先，第三方只作线索',
    verify: '关键来源独立重抓；单源结论显式标注',
    report: '答案+口径+依据+限制',
    limit: '不做领域覆盖',
  });
  assert.equal(entries[1].name, '实惠优先');
  assert.equal(entries[1].isDefault, true);
  assert.equal(entries[1].legacyText, null);
});

test('foldLibrary：旧格式兼容 → legacyText 在、sections 全 null（不编造）', () => {
  const entries = foldLibrary(legacy);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].sections.source, null);
  assert.equal(entries[0].legacyText, '- 调查要求: 官方/原始来源优先，第三方只作线索\n- 适用说明: 核查类问题最稳');
});

test('foldLibrary：null / 空白 / 无条目 / 只有名字 → 容错不抛', () => {
  assert.deepEqual(foldLibrary(null), []);
  assert.deepEqual(foldLibrary('   \n  '), []);
  assert.deepEqual(foldLibrary('# 只有标题\n散文一段'), []);
  const bare = foldLibrary('## 只有名字（2026-10-12）\n');
  assert.equal(bare[0].name, '只有名字');
  assert.equal(bare[0].sections.source, null);
});

test('editInstruction：新格式整条四字段；旧格式整段载荷', () => {
  const [e0, e1] = foldLibrary(v2);
  assert.equal(editInstruction(e0),
    '把研究偏好「只看官方来源」改为：找来源=官方/原始来源优先，第三方只作线索；怎么核实=关键来源独立重抓；单源结论显式标注；报告怎么写=答案+口径+依据+限制；不承诺=不做领域覆盖');
  const [l0] = foldLibrary(legacy);
  assert.equal(editInstruction(l0), '把研究偏好「只看官方来源」改为：官方/原始来源优先，第三方只作线索；核查类问题最稳');
});

test('createInstruction：基于内置新建（名称 + 四字段 + 来源标注）', () => {
  const [e0] = foldLibrary(v2);
  assert.equal(createInstruction('我的地图', e0.sections, '领域地图'),
    '新建研究偏好「我的地图」——找来源：官方/原始来源优先，第三方只作线索；怎么核实：关键来源独立重抓；单源结论显式标注；报告怎么写：答案+口径+依据+限制；不承诺：不做领域覆盖（基于内置「领域地图」调整）');
});

test('instructionOf：三个简单动词逐字（正本 = skill 管理动词）', () => {
  assert.equal(instructionOf('use-now', '只看官方来源'), '本次研究请按我保存的研究偏好「只看官方来源」来做');
  assert.equal(instructionOf('set-default', '实惠优先'), '把研究偏好「实惠优先」设为以后的默认');
  assert.equal(instructionOf('remove', '实惠优先'), '删掉研究偏好「实惠优先」');
});
