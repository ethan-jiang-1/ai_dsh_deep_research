// 方法库折算回归（library-fold）——「研究配置」页签数据面（D25 期 1 + detail-ux 期 1.5）。
// 四字段新格式 + 旧格式兼容 + 解析容错 + 指令生成（管理动词正本 = research-brief skill；
// 面板只生成不直写）。红证：模块缺席/断言松绑即红（node --test 直接可验）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { foldLibrary, instructionOf, editInstruction, createInstruction, summaryOfEntry, SUMMARY_MAX_LENGTH, SECTION_LABELS, libraryReadStateOf } from '../packages/deep-research-pack/src/lib/library-fold.ts';
import { SELFTEST_LIBRARY } from '../scripts/lib/selftest-library.mjs';
import { locateSessionStrategy } from '../scripts/lib/web-ui-nav.mjs';
import { METHOD_PRESETS_SKILL_PATH, methodPresetsFromSkillFile, patternMethodMappingFromSkill, baselineDisciplinesFromSkill } from '../scripts/lib/method-presets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// 解析器 = scripts/lib/method-presets.mjs（与 client-load-smoke 共用的唯一解析入口；防第四份
// 手写副本漂移——总卡发现 14）。本文件只负责"客户端常量 ↔ skill 表 ↔ 期望"三方对钉。
const METHOD_PRESETS_SKILL = join(ROOT, METHOD_PRESETS_SKILL_PATH);
const CLIENT_PREFERENCES_SOURCE = join(ROOT, 'packages/deep-research-pack/src/client/ResearchConfigTab.tsx');

// Expected projection is deliberately independent from the client constant and parsed from the canonical skill.
const EXPECTED_BUILTIN_PREFERENCES = [
  {
    name: '事实核查',
    summary: '核准具体事实/数字/状态的对象、时点与口径',
    sections: {
      source: '官方/原始来源优先，第三方只作线索',
      verify: '逐字转写核对；关键来源独立重抓；单源结论显式标注',
      report: '快答首屏：答案+口径+依据+限制',
      limit: '不做领域覆盖；"快"由深度决定',
    },
  },
  {
    name: '领域地图',
    summary: '摸清谁在做什么、到哪一步',
    sections: {
      source: '广度优先铺方向，多类来源交叉定位阵营',
      verify: '覆盖对账：每个子域至少一条可核来源；盲点显式标注',
      report: '地图式：分节定位+关系+时效边界',
      limit: '不把未覆盖说成不存在',
    },
  },
  {
    name: '主张核查',
    summary: '查证一个说法是真是假',
    sections: {
      source: '对称检索：正反同权重；追原始出处',
      verify: '反例权重最高；判定四态（成立/部分/不成立/证据不足）',
      report: '判定+证据强度分级+最强反证单列',
      limit: '不预设真伪；不做只找赞同的检索',
    },
  },
  {
    name: '方案比较',
    summary: '把几个选项放在同一标准下比',
    sections: {
      source: '各选项同维度查证；厂商资料与实际使用反馈并重',
      verify: '口径对齐才可比；价值权衡与事实分开',
      report: '维度化对比+适用情境+取舍说明',
      limit: '不替用户决定偏好；无场景不推唯一答案',
    },
  },
  {
    name: '时间线与信号',
    summary: '按官方节点排时间线，用预列指标判断走到哪了',
    sections: {
      source: '官方变更点（release notes／changelog／公告／生效日）为骨，媒体报道为肉；每个节点必须落在官方出处上',
      verify: '每节点带日期与出处；「现状」标注截至时刻；先列可观察指标与阈值，再下趋势判断；趋势与事实分句',
      report: '首屏仍走既有骨架（六段或快速缩略）；正文按时间线组织（节点＋日期＋出处）→ 现状截点 → 指标读数表 → 趋势判断（显式标「判断」）→ 覆盖边界',
      limit: '不做无时间窗的预测；不把趋势判断写成事实',
    },
  },
];

// canonical 解析 = scripts/lib/method-presets.mjs（表头/行列数/防空集 fail-loud；与
// client-load-smoke 共用同一入口）——本文件不再自带第二份 Markdown 表解析器。

function clientSourceFile() {
  const source = readFileSync(CLIENT_PREFERENCES_SOURCE, 'utf8');
  const file = ts.createSourceFile(CLIENT_PREFERENCES_SOURCE, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.deepEqual(file.parseDiagnostics, [], 'ResearchConfigTab.tsx 无法由 TypeScript AST 解析');
  return file;
}

/** 取客户端顶层字面量数组（可静态对账性 = 同钉前提；改成动态构造即红）。 */
function clientArrayLiteral(file, name) {
  let initializer;
  const findDeclaration = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === name) initializer = node.initializer;
    ts.forEachChild(node, findDeclaration);
  };
  findDeclaration(file);
  assert.ok(initializer !== undefined && ts.isArrayLiteralExpression(initializer), `${name} 必须保持为可静态对账的数组字面量`);
  return initializer;
}

