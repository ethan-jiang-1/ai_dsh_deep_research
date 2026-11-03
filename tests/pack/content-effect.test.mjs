// content-effect.test.mjs — 内容注入行把注册挂进 ctx.effect（2026-11-03 审计 D7-3）。
//
// 背景：`src/content` 的 apply 直接调用 `systemPrompt.variable()` / `context()`，返回值被丢弃——
// vendor 合同「registrations are effects」要求注册可随 fiber/HMR 回收；否则重复 apply 会重复
// 注入同一段 runtime context，且 `--dump-config` 之外没有回收面。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../../packages/deep-research-pack/src/content/index.ts';

test('content.apply：variable/context 注册经 ctx.effect 挂载，返回 disposer', () => {
  const calls = [];
  const disposers = [];
  const ctx = {
    effect(fn) {
      calls.push('effect');
      const dispose = fn();
      if (typeof dispose === 'function') disposers.push(dispose);
      return dispose;
    },
    logger: { warn() {}, info() {} },
    systemPrompt: {
      variable(name) {
        calls.push(`variable:${name}`);
        return () => calls.push(`dispose:variable:${name}`);
      },
      context(input) {
        calls.push(`context:${input.name}`);
        return () => calls.push(`dispose:${input.name}`);
      },
    },
  };
  apply(ctx, { packRoot: '/fixture/pack', manual: '# Research manual\n' });
  assert.ok(calls.includes('effect'), 'apply 没有走 ctx.effect——注册不可回收');
  assert.ok(calls.includes('variable:research_pack_root'), 'variable 未注册');
  assert.ok(calls.includes('context:research:manual'), 'manual context 未注册');
  assert.equal(disposers.length, 1, '注册的 disposer 未交给 effect 作用域');
  disposers[0]();
  assert.ok(calls.includes('dispose:research:manual'), 'context disposer 未接通');
  assert.ok(calls.includes('dispose:variable:research_pack_root'), 'variable disposer 未接通——HMR 重名注册会抛');
});
