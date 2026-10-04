// ask-drive 回归 — ask 卡代答驱动策略与裁决（keyless；BUG-004/BUG-005 的契约钉）。
//
// 为什么是纯函数库：真浏览器/通道侧无法进 tests（layering 守卫禁子进程与网络）——把
// 驱动决策与成功裁决抽成"观察进、动作出"的纯函数，行为契约在这里钉死；浏览器适配层
// （dev/hitl-answer.mjs）只做 IO 搬运，其正确性由策略函数 + 下一场 run 实测收口。
//
// 核心契约（正本 = _backlog/bugs/BUG-004-hitl-answer-submit-not-landing.md）：
// ① UI 形状（卡头消失/题干更换）**永不**单独判"已提交"——多题卡 auto-advance 换题头
//    正是第 5 例假绿的形态（答 1/3 题自报完成）；
// ② Submit 可用 = 唯一提交动作；无卡可读 = 交回盘侧裁决，不自行宣布完成；
// ③ 盘侧复核是 verdict（不落地 = 红），不是警告；
// ④ ask 形态（wait:-1 无限期）可从盘侧日志判别（BUG-005：活等待的兜底语义不同）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAskArgs, nextDriveAction, driveVerdict, answerBatchOf } from '../scripts/lib/ask-drive.mjs';

test('parseAskArgs：三问卡带 wait:-1 → 3 题 + 无限期（BUG-005 第 5 例现场的盘侧形态）', () => {
  const args = JSON.stringify({
    questions: [
      { id: 'research_type', question: 'q1', options: [{ label: 'a（Recommended）' }] },
      { id: 'depth', question: 'q2', options: [{ label: 'b（Recommended）' }] },
      { id: 'scope_lang', question: 'q3', options: [{ label: 'c（Recommended）' }] },
    ],
    wait: -1,
  });
  assert.deepEqual(parseAskArgs(args), { questionCount: 3, indefinite: true });
});

test('parseAskArgs：无 wait 参数 → 非无限期（preset 默认 600s timed 形态）', () => {
  const args = JSON.stringify({ questions: [{ id: 'hitl2_verdict', question: 'q', options: [{ label: '定稿' }] }] });
  assert.deepEqual(parseAskArgs(args), { questionCount: 1, indefinite: false });
});

test('parseAskArgs：坏参数串不抛——按未知形态处理（0 题 + 非无限期）', () => {
  assert.deepEqual(parseAskArgs('{not json'), { questionCount: 0, indefinite: false });
  assert.deepEqual(parseAskArgs(undefined), { questionCount: 0, indefinite: false });
});

test('nextDriveAction：Submit 可用 = 唯一提交动作（点击它）', () => {
  const obs = { radioCount: 2, checkedCount: 1, submitFound: true, submitDisabled: false };
  assert.equal(nextDriveAction(obs).action, 'click-submit');
});

test('nextDriveAction：多题卡换题后（radio 在、本题未选中）→ click-option，绝不判完成（第 5 例回归钉）', () => {
  // 第 5 例现场形态：答完 Q1 auto-advance 到 Q2——新题头 + 新 radio 未选中 + Submit 禁用。
  // 旧启发式在此形态以"卡头消"判"提交完成"（假绿）；策略必须给 click-option 继续答。
  for (const submitDisabled of [true, false]) {
    const obs = { radioCount: 3, checkedCount: 0, submitFound: submitDisabled, submitDisabled };
    assert.equal(nextDriveAction(obs).action, 'click-option', `submitFound=${submitDisabled}`);
  }
});

test('nextDriveAction：本题已选中、Submit 缺席 → 复点选中项推进（实测复点即翻页）', () => {
  const obs = { radioCount: 3, checkedCount: 1, submitFound: false, submitDisabled: false };
  assert.equal(nextDriveAction(obs).action, 'click-option');
});

test('nextDriveAction：无卡可读 → abort 交盘侧裁决，不自行宣布完成', () => {
  const obs = { radioCount: 0, checkedCount: 0, submitFound: false, submitDisabled: false };
  assert.equal(nextDriveAction(obs).action, 'abort');
});