function builtinPreferencesFromClient() {
  const file = clientSourceFile();
  const initializer = clientArrayLiteral(file, 'BUILTIN_PREFERENCES');

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
    assert.deepEqual([...fields.keys()].sort(), ['name', 'sections', 'summary'], `${label} 字段形状变化（summary = 「给用户的一句话」列，2026-10-16 起面板卡面显示它）`);
    return {
      name: stringValue(fields.get('name'), `${label}.name`),
      summary: stringValue(fields.get('summary'), `${label}.summary`),
      sections: Object.fromEntries([...objectProperties(fields.get('sections'), `${label}.sections`)].map(([key, value]) => [
        key,
        stringValue(value, `${label}.sections.${key}`),
      ])),
    };
  });
}

test('内置研究偏好与 research-brief 方法预设表逐字段一致', () => {
  const canonical = methodPresetsFromSkillFile(METHOD_PRESETS_SKILL);
  assert.deepEqual(builtinPreferencesFromClient(), canonical, '客户端内置偏好必须逐字段投影 canonical skill 表');
  assert.deepEqual(canonical, EXPECTED_BUILTIN_PREFERENCES, 'canonical skill 方法预设表发生了需显式审视的内容变化');

});

// ── 显示名一致性（发现 13 修复，2026-10-18）：面板曾显示「找什么资料／明确不承诺」而指令载荷
// 写「找来源／不承诺」——用户按 A 改、指令说 B。正本 = lib SECTION_LABELS（库格式与指令同源），
// 客户端 SECTIONS 只是呈现副本；两处逐字逐序不一致即红（此前无人把守这一面）。
function sectionsFromClient() {
  const file = clientSourceFile();
  const initializer = clientArrayLiteral(file, 'SECTIONS');
  return initializer.elements.map((element, index) => {
    const label = `SECTIONS[${index}]`;
    assert.ok(ts.isObjectLiteralExpression(element), `${label} 必须保持为对象字面量`);
    const fields = new Map();
    for (const property of element.properties) {
      assert.ok(ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)), `${label} 含无法静态对账的成员`);
      fields.set(property.name.text, property.initializer);
    }
    assert.deepEqual([...fields.keys()].sort(), ['key', 'label'], `${label} 字段形状变化`);
    assert.ok(ts.isStringLiteral(fields.get('key')), `${label}.key 必须是字符串字面量`);
    assert.ok(ts.isStringLiteral(fields.get('label')), `${label}.label 必须是字符串字面量`);
    return { key: fields.get('key').text, label: fields.get('label').text };
  });
}

test('显示名一致性：客户端 SECTIONS 标签 ↔ lib SECTION_LABELS 逐字逐序一致', () => {
  assert.deepEqual(sectionsFromClient(), SECTION_LABELS.map(({ key, label }) => ({ key, label })),
    '面板显示标签必须与库格式/指令载荷同名（发现 13：曾漂移为「找什么资料／明确不承诺」）');
});

// ── 显式化面的同钉（2026-10-18）：推荐映射表、六条底线、两个定制入口的指令逐字——正本都在
// research-brief skill（模型面）；面板是投影。此前这三面**无人把守**（发现 13 同族：显示面与
// 正本漂移没人管）。
function clientStringArray(file, name) {
  return clientArrayLiteral(file, name).elements.map((element, index) => {
    assert.ok(ts.isStringLiteral(element), `${name}[${index}] 必须是字符串字面量`);
    return element.text;
  });
}

function clientStringLiteral(file, name) {
  let initializer;
  const findDeclaration = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === name) initializer = node.initializer;
    ts.forEachChild(node, findDeclaration);
  };
  findDeclaration(file);
  assert.ok(initializer !== undefined && ts.isStringLiteral(initializer), `${name} 必须保持为字符串字面量`);
  return initializer.text;
}

function patternRulesFromClient() {
  const file = clientSourceFile();
  return clientArrayLiteral(file, 'PATTERN_METHOD_RULES').elements.map((element, index) => {
    const label = `PATTERN_METHOD_RULES[${index}]`;
    assert.ok(ts.isObjectLiteralExpression(element), `${label} 必须保持为对象字面量`);
    const fields = new Map();
    for (const property of element.properties) {
      assert.ok(ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)), `${label} 含无法静态对账的成员`);
      fields.set(property.name.text, property.initializer);
    }
    assert.deepEqual([...fields.keys()].sort(), ['method', 'patterns'], `${label} 字段形状变化`);
    return { patterns: fields.get('patterns').text, method: fields.get('method').text };
  });
}

