// stream-diagnostics selection contract: --recent counts model-active sessions, not merely fresh logs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeModelAttempts, selectRecentActiveSessions } from '../../scripts/lib/stream-diagnostics-core.mjs';

const activeEvents = new Map([
  ['new-tool-only', [{ type: 'tool/call', data: { name: 'web_search' } }]],
  ['new-hitl-only', [{ type: 'tool/call', data: { name: 'ask_user_question' } }, { type: 'user/message' }]],
  ['older-failed-model', [{ type: 'assistant/attempt', data: { turn: 1 } }]],
  ['old-retry', [{ type: 'llm/retry', data: { provider: 'test' } }]],
]);
const entries = [
  { id: 'new-tool-only', logPath: 'new-tool-only', mtime: 400 },
  { id: 'new-hitl-only', logPath: 'new-hitl-only', mtime: 300 },
  { id: 'older-failed-model', logPath: 'older-failed-model', mtime: 200 },
  { id: 'old-retry', logPath: 'old-retry', mtime: 100 },
];
const readEvents = (path) => ({ readable: true, events: activeEvents.get(path) ?? [] });

test('--recent N filters model activity before limiting; tool/HITL-only sessions do not occupy slots', () => {
  const selected = selectRecentActiveSessions(entries, 1, readEvents);
  assert.deepEqual(selected.map((entry) => entry.id), ['older-failed-model']);
  assert.equal(selected[0].events[0].type, 'assistant/attempt');
});

test('--recent includes successful assistant messages and retry-only model activity', () => {
  const events = new Map([
    ['assistant-message', [{ type: 'assistant/message' }]],
    ['retry-started', [{ type: 'llm/retry-started' }]],
  ]);
  const selected = selectRecentActiveSessions([
    { id: 'assistant-message', logPath: 'assistant-message', mtime: 2 },
    { id: 'retry-started', logPath: 'retry-started', mtime: 1 },
  ], 2, (path) => ({ readable: true, events: events.get(path) }));
  assert.deepEqual(selected.map((entry) => entry.id), ['assistant-message', 'retry-started']);
});

test('successful settlements count in the attempt timeline and recover a preceding failed attempt', () => {
  const analysis = analyzeModelAttempts([
    { type: 'assistant/attempt', seq: 1, time: 10, data: { turn: 1, step: 1 }, error: { code: 'PROVIDER_ERROR' } },
    { type: 'assistant/message', seq: 4, time: 25, data: { turn: 1, step: 2 } },
  ]);
  assert.deepEqual(analysis.attempts.map(({ status, code }) => ({ status, code })), [
    { status: 'failed', code: 'PROVIDER_ERROR' },
    { status: 'success', code: null },
  ]);
  assert.equal(analysis.fails, 1);
  assert.equal(analysis.endState, 'recovered');
});

test('successful-only histories report one successful model attempt and no failure', () => {
  const analysis = analyzeModelAttempts([
    { type: 'assistant/message', seq: 2, time: 20, data: { turn: 1, step: 1 } },
    { type: 'assistant/message', seq: 5, time: 50, data: { turn: 1, step: 2 } },
  ]);
  assert.equal(analysis.attempts.length, 2);
  assert.deepEqual(analysis.attempts.map((attempt) => attempt.status), ['success', 'success']);
  assert.equal(analysis.fails, 0);
  assert.equal(analysis.endState, 'alive-or-idle');
});

test('terminal failure remains dead when no later successful provider settlement exists', () => {
  const analysis = analyzeModelAttempts([
    { type: 'assistant/message', seq: 1, time: 10, data: { turn: 1, step: 1 } },
    { type: 'assistant/attempt', seq: 4, time: 40, data: { turn: 1, step: 2 }, error: { code: 'STREAM_ERROR' } },
  ]);
  assert.equal(analysis.fails, 1);
  assert.equal(analysis.endState, 'dead');
});
test('--recent skips unreadable logs and preserves newest-first order', () => {
  const selected = selectRecentActiveSessions([
    { id: 'unreadable', logPath: 'unreadable', mtime: 3 },
    { id: 'active-newer', logPath: 'active-newer', mtime: 2 },
    { id: 'active-older', logPath: 'active-older', mtime: 1 },
  ], 1, (path) => path === 'unreadable'
    ? { readable: false, events: [] }
    : { readable: true, events: [{ type: 'assistant/message' }] });
  assert.deepEqual(selected.map((entry) => entry.id), ['active-newer']);
});

test('--recent falls back to one result when the requested count is invalid', () => {
  const selected = selectRecentActiveSessions([
    { id: 'active-newer', logPath: 'active-newer', mtime: 2 },
    { id: 'active-older', logPath: 'active-older', mtime: 1 },
  ], Number.NaN, (path) => ({ readable: true, events: [{ type: 'assistant/message' }] }));
  assert.deepEqual(selected.map((entry) => entry.id), ['active-newer']);
});
