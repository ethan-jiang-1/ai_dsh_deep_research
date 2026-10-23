// binding-trust 回归 —— “这个绑定能不能当本场 run”的单一政策（keyless）。
// 三页签曾各自解释 raw binding（状态页查 pending+kickoff、图谱页只查 kickoff、配置页不查），
// 本文件把政策钉成一张真值表：write 永远可信；read 在挂起/立项窗抑制；其余 read 可信。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindingTrust } from '../../packages/deep-research-pack/src/lib/binding-trust.ts';
import { toolCall, toolResult } from '../fixtures/events.mjs';

const read = (path = 'drt_x/a.md') => toolCall({ name: 'read', arguments: { path }, time: '2026-10-23T10:00:00Z' });
const write = (path = 'drt_x/a.md') => toolCall({ name: 'write', arguments: { file_path: path }, time: '2026-10-23T10:00:00Z' });
const ask = (callId = 'call-1') => toolCall({ name: 'ask_user_question', callId, arguments: { questions: [{}] }, time: '2026-10-23T10:00:00Z' });
const answered = (callId = 'call-1') => toolResult({ callId, text: JSON.stringify({ answers: [{ id: 'q1', selected: ['a'] }] }), time: '2026-10-23T10:01:00Z' });

test('无绑定 → unbound；write 命中 → bound write（即使有挂起）', () => {
  assert.deepEqual(bindingTrust([]), { kind: 'unbound' });
  assert.deepEqual(bindingTrust([{ type: 'assistant/message' }]), { kind: 'unbound' });
  assert.deepEqual(bindingTrust([write()]), { kind: 'bound', slug: 'x', boundBy: 'write' });
  assert.deepEqual(bindingTrust([ask(), write()]), { kind: 'bound', slug: 'x', boundBy: 'write' });
});

test('只读绑定、无挂起无立项 → bound read（恢复会话的只读查询）', () => {
  assert.deepEqual(bindingTrust([read()]), { kind: 'bound', slug: 'x', boundBy: 'read' });
  assert.deepEqual(bindingTrust([read(), toolCall({ name: 'web_search', arguments: { query: 'q' } })]), { kind: 'bound', slug: 'x', boundBy: 'read' });
});

test('只读绑定 + HITL 挂起 → suppressed pending（不被预检读旧 bundle 骗）', () => {
  assert.deepEqual(bindingTrust([read(), ask()]), { kind: 'suppressed', slug: 'x', reason: 'pending' });
  // pending 优先于 kickoff：两者同时在场时，状态页仍走挂起分支（不是“这场还没开始”横幅）。
  assert.deepEqual(bindingTrust([read(), ask(), read()]), { kind: 'suppressed', slug: 'x', reason: 'pending' });
});

test('只读绑定 + 立项信号（ask 已答）→ suppressed kickoff（立项轨道整段抑制）', () => {
  assert.deepEqual(bindingTrust([read(), ask(), answered()]), { kind: 'suppressed', slug: 'x', reason: 'kickoff' });
  // research-brief skill 加载同样算立项信号。
  const brief = toolCall({ name: 'skill', arguments: { name: 'research-brief' } });
  assert.deepEqual(bindingTrust([read(), brief]), { kind: 'suppressed', slug: 'x', reason: 'kickoff' });
});

test('立项信号后 write 落笔 → 自动恢复 bound write（同一会话的 read→write 翻转）', () => {
  assert.deepEqual(bindingTrust([read(), ask(), answered(), write()]), { kind: 'bound', slug: 'x', boundBy: 'write' });
});
