// Method Library watcher decodes durable Session call/result identities, not prose acknowledgments.
import test from 'node:test'
import assert from 'node:assert/strict'
import { methodLibraryCoachEventOf } from '../../packages/deep-research-pack/src/lib/method-library-events.ts'

test('identifies owner prompt request IDs from durable user messages', () => {
  assert.deepEqual(methodLibraryCoachEventOf({
    type: 'user/message',
    data: { source: { kind: 'user', rpcId: 'request-1' }, content: [{ type: 'text', text: 'operation' }] },
  }), { kind: 'user-rpc', requestId: 'request-1' })
  assert.equal(methodLibraryCoachEventOf({
    type: 'user/message',
    data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'manual prompt' }] },
  }), null)
})

test('reads live assistant text for draft fill', () => {
  assert.deepEqual(methodLibraryCoachEventOf({
    type: 'assistant/message',
    seq: 7,
    data: { turn: 2, message: { content: [{ type: 'text', text: '草稿' }, { type: 'reasoning', text: '隐藏' }] } },
  }), { kind: 'assistant-text', seq: 7, turn: 2, text: '草稿' })
  assert.equal(methodLibraryCoachEventOf({
    type: 'assistant/message',
    data: { message: { content: [{ type: 'text', text: '草稿' }] } },
  }), null)
})

test('decodes a method tool call and correlates its result by callId', () => {
  const call = methodLibraryCoachEventOf({
    type: 'tool/call', data: { turn: 1, callId: 'call-1', name: 'method_library_upsert', arguments: '{"operationId":"op-1234567890123456"}' },
  })
  assert.deepEqual(call, { kind: 'tool-call', callId: 'call-1', turn: 1, name: 'method_library_upsert', args: { operationId: 'op-1234567890123456' } })
  const result = methodLibraryCoachEventOf({
    type: 'tool/result', data: { message: { source: { callId: 'call-1' }, isError: false }, meta: { operationId: 'op-1234567890123456' } },
  })
  assert.deepEqual(result, { kind: 'tool-result', callId: 'call-1', failed: false, result: { operationId: 'op-1234567890123456' } })
})

test('ignores prose confirmation as an operation result and safely rejects malformed events', () => {
  assert.deepEqual(methodLibraryCoachEventOf({
    type: 'assistant/message', seq: 9, data: { turn: 3, message: { content: [{ type: 'text', text: '已写入：方法' }] } },
  }), { kind: 'assistant-text', seq: 9, turn: 3, text: '已写入：方法' })
  assert.equal(methodLibraryCoachEventOf({ type: 'tool/result', data: { message: { source: { callId: '' } } } }), null)
  assert.deepEqual(methodLibraryCoachEventOf({ type: 'tool/call', data: { turn: 2, callId: 'call', name: 'x', arguments: '{bad' } }), {
    kind: 'tool-call', callId: 'call', turn: 2, name: 'x', args: null,
  })
  assert.deepEqual(methodLibraryCoachEventOf({ type: 'turn/start', data: { turn: 1 } }), { kind: 'turn-start', turn: 1 })
})
