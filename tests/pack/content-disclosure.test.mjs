// content-disclosure — manual T0 与 generic 按需细则的披露缝（keyless）。
//
// 为什么存在：manual 是每轮注入的常驻面；细则下放到 content/generic/ 后，必须保证
//  ① T0 仍在上限内；② 每个 generic 文件都被 T0 指针点名；③ 指针目标存在；④ T0 不复制
//  generic 的正文标题（否则“下放”只是搬家，常驻面仍在）。
// 这是 design/70 §5 的 T0 缝守卫；不证明模型真的会去 read generic（→ L1/L4）。
//
// 红配方：在 content/generic/ 新增 orphan.md 且 T0 不指针 → 本文件红；删 T0 的
// state-and-recovery 指针 → 红；把 generic 的 H1 抄回 T0 → 红；T0 超下放触发 10,000 字符 → 红
//（硬顶 12,288 只防失控，不是可挪用的余量）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { genericFiles, manualT0 } from './handbook-surface.mjs';
import { PACK } from './preset-helpers.mjs';
import { T0_HARD_MAX_CHARS, T0_TRIGGER_CHARS } from '../../scripts/lib/content-budget.mjs';

const CONTENT = join(PACK, 'content');
const GENERIC = join(CONTENT, 'generic');

/** T0 里的 generic 指针（`{{research_pack_root}}/content/generic/<name>`）。 */
function pointers(text) {
  return [...text.matchAll(/\{\{research_pack_root\}\}\/content\/generic\/([A-Za-z0-9._-]+)/g)].map((m) => m[1]);
}

test('T0 常驻面 ≤ 下放触发阈值', () => {
  const t0 = manualT0();
  assert.ok(t0.length <= T0_TRIGGER_CHARS,
    `manual T0 ${t0.length} 字符 > 下放触发 ${T0_TRIGGER_CHARS}——先下放/压缩；硬顶 ${T0_HARD_MAX_CHARS} 不是豁免`);
});

test('每个 generic 细则都被 T0 指针点名，且没有孤儿', () => {
  const files = genericFiles();
  const refs = new Set(pointers(manualT0()));
  const orphans = files.filter((file) => !refs.has(file));
  assert.deepEqual(orphans, [], `generic 文件未被 T0 点名（孤儿）：${orphans.join(', ')}`);
  const dangling = [...refs].filter((file) => !existsSync(join(GENERIC, file)));
  assert.deepEqual(dangling, [], `T0 指针悬空：${dangling.join(', ')}`);
});

test('T0 不复制 generic 的正文标题（下放不是搬家）', () => {
  const t0 = manualT0();
  for (const file of genericFiles()) {
    const h1 = /^#\s+(.+)$/m.exec(readFileSync(join(GENERIC, file), 'utf8'))?.[1];
    if (h1 === undefined) continue;
    assert.ok(!t0.includes(`# ${h1}`),
      `T0 出现了 generic/${file} 的正文标题「${h1}」——细则仍在常驻面，未真正下放`);
  }
});

test('generic 文件不依赖未注册插值', () => {
  for (const file of genericFiles()) {
    const text = readFileSync(join(GENERIC, file), 'utf8');
    assert.equal(/\{\{[^}]+\}\}/.test(text), false,
      `generic/${file} 含 {{…}} 插值——generic 是 fs 按需读，不像 T0 那样被注入解析`);
  }
});
