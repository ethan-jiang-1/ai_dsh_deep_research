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
import { en, zh } from '../../packages/deep-research-pack/src/client/locales.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INDEX = readFileSync(join(ROOT, 'packages', 'deep-research-pack', 'src', 'client', 'index.ts'), 'utf8');

test('locale 字典：zh 与 en 键集一致，无空值', () => {
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
