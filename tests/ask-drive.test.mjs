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
//
// 负例留证 2026-10-09：BUG-004——driveVerdict 判据弱化（result 缺席 / UI 自报也当 settled 放行）
//   →「driveVerdict：未 settled」测红；还原判据 → 绿。
// 负例留证 2026-10-09：BUG-005——parseAskArgs 丢 wait 参数（或把 -1 当默认 timed）→「三问卡带
//   wait:-1」测红；还原 → 绿。
// 负例留证 2026-10-09：BUG-015——决策层退回「Submit 可用即 click-submit」（去意图符合性）→
//   「nextDriveAction：Submit 可用但预选与意图不符」测红；还原 → 绿。
// 负例留证 2026-10-09：BUG-017——parseAskQuestions 丢 header 字段（题面富集源缺席）→ deepEqual
//   红；还原 → 绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAskArgs, nextDriveAction, driveVerdict, answerBatchOf, parseAskQuestions, pickTargetLabel, intentReconcile } from '../scripts/lib/ask-drive.mjs';

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

// ── BUG-015 契约：pick 实现（决策层）+ 意图对账（裁决后）——license run 劫持实录的机制钉 ──
// 劫持机制：UI 预选推荐项 → Submit 立即可用 → 旧决策层第一步就 click-submit，clickOption 的
// pick 逻辑永远够不着。修复 = 决策层带意图符合性（不符先改选）+ 盘侧落地批与 pick 命令对账。

test('parseAskQuestions：完整参数 → 逐题 id / header / prompt / option 标签（意图解析的输入面；header = provenance 题面富集源，BUG-017）', () => {
  const args = JSON.stringify({
    questions: [
      { id: 'hitl2', header: '交付审阅', question: '定稿还是补研究？', options: [{ label: '定稿（Recommended）' }, { label: '补研究：破单源' }] },
    ],
  });
  assert.deepEqual(parseAskQuestions(args), [
    { id: 'hitl2', header: '交付审阅', prompt: '定稿还是补研究？', options: ['定稿（Recommended）', '补研究：破单源'] },
  ]);
  assert.deepEqual(parseAskQuestions('{not json'), [], '坏串 → 空数组（不猜）');
  assert.deepEqual(parseAskQuestions(undefined), []);
});

test('pickTargetLabel：recommended → 带 Recommended 标签；缺席 → 回退首项并标 fallback', () => {
  const labels = ['定稿（Recommended）', '补研究：破单源'];
  assert.deepEqual(pickTargetLabel(labels, 'recommended'), { label: '定稿（Recommended）', resolved: 'exact' });
  assert.deepEqual(pickTargetLabel(['甲', '乙'], 'recommended'), { label: '甲', resolved: 'fallback' }, '无 Recommended 标签 → 回退首项（回退是确定性的，对账仍可判）');
});

test('pickTargetLabel：first → 首项；数字 N → 第 N 项；越界/空 → 不可解析（label=null，不猜）', () => {
  const labels = ['甲（Recommended）', '乙', '丙'];
  assert.deepEqual(pickTargetLabel(labels, 'first'), { label: '甲（Recommended）', resolved: 'exact' });
  assert.deepEqual(pickTargetLabel(labels, '2'), { label: '乙', resolved: 'exact' });
  assert.deepEqual(pickTargetLabel(labels, '9'), { label: null, resolved: null }, '越界 → 不猜（对账据此响亮红）');
  assert.deepEqual(pickTargetLabel([], 'recommended'), { label: null, resolved: null });
});

test('nextDriveAction：Submit 可用但预选与意图不符 → click-option（先改选再提交）——BUG-015 劫持形态的决策层钉', () => {
  // license run 劫持实录形态：单题卡、UI 预选推荐项、Submit 已可用、pick=2 意图第二项。
  const obs = { radioCount: 2, checkedCount: 1, submitFound: true, submitDisabled: false, selectionMatchesIntent: false };
  const act = nextDriveAction(obs);
  assert.equal(act.action, 'click-option', 'Submit 可用 ≠ 意图达成——不符先改选');
  assert.match(act.reason, /意图/, '理由行须点名意图不符');
});

test('nextDriveAction：selectionMatchesIntent 缺席或相符 + Submit 可用 → click-submit（旧行为不破坏）', () => {
  const base = { radioCount: 2, checkedCount: 1, submitFound: true, submitDisabled: false };
  assert.equal(nextDriveAction(base).action, 'click-submit', '缺席（旧调用方）= 视为相符');
  assert.equal(nextDriveAction({ ...base, selectionMatchesIntent: true }).action, 'click-submit');
});

test('intentReconcile：落地批与 pick 一致 → ok（含 recommended 回退形态仍可判）', () => {
  const questions = [{ id: 'hitl2', prompt: 'q', options: ['定稿（Recommended）', '补研究：破单源'] }];
  const batch = [{ id: 'hitl2', selected: ['补研究：破单源'] }];
  assert.deepEqual(intentReconcile({ batch, questions, pick: '2' }), { ok: true, mismatches: [] });
  const batchRec = [{ id: 'hitl2', selected: ['定稿（Recommended）'] }];
  assert.equal(intentReconcile({ batch: batchRec, questions, pick: 'recommended' }).ok, true);
});

test('intentReconcile：落地与 pick 不符 → ok=false + 逐题报告——license run 劫持实录形态（答案落地但不是命令的答案）', () => {
  const questions = [{ id: 'hitl2', prompt: 'q', options: ['定稿（Recommended）', '补研究：破单源'] }];
  const batch = [{ id: 'hitl2', selected: ['定稿（Recommended）'] }]; // 命令 pick=2，UI 预选被提交
  const rec = intentReconcile({ batch, questions, pick: '2' });
  assert.equal(rec.ok, false);
  assert.equal(rec.mismatches.length, 1);
  assert.deepEqual(
    { id: rec.mismatches[0].id, expected: rec.mismatches[0].expected, landed: rec.mismatches[0].landed },
    { id: 'hitl2', expected: '补研究：破单源', landed: '定稿（Recommended）' },
  );
});

test('intentReconcile：目标不可解析（数字越界）→ 红，不猜；批缺席题不误报', () => {
  const questions = [
    { id: 'a', prompt: 'q1', options: ['x', 'y'] },
    { id: 'b', prompt: 'q2', options: ['m（Recommended）', 'n'] },
  ];
  const rec = intentReconcile({ batch: [{ id: 'a', selected: ['x'] }], questions, pick: '9' });
  assert.equal(rec.ok, false, '不可解析目标 = 意图未证实，不放行');
  assert.equal(rec.mismatches[0].id, 'a');
  const recOk = intentReconcile({ batch: [{ id: 'a', selected: ['x'] }], questions, pick: 'first' });
  assert.equal(recOk.ok, true, '批缺席的题（b）不进对账（跳过已由 driveVerdict 显性报告）');
});
