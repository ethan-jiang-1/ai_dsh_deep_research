// 导出形态守卫 — 自写插件代码的证据台阶①（test-strategy 语料 08 篇移植；对象 = D18 例外
// 面的插件两半）。事故原型 = vendor postmortem 0001：多余的 export default 让 Loader 的
// unwrapExports 解析到裸函数、丢弃整个模块命名空间，而挂载冒烟仍绿——named exports 形状
// 是成本最低、挡过最贵事故的守卫。反证：给 src/index.ts 或 src/client/index.ts 加
// `export default`（或删 inject/apply 导出）→ 本文件红；还原 → 绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'deep-research-pack', 'src');
const HALVES = [
  ['host 半（宿主位）', 'index.ts'],
  ['client 半（驾驶舱）', 'client/index.ts'],
];

test('插件两半：named exports 在场（inject/apply）且零 export default', () => {
  for (const [label, rel] of HALVES) {
    const src = readFileSync(join(SRC, ...rel.split('/')), 'utf8');
    assert.doesNotMatch(src, /export\s+default\b/, `${label} 出现 export default——unwrapExports 会解析到裸函数丢命名空间`);
    assert.match(src, /export\s+const\s+inject\b/, `${label} 缺 named export: inject`);
    assert.match(src, /export\s+function\s+apply\b/, `${label} 缺 named export: apply`);
  }
});

test('inject 形状：数组字面量且元素全为服务名字符串（空数组合法——host 半零依赖有注）', () => {
  for (const [label, rel] of HALVES) {
    const src = readFileSync(join(SRC, ...rel.split('/')), 'utf8');
    const m = src.match(/export\s+const\s+inject[^=]*=\s*(\[[^\]]*\])/);
    assert.ok(m, `${label} 的 inject 不是数组字面量（形状漂移）`);
    const items = m[1].replace(/^\[/, '').replace(/\]$/, '').split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    for (const item of items) {
      assert.match(item, /^[A-Za-z][A-Za-z0-9.]*$/, `${label} inject 项不是服务名标识符: ${item}`);
    }
  }
});
