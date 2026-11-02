// readme-bilingual.test.mjs — 插件包 README 的中英对照成对（2026-11-03 审计 D7-5）。
//
// vendor `package-bundle` 模板要求 H1 后带 `English | [中文](README.zh.md)`；本仓此前只有英文。
// 本测试钉：两文件互链、节结构同构、中文版带同一 frontmatter kind——单边加内容即红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PACK = join(ROOT, 'packages', 'deep-research-pack');
const en = readFileSync(join(PACK, 'README.md'), 'utf8');
const zhPath = join(PACK, 'README.zh.md');
assert.ok(existsSync(zhPath), 'README.zh.md 缺席（英文 README 的语言行会指向空处）');
const zh = readFileSync(zhPath, 'utf8');

test('README 语言行互链：英文 → 中文、中文 → 英文', () => {
  assert.match(en, /^English \| \[中文\]\(README\.zh\.md\)$/m, '英文 README 缺 `English | [中文](README.zh.md)`');
  assert.match(zh, /\[English\]\(README\.md\) \| 中文/, '中文 README 缺 `[English](README.md) | 中文`');
});

test('两文件节结构同构（## 数与标题层级分布一致），中文版 frontmatter kind 不变', () => {
  const h2 = (text) => [...text.matchAll(/^## /gm)].length;
  assert.ok(h2(en) >= 6, `防空语料：英文 README 只有 ${h2(en)} 个二级节`);
  assert.equal(h2(zh), h2(en), '中英 README 的二级节数量不一致——单边加了内容');
  const levels = (text) => ['#', '##', '###', '####'].map((prefix) => [...text.matchAll(new RegExp(`^${prefix} `, 'gm'))].length).join('/');
  assert.equal(levels(zh), levels(en), `标题层级分布不一致（en=${levels(en)} zh=${levels(zh)}）`);
  assert.match(zh, /^kind: "package-bundle"$/m, '中文版 frontmatter 缺 kind: package-bundle');
});
