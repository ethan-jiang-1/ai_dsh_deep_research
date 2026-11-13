// 导出形态守卫 · 真 Loader 往返（W0-5；vendor 源码契约层，跑 `pnpm test:vendor`）。
//
// 为什么住 `tests/vendor/`：`unwrapExports` 需要 `@deepseek-ai/cordis` 的 **vendor 源**
// （root tsconfig 映射）；默认 `pnpm test` 用 pack 的 client tsconfig，直接 import Loader 会把
// cordis 解析到另一份，报 `FiberState` 缺失——这不是 loader 坏，是两个平面混了。
//
// 判据：`Object.create(Loader.prototype).unwrapExports(mod)` 返回**同一命名空间**，`default` 不在，
// `apply`/`inject`/`name` 存活。事故原型 = vendor postmortem 0001。
//
// 负例留证 2026-11-13：给 `src/index.ts` 加 `export default function leak() {}` → 本文件红
// （`'default' in mod`）；给 `src/client/index.ts` 加 `export { apply as default }` 本文件不覆盖
// （client 半 `.css` 不可 import），由 `tests/pack/export-shape.spec.mjs` 的静态正则咬住；还原 → 绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Loader } from '../../vendor/dsh/vendor/loader/src/index.ts';
import * as host from '../../packages/deep-research-pack/src/index.ts';
import * as startup from '../../packages/deep-research-pack/src/startup/index.ts';
import * as content from '../../packages/deep-research-pack/src/content/index.ts';
import * as defaults from '../../packages/deep-research-pack/src/defaults/index.ts';

const NODE_HALVES = [
  ['host 半（宿主位）', host],
  ['startup（产品启动行）', startup],
  ['content（研究手册注入）', content],
  ['defaults（项目研究默认行）', defaults],
];

test('宿主半：真 Loader unwrapExports 往返后命名空间与 name/inject/apply 仍在', () => {
  const loader = Object.create(Loader.prototype);
  for (const [label, mod] of NODE_HALVES) {
    assert.equal('default' in mod, false, `${label} 出现 default 导出——Loader 会丢掉整个命名空间`);
    const unwrapped = loader.unwrapExports(mod);
    assert.equal(unwrapped, mod, `${label} 经 unwrapExports 后不是同一命名空间`);
    assert.equal(typeof unwrapped.apply, 'function', `${label} 的 apply 经 unwrapExports 后丢失`);
    assert.ok(Array.isArray(unwrapped.inject), `${label} 的 inject 不是数组`);
    for (const item of unwrapped.inject) assert.equal(typeof item, 'string', `${label} inject 项不是字符串`);
    if ('name' in mod) assert.equal(unwrapped.name, mod.name, `${label} 的 name 经 unwrapExports 后漂移`);
  }
});
