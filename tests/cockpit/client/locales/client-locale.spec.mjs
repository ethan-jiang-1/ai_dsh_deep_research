// client-locale.spec.mjs — 驾驶舱 chrome 文案走 locale，不写死中文（2026-11-03 审计 D7-4）。
//
// 背景：页签标题/guide 描述/活标题曾硬编码中文，英文界面仍是中文。现在 chrome 文案统一走
// `locales.ts` 的 zh/en 字典（`ctx.locale.register` + `t()`）；本测试钉两件事：
//   ① zh/en 键集完全一致（新增文案漏翻 = 红）；
//   ② index.ts 不再出现 `title: () => '…'` / `description: () => '…'` 字面量（回退即红）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { en, zh } from '../../../../packages/deep-research-pack/src/client/locales.ts';
import { zhCockpit } from '../../../../packages/deep-research-pack/src/client/locales/zh-cockpit.ts';
import { enCockpit } from '../../../../packages/deep-research-pack/src/client/locales/en-cockpit.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const INDEX = readFileSync(join(ROOT, 'packages', 'deep-research-pack', 'src', 'client', 'index.ts'), 'utf8');

test('locale 字典：zh 与 en 键集一致，无空值', () => {
  assert.deepEqual(Object.keys(enCockpit).sort(), Object.keys(zhCockpit).sort(), 'zhCockpit/enCockpit 键集必须一致');
  const zhKeys = Object.keys(zh).sort();
  const enKeys = Object.keys(en).sort();
  assert.ok(zhKeys.length >= 50, `防空语料：字典只有 ${zhKeys.length} 个键`);
  assert.deepEqual(enKeys, zhKeys, 'zh/en 键集不一致——新增文案漏翻');
  for (const [key, value] of Object.entries(zh)) {
    assert.equal(typeof value, 'string');
    assert.ok(value.trim() !== '', `zh.${key} 为空`);
  }
  for (const [key, value] of Object.entries(en)) {
    assert.equal(typeof value, 'string');
    assert.ok(value.trim() !== '', `en.${key} 为空`);
  }
});

test('驾驶舱 chrome：页签标题/guide 描述不再写死字面量（走 t()）', () => {
  assert.ok(INDEX.includes('locale.register(\'deepResearchPack\''), 'index.ts 未注册 deepResearchPack 字典');
  const offenders = [];
  for (const m of INDEX.matchAll(/^\s*(title|description): \(\) => '([^']*)'/gm)) offenders.push(`${m[1]}: '${m[2]}'`);
  assert.deepEqual(offenders, [], `发现写死的 chrome 文案（改用 t('key')）：${offenders.join('、')}`);
  for (const key of ['tabStatus', 'tabConfig', 'tabGraph', 'tabFinal', 'tabStatusPending']) {
    assert.ok(INDEX.includes(`t('${key}')`), `index.ts 未使用 locale 键 ${key}`);
  }
});

// 负例留证 2026-11-27：BUG-455——纯文本 UI 字典项混入原始 **...** Markdown 语法，页面直接渲染星号。
// 红配方：在 zh/en 任意纯文本词条写入 **加粗** 或把 configMethodHint 改回仅提会话顶部 tab → 本例红。
test('BUG-455 locale 字典：UI 文案不含原始 Markdown 加粗星号，configMethodHint 同步指引研究工作台入口', () => {
  for (const [lang, dict] of [['zh', zh], ['en', en]]) {
    for (const [key, value] of Object.entries(dict)) {
      assert.doesNotMatch(value, /\*\*[^*]+\*\*/, `${lang}.${key} 不得包含原始 Markdown **...** 语法：${value}`);
    }
  }
  assert.match(zh.configMethodHint, /研究工作台/, 'zh.configMethodHint 应提示研究工作台方法库入口');
  assert.match(en.configMethodHint, /Research Hub/, 'en.configMethodHint 应提示 Research Hub 方法库入口');
});
