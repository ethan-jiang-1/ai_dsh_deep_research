// bundle-bind 回归 — 会话 → run bundle 绑定折算（keyless；RFC right-pane-ux-debt：
// 状态页签只跟本会话自己的 run）。信号 = tool/call 参数里的 drt_<slug>/ 路径形态。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionBindingOf, sessionBundleOf } from '../../packages/deep-research-pack/src/lib/bundle-bind.ts';
import { toolCall } from '../fixtures/events.mjs';

// wire 正本 = tests/fixtures/events.mjs；字符串 arguments 原样传（坏 JSON 负例形态）。
const call = (name, args) => toolCall({ name, arguments: args });
const ev = (type, data = {}) => ({ type, data });

test('write/edit 调用携带 bundle 内路径 → 绑定该 slug', () => {
  const events = [
    ev('session'), ev('turn/start'),
    call('write', { path: 'drt_dsh-release-watch/question.md', content: '# q' }),
    call('edit', { path: 'drt_dsh-release-watch/journal.md', old: 'a', new: 'b' }),
  ];
  assert.equal(sessionBundleOf(events), 'dsh-release-watch');
});

test('read/glob/grep 调用同样可绑（恢复会话场景）', () => {
  const events = [
    call('read', { path: 'drt_cn-llm-infra/final.md' }),
    call('glob', { pattern: 'drt_cn-llm-infra/evidence/*.md' }),
  ];
  assert.equal(sessionBundleOf(events), 'cn-llm-infra');
});

test('无 bundle 动作（纯检索/抓取会话）→ undefined（不显示别家数据）', () => {
  const events = [
    call('web_search', { queries: ['DSH harness'] }),
    call('web_fetch', { url: 'https://api-docs.deepseek.com/' }),
    ev('assistant/message', { message: { content: [{ type: 'text', text: '探针完成' }] } }),
  ];
  assert.equal(sessionBundleOf(events), undefined);
});

test('写强读弱：先写 A 后读 B（立项预检读旧 bundle 的实测形态）→ 仍绑 A（G4）', () => {
  const events = [
    call('write', { path: 'drt_first-run/question.md' }),
    call('read', { path: 'drt_second-run/final.md' }),
  ];
  assert.equal(sessionBundleOf(events), 'first-run');
});

test('多个写命中 → 最新写为准（另起/转续场景）', () => {
  const events = [
    call('write', { path: 'drt_first-run/question.md' }),
    call('edit', { path: 'drt_second-run/journal.md' }),
  ];
  assert.equal(sessionBundleOf(events), 'second-run');
});

test('sessionBindingOf 暴露绑定强度：仅读命中 → boundBy read（挂起期消费方据此抑制渐进面）', () => {
  const events = [call('read', { path: 'drt_cn-us-open-source/question.md' })];
  assert.deepEqual(sessionBindingOf(events), { slug: 'cn-us-open-source', boundBy: 'read', kickoffSeen: false });
});

test('sessionBindingOf：写命中 → boundBy write；无命中 → 全 undefined', () => {
  assert.deepEqual(sessionBindingOf([call('write', { path: 'drt_a/x.md' })]), { slug: 'a', boundBy: 'write', kickoffSeen: false });
  assert.deepEqual(sessionBindingOf([]), { slug: undefined, boundBy: undefined, kickoffSeen: false });
});

// ── kickoffSeen（BUG-001：立项轨道信号——ask_user_question 调用或 research-brief skill 加载）──

test('kickoff：research-brief skill 加载（开工第一步）→ kickoffSeen true', () => {
  const events = [call('skill', { name: 'research-brief' })];
  assert.equal(sessionBindingOf(events).kickoffSeen, true);
});

test('kickoff：ask_user_question 调用（HITL1 三问）→ kickoffSeen true（含仅读绑定的立项窗口）', () => {
  const events = [
    call('read', { path: 'drt_old-run/final.md' }), // 预检读取旧 bundle（错绑源）
    call('ask_user_question', { questions: [{ id: 'q1', header: '研究类型' }] }),
  ];
  const b = sessionBindingOf(events);
  assert.equal(b.slug, 'old-run');
  assert.equal(b.boundBy, 'read');
  assert.equal(b.kickoffSeen, true); // 消费方据此抑制："这场还没开始"
});

test('kickoff：恢复会话形态（只读目标 bundle、无立项动作）→ kickoffSeen false（渐进面不受影响）', () => {
  const events = [
    call('read', { path: 'drt_cn-llm-infra/question.md' }),
    call('read', { path: 'drt_cn-llm-infra/topics.md' }),
  ];
  assert.equal(sessionBindingOf(events).kickoffSeen, false);
});

