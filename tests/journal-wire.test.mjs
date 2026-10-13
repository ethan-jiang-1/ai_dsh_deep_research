// journal-wire 回归 — journal wire 入参/正文解析共享核（keyless 纯函数）。
// 行为正源 = 五消费方（activity-fold / member-activity / bundle-bind / tool-card / hitl-fold）
// 的 1:1 测试（截断 JSON 等边界彼处已钉）；本文件直接钉**共享缝**的合同——收敛后此缝成为
// 单点，schema 变形时红的第一个地方应是这里。
// 反证（2026-10-13 实录）：把 normalizeQueries 的空白剔除条件去掉 → 「空白项剔除」用例红；
// 把 argsObjectOf 的截断 catch 改为抛出 → 「截断 JSON」用例红；还原 → 全绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { argsObjectOf, argValueOf, normalizeQueries, contentTextParts } from '../packages/deep-research-pack/src/lib/journal-wire.ts';

test('argsObjectOf：对象直通 / JSON 串解析 / 截断与非对象 → null / 数组按对象放行', () => {
  assert.deepEqual(argsObjectOf({ a: 1 }), { a: 1 });
  assert.deepEqual(argsObjectOf('{"a": 1}'), { a: 1 });
  assert.equal(argsObjectOf('{"questions": [截断'), null); // 流式前缀（hitl-fold/bundle-bind 实证形态）
  assert.equal(argsObjectOf('123'), null);
  assert.equal(argsObjectOf('null'), null);
  assert.equal(argsObjectOf(undefined), null);
  // 数组放行（与原手抄家族一致：查不存在键得 undefined；拒数组的消费方在自己包装里加检）
  assert.deepEqual(argsObjectOf(['x']), ['x']);
  assert.deepEqual(argsObjectOf('["x"]'), ['x']);
});

test('argValueOf：字段取值 / 缺席 → null / 截断 JSON → null', () => {
  assert.equal(argValueOf({ queries: ['a'] }, 'queries') instanceof Array, true);
  assert.equal(argValueOf('{"url": "https://x"}', 'url'), 'https://x');
  assert.equal(argValueOf({ a: 1 }, 'missing'), null);
  assert.equal(argValueOf('{"url": "https://x 截断', 'url'), null);
});

test('normalizeQueries：非字符串与纯空白项剔除 / 非数组 → 空数组', () => {
  // 注意：只剔除、不 trim——' 深研 ' 带空格保留（与三消费方原行为一致；显示层自行处理）
  assert.deepEqual(normalizeQueries(['DSH', ' 深研 ', 42, '', '   ']), ['DSH', ' 深研 ']);
  assert.deepEqual(normalizeQueries('not-array'), []);
  assert.deepEqual(normalizeQueries(undefined), []);
});

test('contentTextParts：type=text 项收集 / 非 text 块跳过 / 非数组 → 空数组', () => {
  const blocks = [
    { type: 'text', text: '第一条' },
    { type: 'image', url: 'x' },
    { type: 'text', text: '第二条' },
    '裸字符串项',
  ];
  assert.deepEqual(contentTextParts(blocks), ['第一条', '第二条']);
  assert.deepEqual(contentTextParts({ not: 'array' }), []);
  assert.deepEqual(contentTextParts(undefined), []);
  // 空串 text 项保留（拼接/截断等后处理语义归消费方——本模块只收集）
  assert.deepEqual(contentTextParts([{ type: 'text', text: '' }]), ['']);
});
