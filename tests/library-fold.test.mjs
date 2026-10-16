// 方法库折算回归（library-fold）——「研究配置」页签数据面（D25 期 1 + detail-ux 期 1.5）。
// 四字段新格式 + 旧格式兼容 + 解析容错 + 指令生成（管理动词正本 = research-brief skill；
// 面板只生成不直写）。红证：模块缺席/断言松绑即红（node --test 直接可验）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { foldLibrary, instructionOf, editInstruction, createInstruction } from '../packages/deep-research-pack/src/lib/library-fold.ts';
import { SELFTEST_LIBRARY } from '../scripts/lib/selftest-library.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const METHOD_PRESETS_SKILL = join(ROOT, 'packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md');
const CLIENT_PREFERENCES_SOURCE = join(ROOT, 'packages/deep-research-pack/src/client/ResearchConfigTab.tsx');
const METHOD_PRESET_HEADERS = ['方法', '给用户的一句话', '信息源策略', '检验策略', '综合与呈现', '明确不承诺'];

// Expected projection is deliberately independent from the client constant and parsed from the canonical skill.
const EXPECTED_BUILTIN_PREFERENCES = [
  {
    name: '事实核查',
    sections: {
      source: '官方/原始来源优先，第三方只作线索',
      verify: '逐字转写核对；关键来源独立重抓；单源结论显式标注',
      report: '快答首屏：答案+口径+依据+限制',
      limit: '不做领域覆盖；"快"由深度决定',
    },
  },
  {
    name: '领域地图',
    sections: {
      source: '广度优先铺方向，多类来源交叉定位阵营',
      verify: '覆盖对账：每个子域至少一条可核来源；盲点显式标注',
      report: '地图式：分节定位+关系+时效边界',
      limit: '不把未覆盖说成不存在',
    },
  },
  {
    name: '主张核查',
    sections: {
      source: '对称检索：正反同权重；追原始出处',
      verify: '反例权重最高；判定四态（成立/部分/不成立/证据不足）',
      report: '判定+证据强度分级+最强反证单列',
      limit: '不预设真伪；不做只找赞同的检索',
    },
  },
  {
    name: '方案比较',
    sections: {
      source: '各选项同维度查证；厂商资料与实际使用反馈并重',
      verify: '口径对齐才可比；价值权衡与事实分开',
      report: '维度化对比+适用情境+取舍说明',
      limit: '不替用户决定偏好；无场景不推唯一答案',
    },
  },
];

function markdownTableCells(line) {
  const cells = [];
  let cell = '';
  let codeTicks = 0;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '`') {
      let count = 1;
      while (line[i + count] === '`') count++;
      codeTicks = codeTicks === 0 ? count : codeTicks === count ? 0 : codeTicks;
      cell += '`'.repeat(count);
      i += count - 1;
    } else if (char === '\\' && line[i + 1] === '|') {
      cell += '|';
      i++;
    } else if (char === '|' && codeTicks === 0) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  if (cells[0] === '') cells.shift();
  if (cells.at(-1) === '') cells.pop();
  return cells;
}

// 「给用户的一句话」列（方法预设表第 2 列，2026-10-15 卡第 2 条）：该列是**模型可见**表的一列
// （lead 读它回答"这个预设是干什么的"），但**客户端不投影它**——面板内置卡显示的是 sections.source。
// 此前测试解析后丢弃该列 → 改它无人咬；现按列级数据钉住（不改客户端契约：面板显示面属 D25 期 1 设计，
// 要改是产品决定，不是测试硬化）。
const EXPECTED_BUILTIN_ONE_LINERS = [
  ['事实核查', '核准具体事实/数字/状态的对象、时点与口径'],
  ['领域地图', '摸清谁在做什么、到哪一步'],
  ['主张核查', '查证一个说法是真是假'],
  ['方案比较', '把几个选项放在同一标准下比'],
];

