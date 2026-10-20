// tests/probe-send-target.test.mjs —— cdp-probe 提交按钮判定的 keyless 契约（BUG-021 正修）。
//
// 为什么存在：这条规则原先只活在页面 `evaluate()` 字符串里，唯一证据是一次性真模型 harness。
// 生产现场两次坏在这一层——①提交按钮 aria-label 是状态机（空闲 Send／在飞 Queue／插话 Steer ×
// 双语），旧探针只找 "Send" → 在飞时构造性零命中；②同一位置在运行中/挂起时会变成 stop，盲点
// "composer 区最后一个按钮" 会**掐断在飞 turn**。本测试把这两条钉成常驻资产。
//
// 反证（同 diff 注入实测，红→还原→绿）：
//   ①删掉 stop 在场时的拒点（`stop-only` 分支恒返回候选）→ 用例「挂起态拒点」红；
//   ②去掉邻近窗（near 恒真）→ 用例「远处同名按钮不得选中」红；
//   ③空表守卫删除（防空语料）→ 用例「空按钮表」红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickSendTarget, SEND_LABELS, STOP_LABELS } from '../../scripts/lib/probe-send-target.mjs';

const b = (label, y) => ({ label, y });

test('空闲态：Send message 在场 → 选中它（英文 UI 空闲形态）', () => {
  const r = pickSendTarget({ buttons: [b('Add files or run commands', 790), b('Send message', 785)], composerY: 780 });
  assert.equal(r.reason, 'picked');
  assert.equal(r.picked, 'Send message');
});

test('在飞态：Queue message 在场 → 选中它（**生产现场旧探针于此构造性零命中**）', () => {
  const r = pickSendTarget({ buttons: [b('Select model', 790), b('Queue message', 785)], composerY: 780 });
  assert.equal(r.picked, 'Queue message', '只找 "Send" 的旧判据在这里必空');
});

test('send 家族全覆盖：插话态与中文三态都认', () => {
  for (const label of ['Steer message', '发送消息', '排队发送', '插话发送']) {
    const r = pickSendTarget({ buttons: [b(label, 785)], composerY: 780 });
    assert.equal(r.picked, label, `未认标签：${label}`);
  }
  assert.equal(SEND_LABELS.length, 6, 'send 家族应为三态 × 双语 = 6 个标签');
});

test('挂起态拒点：该位置只有 Stop generating → 不选任何按钮且 reason=stop-only（绝不掐断 turn）', () => {
  const r = pickSendTarget({ buttons: [b('Add files or run commands', 790), b('Stop generating', 785)], composerY: 780 });
  assert.equal(r.picked, null, 'stop 是"停止生成"不是提交——盲点会掐断在飞 turn');
  assert.equal(r.pickedIndex, null);
  assert.equal(r.reason, 'stop-only');
  assert.deepEqual(r.stopLabelsNear, ['Stop generating']);
});

test('中文 stop 同样拒点（停止生成）', () => {
  const r = pickSendTarget({ buttons: [b('停止生成', 785)], composerY: 780 });
  assert.equal(r.picked, null);
  assert.equal(r.reason, 'stop-only');
  assert.ok(STOP_LABELS.includes('停止生成'));
});

test('邻近窗：远处（别的区域）的同名按钮不得被选中', () => {
  const r = pickSendTarget({ buttons: [b('Send message', 100), b('Queue message', 785)], composerY: 780 });
  assert.equal(r.picked, 'Queue message', '远处同名标签不是 composer 的提交面');
  const only = pickSendTarget({ buttons: [b('Send message', 100)], composerY: 780 });
  assert.equal(only.picked, null, '只剩远处同名 → 宁可不发，也不误点别处');
  assert.equal(only.reason, 'no-send-family');
});

test('无 send 家族：候选空但 stop 不在场 → reason=no-send-family（fail-loud 用得上）', () => {
  const r = pickSendTarget({ buttons: [b('New session', 20), b('Plugins', 30)], composerY: 780 });
  assert.equal(r.picked, null);
  assert.equal(r.reason, 'no-send-family');
  assert.deepEqual(r.candidateLabels, []);
});

test('防空语料：空按钮表 / 畸形条目 → reason=empty 或安全跳过，不 throw', () => {
  assert.equal(pickSendTarget({ buttons: [], composerY: 780 }).reason, 'empty');
  assert.equal(pickSendTarget({ buttons: null }).reason, 'empty');
  const r = pickSendTarget({ buttons: [null, { label: undefined, y: 785 }, b('Queue message', 786)], composerY: 780 });
  assert.equal(r.picked, 'Queue message', '畸形条目不得让判定崩或错位');
});

test('composerY 读不到（null）→ 退化为全页候选（不因读数失败就当没按钮）', () => {
  const r = pickSendTarget({ buttons: [b('Send message', 785)], composerY: null });
  assert.equal(r.picked, 'Send message');
  assert.equal(r.reason, 'picked');
});
