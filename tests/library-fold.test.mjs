// 方法库折算回归（library-fold）——「研究配置」页签数据面（D25 期 1 + detail-ux 期 1.5）。
// 四字段新格式 + 旧格式兼容 + 解析容错 + 指令生成（管理动词正本 = research-brief skill；
// 面板只生成不直写）。红证：模块缺席/断言松绑即红（node --test 直接可验）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foldLibrary, instructionOf, editInstruction, createInstruction } from '../packages/deep-research-pack/src/lib/library-fold.ts';
import { SELFTEST_LIBRARY } from '../scripts/lib/selftest-library.mjs';

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

// ── 自测例电池（2026-10-13 用户委托自测轮）──例库单一正本 = scripts/lib/selftest-library.mjs
//（与 client-load-smoke 自测工作区共用，防形态漂移）。判读原则：canonical 形态 =
// research-brief skill「用户方法库」节的 Lead 写入形态；偏离形态按「如实投影不编造」钉行为
//（标「边界注记」），不静默纠正。lib 层契约由本电池钉住；组件层 legacy 渲染缺陷 = BUG-025
//（修复后由 smoke 自测工作区块对账）。
const battery = () => foldLibrary(SELFTEST_LIBRARY);

test('电池·全量四字段：sections 齐 + 来源注记', () => {
  const [e] = battery();
  assert.equal(e.name, '全量四字段');
  assert.equal(e.provenance, '2026-10-13，源自自测');
  assert.deepEqual(e.sections, { source: '官方域优先', verify: '独立重抓', report: '分节呈现', limit: '不做预测' });
  assert.equal(e.legacyText, null);
});

test('电池·部分字段：缺席为 null；〔默认偏好〕标注与来源注记并存', () => {
  const e = battery()[1];
  assert.equal(e.name, '部分字段');
  assert.equal(e.isDefault, true);
  assert.equal(e.provenance, '2026-10-13');
  assert.deepEqual(e.sections, { source: '第三方多源交叉', verify: null, report: null, limit: '不做绝对排名' });
  assert.equal(editInstruction(e), '把研究偏好「部分字段」改为：找来源=第三方多源交叉；不承诺=不做绝对排名');
});

test('电池·空值分区："- 找来源:" 无内容 → null（不编造空串）', () => {
  const e = battery()[2];
  assert.deepEqual(e.sections, { source: null, verify: '逐字转写', report: null, limit: null });
  assert.equal(editInstruction(e), '把研究偏好「空值分区」改为：怎么核实=逐字转写');
});

test('电池·旧格式（含 - 默认偏好: 行）：legacyText 整段收集；指令剥前缀分号连接', () => {
  const e = battery()[3];
  assert.equal(e.sections.source, null);
  assert.equal(e.legacyText, '- 调查要求: 广度优先铺方向\n- 适用说明: 地图类问题适用\n- 默认偏好: 曾是默认');
  assert.equal(editInstruction(e), '把研究偏好「旧格式条目」改为：广度优先铺方向；地图类问题适用；曾是默认');
});

test('电池·新旧混居：分区胜出进指令、旧文留在 legacyText——边界注记：混合态非 canonical，Lead 迁移以四字段为准（旧文不混发）', () => {
  const e = battery()[4];
  assert.equal(e.sections.source, '新字段在场');
  assert.equal(e.legacyText, '- 调查要求: 旧文残留');
  assert.equal(editInstruction(e), '把研究偏好「混合条目」改为：找来源=新字段在场');
});

test('电池·括号名：首个（起截为 provenance——边界注记：canonical 名不含括号，异常名按截断形如实投影，不抛不纠正', () => {
  const e = battery()[5];
  assert.equal(e.name, '名称');
  assert.equal(e.provenance, '带');
});

test('电池·重名：如实两条不去重（去重归 Lead——JSDoc 契约）', () => {
  const entries = battery();
  const dup = entries.filter((e) => e.name === '同名条目');
  assert.equal(dup.length, 2);
  assert.deepEqual(dup.map((e) => e.sections.source), ['第一条', '第二条']);
});

test('电池·空条目：四分区全 null + legacyText null；editInstruction → 空载荷——边界注记：语义 = 清空该条（"改为："收尾）', () => {
  const e = battery().find((x) => x.name === '空条目');
  assert.deepEqual(e.sections, { source: null, verify: null, report: null, limit: null });
  assert.equal(e.legacyText, null);
  assert.equal(editInstruction(e), '把研究偏好「空条目」改为：');
});

test('电池·杂项行：未知字段行忽略；全角冒号行不匹配分区（canonical = 半角冒号，静默忽略不编造）；### 非条目、其后分区行归上一条', () => {
  const e = battery().find((x) => x.name === '杂项行条目');
  assert.deepEqual(e.sections, { source: null, verify: '三级标题后的行归上一条', report: null, limit: null });
  assert.equal(e.legacyText, null);
});

test('电池·旧格式续行：非前缀行续入 legacyText；载荷剥前缀后分号连接', () => {
  const e = battery().find((x) => x.name === '旧格式续行');
  assert.equal(e.legacyText, '- 调查要求: 首行\n续行内容一\n续行内容二');
  assert.equal(editInstruction(e), '把研究偏好「旧格式续行」改为：首行；续行内容一；续行内容二');
});

test('电池·CRLF+缩进：\\r 被 trimEnd 消化（分区仍匹配）；前导空格分区行不匹配——边界注记：canonical 写入为顶格', () => {
  const e = battery().find((x) => x.name === '缩进行条目');
  assert.deepEqual(e.sections, { source: null, verify: '尾随空格行', report: null, limit: null });
});

test('电池·指令族与容错：部分字段 createInstruction 只载非 null；乱输入不抛、无条目不编造', () => {
  assert.equal(createInstruction('新条目', { source: 'A', verify: null, report: 'C', limit: null }, '方案比较'),
    '新建研究偏好「新条目」——找来源：A；报告怎么写：C（基于内置「方案比较」调整）');
  for (const weird of ['', '##', '## ', '##名无空格', '####### 深', '- 找来源: 孤行无条目', '## x\r- 找来源: y']) {
    assert.deepEqual(foldLibrary(weird), [], `容错输入不编造条目：${JSON.stringify(weird)}`);
  }
  assert.equal(battery().length, 12);
});