/** 只取「给用户的一句话」列（与 builtinPreferencesFromSkill 同一次解析口径）。 */
function builtinOneLinersFromSkill() {
  const lines = readFileSync(METHOD_PRESETS_SKILL, 'utf8').split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => {
    const cells = markdownTableCells(line);
    return cells.length === METHOD_PRESET_HEADERS.length && cells.every((cell, i) => cell === METHOD_PRESET_HEADERS[i]);
  });
  assert.notEqual(headerIndex, -1, 'research-brief skill 方法预设表头缺席或发生变化');
  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (line.trim() === '' || !line.includes('|')) break;
    const cells = markdownTableCells(line);
    assert.equal(cells.length, METHOD_PRESET_HEADERS.length, '方法预设表格行列数变化');
    rows.push([cells[0], cells[1]]);
  }
  return rows;
}

function builtinPreferencesFromSkill() {
  const lines = readFileSync(METHOD_PRESETS_SKILL, 'utf8').split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => {
    const cells = markdownTableCells(line);
    return cells.length === METHOD_PRESET_HEADERS.length && cells.every((cell, i) => cell === METHOD_PRESET_HEADERS[i]);
  });
  assert.notEqual(headerIndex, -1, 'research-brief skill 方法预设表头缺席或发生变化');
  const separator = markdownTableCells(lines[headerIndex + 1] ?? '');
  assert.equal(separator.length, METHOD_PRESET_HEADERS.length, '方法预设表格分隔行列数变化');
  assert.ok(separator.every((cell) => /^:?-{3,}:?$/.test(cell)), '方法预设表格分隔行格式变化');

  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (line.trim() === '' || !line.includes('|')) break;
    const cells = markdownTableCells(line);
    assert.equal(cells.length, METHOD_PRESET_HEADERS.length, '方法预设表格行列数变化');
    rows.push({
      name: cells[0],
      sections: { source: cells[2], verify: cells[3], report: cells[4], limit: cells[5] },
    });
  }
  return rows;
}

function builtinPreferencesFromClient() {
  const source = readFileSync(CLIENT_PREFERENCES_SOURCE, 'utf8');
  const file = ts.createSourceFile(CLIENT_PREFERENCES_SOURCE, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.deepEqual(file.parseDiagnostics, [], 'ResearchConfigTab.tsx 无法由 TypeScript AST 解析');

  let initializer;
  const findDeclaration = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'BUILTIN_PREFERENCES') initializer = node.initializer;
    ts.forEachChild(node, findDeclaration);
  };
  findDeclaration(file);
  assert.ok(initializer !== undefined && ts.isArrayLiteralExpression(initializer), 'BUILTIN_PREFERENCES 必须保持为可静态对账的数组字面量');

  const objectProperties = (expression, label) => {
    assert.ok(ts.isObjectLiteralExpression(expression), `${label} 必须保持为对象字面量`);
    const properties = new Map();
    for (const property of expression.properties) {
      assert.ok(ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)), `${label} 含无法静态对账的成员`);
      const key = property.name.text;
      assert.ok(!properties.has(key), `${label} 存在重复字段 ${key}`);
      properties.set(key, property.initializer);
    }
    return properties;
  };

  const stringValue = (expression, label) => {
    assert.ok(ts.isStringLiteral(expression), `${label} 必须是字符串字面量`);
    return expression.text;
  };

  return initializer.elements.map((element, index) => {
    const label = `BUILTIN_PREFERENCES[${index}]`;
    const fields = objectProperties(element, label);
    assert.deepEqual([...fields.keys()].sort(), ['name', 'sections'], `${label} 字段形状变化`);
    return {
      name: stringValue(fields.get('name'), `${label}.name`),
      sections: Object.fromEntries([...objectProperties(fields.get('sections'), `${label}.sections`)].map(([key, value]) => [
        key,
        stringValue(value, `${label}.sections.${key}`),
      ])),
    };
  });
}

test('内置研究偏好与 research-brief 方法预设表逐字段一致', () => {
  const canonical = builtinPreferencesFromSkill();
  assert.deepEqual(builtinPreferencesFromClient(), canonical, '客户端内置偏好必须逐字段投影 canonical skill 表');
  assert.deepEqual(canonical, EXPECTED_BUILTIN_PREFERENCES, 'canonical skill 方法预设表发生了需显式审视的内容变化');
  // 列级：第 2 列「给用户的一句话」（此前只解析不判——改它无人咬）
  assert.deepEqual(builtinOneLinersFromSkill(), EXPECTED_BUILTIN_ONE_LINERS, '「给用户的一句话」列发生变化（须显式审视：它是模型可见表的一列）');
});

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
