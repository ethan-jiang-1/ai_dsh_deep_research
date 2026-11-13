// readme-bilingual.spec.mjs — 插件包 README 的中英对照成对（2026-11-03 审计 D7-5）。
//
// vendor `package-bundle` 模板要求 H1 后带 `English | [中文](README.zh.md)`；本仓此前只有英文。
// 本测试钉：两文件互链、节结构同构、中文版带同一 frontmatter kind——单边加内容即红。
// 2026-11-11 立红：中文版仍是 0.3.0，且步骤 2=装包、3=建 profile（英文 2=建 profile、3=装包）；
// 节数同构没抓到。补版本号与步骤命令断言，旧形状在本文件红。
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
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));

/** 从 `**N.` 到 `**N+1.` 的步骤块；找不到下一步时取到文末。 */
function step(text, n) {
  const start = text.indexOf(`**${n}.`);
  if (start === -1) return '';
  const end = text.indexOf(`**${n + 1}.`, start + 1);
  return end === -1 ? text.slice(start) : text.slice(start, end);
}

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

test('双语 README 都带当前版本，且不残留旧版本号', () => {
  for (const [name, text] of [['README.md', en], ['README.zh.md', zh]]) {
    assert.ok(text.includes(pkg.version), `${name} 缺当前版本 ${pkg.version}`);
    assert.doesNotMatch(text, /\b0\.3\.0\b/, `${name} 仍含旧版本 0.3.0`);
  }
});

test('双语 README 的步骤顺序一致：2=建 profile，3=装 tarball', () => {
  for (const [name, text] of [['README.md', en], ['README.zh.md', zh]]) {
    assert.match(step(text, 2), /--from-default-profile/, `${name} 第 2 步不是 profile 初始化`);
    assert.match(step(text, 3), /add file:/, `${name} 第 3 步不是 tarball 装包`);
  }
});

test('双语 README 都写 Installed plugins 与市场入口时序', () => {
  for (const [name, text] of [['README.md', en], ['README.zh.md', zh]]) {
    assert.match(text, /Installed plugins/, `${name} 缺 Installed plugins`);
  }
  assert.match(en, /market entry/i, 'README.md 缺 market entry');
  assert.match(zh, /市场入口/, 'README.zh.md 缺 市场入口');
});