test('推荐映射 / 六条底线 / 两个入口指令逐字 = skill 投影（同钉）', () => {
  const skillText = readFileSync(METHOD_PRESETS_SKILL, 'utf8');
  const file = clientSourceFile();
  assert.deepEqual(patternRulesFromClient(), patternMethodMappingFromSkill(skillText),
    '面板「什么时候用它」与推荐规则说明位的取值必须逐字投影 skill 的判型→打法映射表');
  assert.deepEqual(clientStringArray(file, 'BASELINE_DISCIPLINES'), baselineDisciplinesFromSkill(skillText),
    '面板「任何打法都改不掉」一行必须逐字投影 skill 的共同底线句（防第二份手抄清单）');
  for (const name of ['DRAFT_INSTRUCTION', 'DISTILL_INSTRUCTION']) {
    assert.ok(skillText.includes(clientStringLiteral(file, name)),
      `${name} 必须逐字出现在 research-brief skill 的管理动词节（会进模型面——面板与 Lead 行为不许两套话）`);
  }
});

// 领域示范（子卡② ②-5）：厚条目 = 只读示范，不进「内置打法」清单（判型映射表里没有它）——
// 它的四字段逐字同钉 skill 的「领域示范」节（面板是投影）。
function demoEntryFromClient() {
  const file = clientSourceFile();
  let initializer;
  const findDeclaration = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'DEMO_ENTRY') initializer = node.initializer;
    ts.forEachChild(node, findDeclaration);
  };
  findDeclaration(file);
  assert.ok(initializer !== undefined && ts.isObjectLiteralExpression(initializer), 'DEMO_ENTRY 必须保持为可静态对账的对象字面量');
  const fields = new Map();
  for (const property of initializer.properties) {
    assert.ok(ts.isPropertyAssignment(property) && ts.isIdentifier(property.name), 'DEMO_ENTRY 含无法静态对账的成员');
    fields.set(property.name.text, property.initializer);
  }
  assert.deepEqual([...fields.keys()].sort(), ['name', 'sections'], 'DEMO_ENTRY 字段形状变化');
  assert.ok(ts.isStringLiteral(fields.get('name')), 'DEMO_ENTRY.name 必须是字符串字面量');
  const sections = new Map();
  assert.ok(ts.isObjectLiteralExpression(fields.get('sections')), 'DEMO_ENTRY.sections 必须保持为对象字面量');
  for (const property of fields.get('sections').properties) {
    assert.ok(ts.isPropertyAssignment(property) && ts.isIdentifier(property.name), 'DEMO_ENTRY.sections 含无法静态对账的成员');
    assert.ok(ts.isStringLiteral(property.initializer), `DEMO_ENTRY.sections.${property.name.text} 必须是字符串字面量`);
    sections.set(property.name.text, property.initializer.text);
  }
  return { name: fields.get('name').text, sections };
}

test('领域示范：四字段逐字 = skill「领域示范」节（厚条目体例投影）', () => {
  const skillText = readFileSync(METHOD_PRESETS_SKILL, 'utf8');
  const demo = demoEntryFromClient();
  assert.ok(skillText.includes(`## ${demo.name}（`), `skill 里必须有「## ${demo.name}（…）」条目`);
  for (const key of ['source', 'verify', 'report', 'limit']) {
    assert.ok(skillText.includes(demo.sections.get(key)), `领域示范的 ${key} 必须逐字出现在 skill 的领域示范节`);
  }
  assert.ok(demo.sections.get('limit').includes('不构成投资建议'), '不承诺字段必须写明不构成投资建议（核实结论要求）');
});

test('libraryReadStateOf：「无结果」与「失败」分家（文件不在 / 在而读不回 / 目录不可达 / 正常）', () => {
  const F = [{ type: 'file', name: 'method-library.md' }];
  assert.equal(libraryReadStateOf('# 库\n', F, 'method-library.md'), 'ok');
  assert.equal(libraryReadStateOf('', [], 'method-library.md'), 'absent', '文件不在 = 新工作区的正常空态（不是失败）');
  assert.equal(libraryReadStateOf(null, F, 'method-library.md'), 'unreadable', '在而读不回 = 如实报读不到，不冒充"正在读取"');
  assert.equal(libraryReadStateOf(null, null, 'method-library.md'), 'unreadable', '目录面不可达 = unreadable');
  assert.equal(libraryReadStateOf('# 库\n', [{ type: 'dir', name: 'method-library.md' }], 'method-library.md'), 'absent', '同名目录不算文件');
});

