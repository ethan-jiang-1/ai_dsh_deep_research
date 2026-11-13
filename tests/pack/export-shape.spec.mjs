// 导出形态守卫 — 自写插件代码的证据台阶①（test-strategy 语料 08 篇移植；对象 = D18 例外
// 面的插件两半）。事故原型 = vendor postmortem 0001：多余的 export default 让 Loader 的
// unwrapExports 解析到裸函数、丢弃整个模块命名空间，而挂载冒烟仍绿——named exports 形状
// 是成本最低、挡过最贵事故的守卫。
//
// 2026-11-13 升级（W0-5）：默认回归证「模块形状」——import 宿主半，断言 `default` 不在、
// `apply`/`inject`/`name` 在场；静态面额外扫 `export default` / `as default` / `{ default } from`
// 三种写法（旧版只扫 `export default`，漏掉 re-export 形态，2026-11-13 实测）。真 Loader
// `unwrapExports` 往返住在 `tests/vendor/export-shape.vendor.spec.mjs`——它需要 root tsconfig 的
// vendor 源映射；默认 test 用 pack 的 client tsconfig，直接 import Loader 会把 `@deepseek-ai/cordis`
// 解析到另一份（`FiberState` 缺失），这正是「两个平面不要混」的实例。
//
// client 半因 `.css` 导入无法在 Node 直接 import，保留静态正则 + `client-load` 真浏览器；
// fetch-fallback 因 `fetch` 运行时调用被 keyless `layering` 闭包图禁入，保留静态 + L1/L2。
//
// 负例留证 2026-11-13：给 `src/index.ts` 加 `export default function leak() {}` → 静态 + 模块形状
// 两条红；给 `src/client/index.ts` 加 `export { apply as default }` → 静态红（补 `as default`
// 正则前实测漏过）；各自还原 → 绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as host from '../../packages/deep-research-pack/src/index.ts';
import * as startup from '../../packages/deep-research-pack/src/startup/index.ts';
import * as content from '../../packages/deep-research-pack/src/content/index.ts';
import * as defaults from '../../packages/deep-research-pack/src/defaults/index.ts';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages', 'deep-research-pack', 'src');
const HALVES = [
  ['host 半（宿主位）', 'index.ts'],
  ['client 半（驾驶舱）', 'client/index.ts'],
  ['startup（产品启动行）', 'startup/index.ts'],
  ['content（研究手册注入）', 'content/index.ts'],
  ['defaults（项目研究默认行）', 'defaults/index.ts'],
];
const NODE_HALVES = [
  ['host 半（宿主位）', host],
  ['startup（产品启动行）', startup],
  ['content（研究手册注入）', content],
  ['defaults（项目研究默认行）', defaults],
];
const DEFAULT_EXPORT_PATTERNS = [
  /export\s+default\b/,
  /export\s*\{[^}]*\bas\s+default\b[^}]*\}/,
  /export\s*\{[^}]*\bdefault\b[^}]*\}\s*from/,
];

test('插件两半：named exports 在场（inject/apply）且零 default 导出（静态面）', () => {
  for (const [label, rel] of HALVES) {
    const src = readFileSync(join(SRC, ...rel.split('/')), 'utf8');
    for (const pattern of DEFAULT_EXPORT_PATTERNS) {
      assert.doesNotMatch(src, pattern, `${label} 出现 default 导出（含 as/default re-export）——unwrapExports 会解析到裸函数丢命名空间`);
    }
    assert.match(src, /export\s+const\s+inject\b/, `${label} 缺 named export: inject`);
    assert.match(src, /export\s+(?:async\s+)?function\s+apply\b/, `${label} 缺 named export: apply`);
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

test('宿主半：import 后模块形状仍是 named exports（default 不在、apply/inject/name 在场）', () => {
  for (const [label, mod] of NODE_HALVES) {
    assert.equal('default' in mod, false, `${label} 出现 default 导出——Loader 会丢掉整个命名空间`);
    assert.equal(typeof mod.apply, 'function', `${label} 的 apply 不是函数`);
    assert.ok(Array.isArray(mod.inject), `${label} 的 inject 不是数组`);
    for (const item of mod.inject) assert.equal(typeof item, 'string', `${label} inject 项不是字符串`);
    if ('name' in mod) assert.equal(typeof mod.name, 'string', `${label} 的 name 不是字符串`);
  }
});