test('driveVerdict：未 settled（盘侧仍挂起 / result 缺席）= 红——UI 自报永不作为成功判据（BUG-004 裁决升格）', () => {
  const v = driveVerdict({ dryRun: false, settled: false, batch: [], clickCount: 3 });
  assert.equal(v.pass, false);
  assert.equal(v.exitCode, 1);
});

test('driveVerdict：settled + 混合批 = 绿，但跳过数必须显性（偏差不静默）', () => {
  const v = driveVerdict({
    dryRun: false, settled: true,
    batch: [
      { id: 'a', selected: ['x（Recommended）'] },
      { id: 'b', selected: [] },
    ],
    clickCount: 2,
  });
  assert.deepEqual({ pass: v.pass, exitCode: v.exitCode }, { pass: true, exitCode: 0 });
  assert.match(v.reason, /跳过 1 题/, '理由行未点名跳过数');
});

test('driveVerdict：settled + 批有实质作答 = 绿（exit 0）', () => {
  const v = driveVerdict({
    dryRun: false, settled: true,
    batch: [{ id: 'a', selected: ['x（Recommended）'] }, { id: 'b', selected: ['y（Recommended）'] }, { id: 'c', selected: ['z（Recommended）'] }],
    clickCount: 3,
  });
  assert.deepEqual({ pass: v.pass, exitCode: v.exitCode }, { pass: true, exitCode: 0 });
});

test('driveVerdict：dry-run 不判提交（信息性绿）——它本来就不该点', () => {
  const v = driveVerdict({ dryRun: true, settled: false, batch: [], clickCount: 0 });
  assert.deepEqual({ pass: v.pass, exitCode: v.exitCode }, { pass: true, exitCode: 0 });
});

test('driveVerdict：裁决吃盘侧 answer 批内容，不吃点击计数（活体验证发现的形态）', () => {
  // 活体验证实录：UI 在卡上预选/自动推进选中态，点击计数 = 0 而盘侧批非空——
  // 旧判据（answeredCount===0 → 红）在此形态假红。盘侧批有实质选择 = 唯一成功事实。
  const v = driveVerdict({
    dryRun: false, settled: true,
    batch: [{ id: 'hitl2_final', selected: ['按现稿定稿（Recommended）'] }],
    clickCount: 0,
  });
  assert.deepEqual({ pass: v.pass, exitCode: v.exitCode }, { pass: true, exitCode: 0 });
});

test('driveVerdict：settled 但批全空 = 红——空批提交即"把沉默当拍板"（不可放行）', () => {
  const v = driveVerdict({
    dryRun: false, settled: true,
    batch: [{ id: 'hitl2_final', selected: [] }],
    clickCount: 1,
  });
  assert.equal(v.pass, false);
  assert.equal(v.exitCode, 1);
});

test('driveVerdict：未 settled（盘侧仍挂起 / result 缺席）= 红', () => {
  for (const settled of [false]) {
    const v = driveVerdict({ dryRun: false, settled, batch: [], clickCount: 3 });
    assert.equal(v.exitCode, 1, `settled=${settled}`);
  }
});

test('answerBatchOf：从盘侧事件抠 ask 的 answer 批（result 缺席 → 空数组）', () => {
  const callId = 'call_x1';
  const events = [
    { type: 'tool/call', data: { callId, name: 'ask_user_question', arguments: '{"questions":[{"id":"q1"}]}' } },
    { type: 'tool/result', data: { message: { role: 'tool', source: { kind: 'tool', callId }, content: [
      { type: 'text', text: JSON.stringify({ answers: [{ id: 'q1', selected: ['a（Recommended）'] }] }) },
    ] } } },
  ];
  assert.deepEqual(answerBatchOf(events, callId), [{ id: 'q1', selected: ['a（Recommended）'] }]);
  assert.deepEqual(answerBatchOf(events.slice(0, 1), callId), [], 'result 未落地 → 空数组');
  assert.deepEqual(answerBatchOf([{ type: 'turn/start' }], callId), []);
});