test('summaryOfEntry：剥 markdown 源标记 + 截断（发现 11：** 字面星号与长条目不截断）', () => {
  const [bold] = foldLibrary('## 加粗条目（2026-10-18）\n- 找来源: 只钻一遍**官方**来源，`retrieved_at` 必填\n');
  assert.equal(summaryOfEntry(bold), '只钻一遍官方来源，retrieved_at 必填');
  const long = foldLibrary(`## 长条目（2026-10-18）\n- 找来源: ${'甲'.repeat(100)}\n`);
  const summary = summaryOfEntry(long[0]);
  assert.equal(summary.length, SUMMARY_MAX_LENGTH + 1, '超长摘要必须截断到 SUMMARY_MAX_LENGTH + 省略号');
  assert.ok(summary.endsWith('…'), '截断必须补省略号（不在字中间装作完整句）');
  // 边界注记：只剥 `**` 与反引号（源文件标记），不解析其他 markdown——卡片是纯文本节点。
  const [onlyBold] = foldLibrary('## 只剩标记（2026-10-18）\n- 找来源: **\n');
  assert.equal(summaryOfEntry(onlyBold), null, '剥完为空 → null（不编造空串）');
  assert.equal(summaryOfEntry(foldLibrary('## 空条目（2026-10-18）\n')[0]), null);
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

// ── 文案关键句的静态钉（2026-10-18 零上下文探针后加）─────────────────────────────
// 为什么住这里而不是冒烟：探针点出的三处高风险错读（"保存"像是已生效、"来源链"与"找来源"混同、
// 改动是否影响在跑的这场）都是**静态 JSX 文案**；而冒烟的真浏览器断言本轮受侧栏会话行不渲染
// 影响（见 BUG-035）会整块静默跳过——静态钉保证这几句无论环境如何都在。
// 边界：它证"文案在场且没被删"，不证"渲染出来长什么样"（渲染面归 client-load-smoke）。
const COPY_PINS = [
  '一条「研究偏好」＝一条打法', // 术语一句话表（打法/偏好/条目 收敛）
  '都是给 Lead 发一条指令', // 指令 vs 回执 的机制一句
  '改动影响的是', // 影响范围：之后的研究 vs 正在跑的这场
  '交给 Lead 新建', // 「保存」类按钮必须写明是发给 Lead（最危险一条）
  '面板不直接改文件', // 与上句配对，禁止读成"已保存"
  '「基于此自定义」新建的副本同样受这六条约束', // 自定义不能突破底线
  '「来源链」管的是', // 来源链 ≠ 找来源
  'readiness = critic 在 review.md 给的终局判定', // 唯一英文词有解释
];

test('面板关键文案静态钉：术语表/影响范围/底线区别/按钮语义在场（探针三处高风险错读）', () => {
  const source = readFileSync(CLIENT_PREFERENCES_SOURCE, 'utf8');
  const missing = COPY_PINS.filter((pin) => !source.includes(pin));
  assert.deepEqual(missing, [], `以下关键文案不在场（删改即红——它们是零上下文探针点出的防错读句）：${missing.join('、')}`);
});

// 负例留证 2026-10-18：BUG-035（侧栏懒渲染下"扫不到会话"被误判成实例老化/需重启）。
//   红配方一：把 locateSessionStrategy 的 `if (!triedSearch && …) return 'search'` 改成
//             `if (false) return 'search'`（即"扫不到就放弃"）→ 本文件该例如实报红（已实测）。
//   红配方二（端到端）：删掉 dev/hitl-answer.mjs 里 revealTargetRow 末尾的 searchSessionByTitle
//             兜底 → 对一条不在侧栏列表的挂起会话，工具复现"侧栏没有目标会话行"。
test('侧栏定位策略：扫不到且手上有标题 → 必须走搜索（BUG-035 的 keyless 钉）', () => {
  assert.equal(locateSessionStrategy({ foundByScan: true }), 'accept');
  assert.equal(locateSessionStrategy({ foundByExpand: true }), 'accept');
  assert.equal(locateSessionStrategy({ title: '某会话' }), 'search', '扫行/展开都没命中 → 走搜索，不许直接判"不存在"');
  assert.equal(locateSessionStrategy({ title: '某会话', triedSearch: true }), 'give-up', '搜索也试过才可放弃');
  assert.equal(locateSessionStrategy({}), 'give-up', '无标题可搜 → 如实放弃');
  assert.equal(locateSessionStrategy({ title: '   ' }), 'give-up', '空标题不算可搜');
});