test('kickoff 边界：别的 skill 不算；畸形 skill 参数 fail-soft', () => {
  assert.equal(sessionBindingOf([call('skill', { name: 'synthesis' })]).kickoffSeen, false);
  assert.equal(sessionBindingOf([call('skill', '{"name":"research')]).kickoffSeen, false);
  assert.equal(sessionBindingOf([call('skill', 'not-json')]).kickoffSeen, false);
});

test('用户消息文本提到 drt_ 不构成绑定（只认工具调用——问句顺带提及 ≠ 真的在动手）', () => {
  const events = [
    ev('user/message', { content: [{ type: 'text', text: '继续 drt_some-run 这个 run' }] }),
    call('web_search', { queries: ['x'] }),
  ];
  assert.equal(sessionBundleOf(events), undefined);
});

test('截断 JSON 参数 → 跳过不崩（流式前缀形态）', () => {
  const events = [call('write', '{"path":"drt_probe/que')];
  assert.equal(sessionBundleOf(events), undefined);
});

test('畸形输入 fail-soft 不崩', () => {
  assert.equal(sessionBundleOf([]), undefined);
  assert.equal(sessionBundleOf([null, undefined, 'x', 42, {}, ev('tool/call')]), undefined);
});

test('slug 形态边界：连字符合法、数字合法、斜杠后必须真有路径段', () => {
  assert.equal(sessionBundleOf([call('write', { path: 'drt_a-1-b/v2/x.md' })]), 'a-1-b');
  assert.equal(sessionBundleOf([call('write', { file_path: 'notes.md', content: 'mention drt_foo/ in prose only' })]), undefined); // 正文提及不算绑定（BUG-090）
});


// 负例留证 2026-11-12：BUG-096——修复前任何 ask_user_question 都置 kickoff；HITL2 交付审阅
// 被误当新 run 开工。还原法 = isKickoffCall 对 ask 直接 true。
test('BUG-096 kickoff：HITL1 三问才算；HITL2 交付审阅/未知 ask 不算', () => {
  const hitl1 = call('ask_user_question', { questions: [{ id: 'q1', header: '研究类型' }] })
  const hitl2 = call('ask_user_question', { questions: [{ id: 'q1', header: '审阅与拍板', options: ['定稿（按现稿交付）'] }] })
  const unknown = call('ask_user_question', { questions: [{ id: 'q1', header: '中途确认' }] })
  assert.equal(sessionBindingOf([hitl1]).kickoffSeen, true)
  assert.equal(sessionBindingOf([hitl2]).kickoffSeen, false)
  assert.equal(sessionBindingOf([unknown]).kickoffSeen, false)
  assert.equal(sessionBindingOf([call('skill', { name: 'research-brief' })]).kickoffSeen, true)
})


// 负例留证 2026-11-12：BUG-090——修复前全量 stringify 参数，正文里的 drt_ 也强绑定。
// 还原法 = slugInArgs 回到 JSON.stringify(obj) 子串匹配。
test('BUG-090 绑定只看真实路径字段：正文/grep pattern 不绑，路径段边界要成立', () => {
  assert.equal(sessionBundleOf([call('write', { file_path: 'notes.md', content: 'see drt_other/run.md' })]), undefined)
  assert.equal(sessionBundleOf([call('grep', { pattern: 'drt_other/run.md' })]), undefined)
  assert.equal(sessionBundleOf([call('write', { file_path: 'drt_real/run.md' })]), 'real')
  assert.equal(sessionBundleOf([call('glob', { pattern: 'drt_globbed/evidence/*.md' })]), 'globbed')
  assert.equal(sessionBundleOf([call('write', { file_path: 'not_drt_fake/x.md' })]), undefined)
  assert.equal(sessionBundleOf([call('read', { paths: ['a.md', 'drt_multi/final.md'] })]), 'multi')
})

// 负例留证 2026-11-13：BUG-135——slug 字符集未成文，下划线/点号目录静默不绑定。
// 还原法 = bind 正则退回 [a-z0-9][a-z0-9-]*。
test('BUG-135 slug 字符集：下划线/点号/大写目录也绑定', () => {
  assert.equal(sessionBundleOf([call('write', { file_path: 'drt_llm_inference_cost/final.md' })]), 'llm_inference_cost')
  assert.equal(sessionBundleOf([call('write', { file_path: 'drt_v1.2/final.md' })]), 'v1.2')
  assert.equal(sessionBundleOf([call('write', { file_path: 'drt_Mixed_Case/final.md' })]), 'Mixed_Case')
  assert.equal(sessionBundleOf([call('write', { file_path: 'drt_bad slug/final.md' })]), undefined)
})
