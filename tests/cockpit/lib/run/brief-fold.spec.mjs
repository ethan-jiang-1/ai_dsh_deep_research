// 负例留证 2026-11-14：BUG-033——交付三行曾被 /交付|定稿/ 宽匹配掩盖文案漂移；
// 红配方：改 brief-fold 的 stageLine/knownLine/actionLine 任一交付文案 → 本例红。
// 业务摘要折算回归（brief-fold）——驾驶舱业务摘要层（issue 2026-10-11-executive-research-ux-delivery）。
// 九态可重放输入全覆盖（互补案例规则）+ fail-soft + 禁词（计数不冒充完成度）。
// 红证：测试先于实现提交（模块缺席 = 红）；实现后九态逐态绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveBusinessBrief, readStateOf } from '../../../../packages/deep-research-pack/src/lib/run/brief-fold.ts';

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

test('已交付定稿（BUG-033）：交付三行逐字 + 无需操作', () => {
  const b = deriveBusinessBrief({ ...base, delivered: true, lastDecisionKind: 'approve' });
  assert.equal(b.stageLine, '报告已按你的拍板定稿交付');
  assert.equal(b.knownLine, '当前版已交付；历史拍板见 question.md §Decisions');
  assert.equal(b.actionLine, '你现在无需操作；需要继续研究时在会话里提出（补研究/修订表述走交付审阅语义）');
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

// 负例留证 2026-11-22：BUG-358——bundle 读不到时旧实现落默认「研究推进中」。
// 红配方：删 bundleReadFailure 分支（或把它放到 delivered 之后）→ 本组断言红。
test('BUG-358 bundle 读失败：显式失败 + 重试，不落「研究推进中」', () => {
  for (const state of ['missing', 'unreadable']) {
    const b = deriveBusinessBrief({ ...base, bundleReadFailure: state });
    assert.match(b.stageLine, /读取失败/);
    assert.match(b.actionLine, /重试/);
    assert.doesNotMatch(b.stageLine, /推进/);
    assert.equal(b.userActionNeeded, false);
  }
});

test('readStateOf：null/缺席 = absent；ok = ok；unreadable 原样保留', () => {
  assert.equal(readStateOf(null), 'absent');
  assert.equal(readStateOf({ ok: true }), 'ok');
  assert.equal(readStateOf({ ok: false, reason: 'missing' }), 'absent');
  assert.equal(readStateOf({ ok: false, reason: 'unreadable' }), 'unreadable');
  assert.equal(readStateOf({ ok: false }), 'unreadable', '未知失败原因按 unreadable，不冒充缺席');
});

// 负例留证 2026-11-22：BUG-357——reviewFail 分支先于 delivered，已交付页面仍说「报告不交付」。
// 红配方：把 delivered+reviewFail 分支删掉/放回旧单态 → 本组与无矛盾性质红。
test('BUG-357 已交付 + review FAIL：不出现「报告不交付」，两事实共存', () => {
  const b = deriveBusinessBrief({ ...base, delivered: true, reviewFail: true });
  const all = [b.stageLine, b.knownLine, b.unknownLine ?? '', b.actionLine].join(' ');
  assert.doesNotMatch(all, /报告不交付/);
  assert.match(all, /仍可用/);
  assert.match(all, /新审查|复审/);
});

test('BUG-357 负控：未交付 + review FAIL 仍是交付前政策', () => {
  const b = deriveBusinessBrief({ ...base, delivered: false, reviewFail: true });
  assert.match(b.unknownLine ?? '', /报告不交付/);
});

test('BUG-357 无矛盾性质：任何输入组合不得同时说「已交付」与「报告不交付」', () => {
  for (const delivered of [false, true]) {
    for (const reviewFail of [null, false, true]) {
      for (const bundleReadFailure of [null, 'missing', 'unreadable']) {
        for (const hitlPending of [false, true]) {
          const b = deriveBusinessBrief({ ...base, delivered, reviewFail, bundleReadFailure, hitlPending, pendingKind: hitlPending ? 'hitl2' : null });
          const all = [b.goal, b.stageLine, b.knownLine, b.unknownLine ?? '', b.actionLine].join(' ');
          assert.ok(!(all.includes('已交付') && all.includes('报告不交付')),
            `矛盾组合 delivered=${String(delivered)} reviewFail=${String(reviewFail)} read=${String(bundleReadFailure)} hitl=${String(hitlPending)}：${all}`);
        }
      }
    }
  }
});

// 负例留证 2026-11-22：BUG-361/367——question 读失败/为空仍显示「尚未确认」+ ✓ 立项。
// 红配方：删 questionIssue 分支（goal 恒回落 briefGoalUnknownPending）→ 本组红。
test('BUG-361/367 question 读失败/为空：目标行显式，不回落「尚未确认」', () => {
  for (const [issue, pattern] of [['unreadable', /研究问题读取失败/], ['empty', /研究问题为空/]]) {
    const b = deriveBusinessBrief({ ...base, questionIssue: issue, hasQuestion: false, questionLine: null });
    assert.match(b.goal, pattern);
    assert.doesNotMatch(b.goal, /尚未确认/);
    assert.equal(b.goalKnown, false);
  }
});

// 负例留证 2026-11-22：BUG-363/366——readiness 缺席/空 review 仍被当审查通过。
// 红配方：删 reviewUnconfirmed 分支（回落到 delivered/推进中）→ 本组红。
test('BUG-363/366 审查未定：已交付/未交付都不说审查通过，交付事实保留', () => {
  const delivered = deriveBusinessBrief({ ...base, delivered: true, reviewUnconfirmed: true });
  const text = [delivered.stageLine, delivered.knownLine, delivered.unknownLine ?? '', delivered.actionLine].join(' ');
  assert.match(text, /报告已交付/);
  assert.match(text, /审查结论未确认/);
  assert.doesNotMatch([delivered.stageLine, delivered.knownLine].join(' '), /审查通过/, '交付阶段/已知行不得声称审查通过');
  assert.match(delivered.unknownLine ?? '', /不能把交付当成审查通过/, '未定行必须明确否定「交付=审查通过」');
  assert.equal(delivered.userActionNeeded, false);
  const open = deriveBusinessBrief({ ...base, delivered: false, reviewUnconfirmed: true });
  assert.match(open.stageLine, /审查未定/);
  assert.match(open.actionLine, /重试/);
});

test('reviewUnconfirmed 与 reviewFail 不互串：FAIL 仍走交付前政策；unconfirmed 不走 FAIL 文案', () => {
  const fail = deriveBusinessBrief({ ...base, reviewFail: true });
  assert.match(fail.unknownLine ?? '', /报告不交付/);
  const unconfirmed = deriveBusinessBrief({ ...base, reviewUnconfirmed: true, reviewFail: null });
  assert.doesNotMatch(unconfirmed.unknownLine ?? '', /报告不交付/);
});

// 负例留证 2026-11-23：BUG-369——冲突被折成 unconfirmed/审查未定，交付页签与状态页不同判。
test('BUG-369 审查冲突：交付/未交付都点名冲突，不说单边通过', () => {
  const delivered = deriveBusinessBrief({ ...base, delivered: true, reviewConflict: true });
  assert.match(delivered.stageLine, /审查结论冲突/);
  assert.match(delivered.unknownLine ?? '', /声明与 review\.md 必须同判/);
  assert.equal(delivered.userActionNeeded, false);
  const open = deriveBusinessBrief({ ...base, delivered: false, reviewConflict: true });
  assert.match(open.stageLine, /声明与 review\.md 冲突/);
  assert.match(open.actionLine, /修正/);
});
