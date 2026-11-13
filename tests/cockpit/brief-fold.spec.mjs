// 业务摘要折算回归（brief-fold）——驾驶舱业务摘要层（issue 2026-10-11-executive-research-ux-delivery）。
// 九态可重放输入全覆盖（互补案例规则）+ fail-soft + 禁词（计数不冒充完成度）。
// 红证：测试先于实现提交（模块缺席 = 红）；实现后九态逐态绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveBusinessBrief } from '../../packages/deep-research-pack/src/lib/brief-fold.ts';

const base = {
  bundleBound: true,
  kickoffHold: false,
  hitlPending: false,
  pendingKind: null,
  pendingQuestions: 0,
  hasQuestion: true,
  questionLine: '明年是否进入东南亚市场试点？',
  currentStage: '挖掘',
  findingsPresent: false,
  reviewFail: null,
  delivered: false,
  versions: 1,
  lastDecisionKind: null,
  openItems: [],
};

test('未绑定 bundle：目标尚未确认、无需操作（不显示别家数据）', () => {
  const b = deriveBusinessBrief({ ...base, bundleBound: false });
  assert.equal(b.goalKnown, false, '未绑定态不得显示目标——无 question 事实');
  assert.match(b.actionLine, /无需操作/);
  assert.equal(b.userActionNeeded, false);
});

test('HITL1 挂起：立项确认 + 问数点名 + 需要你操作', () => {
  const b = deriveBusinessBrief({ ...base, hitlPending: true, pendingKind: 'hitl1', pendingQuestions: 3, hasQuestion: false, questionLine: null, currentStage: '立项' });
  assert.match(b.stageLine, /立项确认/);
  assert.match(b.stageLine, /3 问/);
  assert.equal(b.userActionNeeded, true);
  assert.match(b.actionLine, /问题卡/);
});

test('HITL1 契约外形态（kind unknown 且无 question 文件）→ 同立项确认（对齐 deriveAnchors a1Pending）', () => {
  const b = deriveBusinessBrief({ ...base, hitlPending: true, pendingKind: 'unknown', hasQuestion: false, questionLine: null });
  assert.match(b.stageLine, /立项确认/);
  assert.equal(b.userActionNeeded, true);
});

test('缺输入态：openItems 显性为待确认行（不猜补、不冒充完整）', () => {
  const b = deriveBusinessBrief({ ...base, openItems: ['试点预算上限'] });
  assert.match(b.unknownLine, /待确认/);
  assert.match(b.unknownLine, /试点预算上限/);
});

test('Critic FAIL：审查修复静默推进 + 无需用户操作 + 未知显性', () => {
  const b = deriveBusinessBrief({ ...base, reviewFail: true, currentStage: '审查' });
  assert.match(b.stageLine, /审查/);
  assert.match(b.stageLine, /修复/);
  assert.equal(b.userActionNeeded, false);
  assert.ok(b.unknownLine !== null, 'FAIL 态必须有未知/阻塞行');
});

test('超复审上限升级：reviewFail + HITL2 挂起 → 交付审阅优先（升级走既有交互点）', () => {
  const b = deriveBusinessBrief({ ...base, reviewFail: true, hitlPending: true, pendingKind: 'hitl2' });
  assert.match(b.stageLine, /交付审阅/);
  assert.equal(b.userActionNeeded, true);
});

test('HITL2 挂起：三选一动作点名（定稿/补研究/修订表述）', () => {
  const b = deriveBusinessBrief({ ...base, hitlPending: true, pendingKind: 'hitl2' });
  assert.match(b.stageLine, /交付审阅/);
  assert.match(b.actionLine, /定稿/);
  assert.match(b.actionLine, /补研究/);
  assert.match(b.actionLine, /修订/);
});

test('HITL2 补研究拍板后：重入挖掘 + 下一版本语义（versions ≥2 呼应）', () => {
  const b = deriveBusinessBrief({ ...base, delivered: true, versions: 2, lastDecisionKind: 'more' });
  assert.match(b.stageLine, /补研究/);
  assert.match(b.stageLine, /下一版本/);
  assert.equal(b.userActionNeeded, false);
});

test('HITL2 修订表述拍板后：原位修改、不产生新版本', () => {
  const b = deriveBusinessBrief({ ...base, delivered: true, lastDecisionKind: 'rewrite' });
  assert.match(b.stageLine, /原位/);
  assert.equal(b.userActionNeeded, false);
});

test('已交付定稿：报告已交付 + 无需操作', () => {
  const b = deriveBusinessBrief({ ...base, delivered: true, lastDecisionKind: 'approve' });
  assert.match(b.stageLine, /交付|定稿/);
  assert.equal(b.userActionNeeded, false);
});

test('研究推进中：阶段业务语言 + 无结论不冒充（findings 缺席 → 尚未形成结论）', () => {
  const b = deriveBusinessBrief({ ...base });
  assert.match(b.stageLine, /挖掘/);
  assert.match(b.knownLine, /尚未形成结论/);
  assert.equal(b.userActionNeeded, false);
});

test('fail-soft：空/畸形输入不 throw，输出如实缺省', () => {
  const b = deriveBusinessBrief({});
  assert.equal(typeof b.stageLine, 'string');
  assert.equal(b.userActionNeeded, false);
});

test('禁词：全部输出行不含证据计数形态（「份」字与「证据 N」）——计数不冒充完成度', () => {
  const inputs = [
    base,
    { ...base, bundleBound: false },
    { ...base, hitlPending: true, pendingKind: 'hitl1', pendingQuestions: 3 },
    { ...base, hitlPending: true, pendingKind: 'hitl2' },
    { ...base, reviewFail: true },
    { ...base, delivered: true, versions: 2, lastDecisionKind: 'more' },
    { ...base, openItems: ['预算上限'] },
  ];
  for (const input of inputs) {
    const b = deriveBusinessBrief(input);
    for (const line of [b.goal, b.stageLine, b.knownLine, b.unknownLine ?? '', b.actionLine]) {
      assert.ok(!line.includes('份'), `输出行含「份」计数形态：${line}`);
      assert.ok(!/证据\s*\d/.test(line), `输出行含「证据 N」计数形态：${line}`);
    }
  }
});
