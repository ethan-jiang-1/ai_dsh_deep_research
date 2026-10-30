// Method-library command authorization fold: UI owner prompt -> one matching tool call.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  applyMethodLibraryOperationEvent,
  initialMethodLibraryOperationState,
} from '../../packages/deep-research-pack/src/lib/method-library-commands.ts'
import { methodLibraryCommandText } from '../../packages/deep-research-pack/src/lib/method-library-operation.ts'

const entryText = '## 机房选型\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d'
const payloadHash = createHash('sha256').update(entryText, 'utf8').digest('hex')
const command = {
  operationId: 'op-method-library-1',
  action: 'save-and-set-default',
  name: '机房选型',
  payloadHash,
}
const requestId = 'request-1'

function operationTurn() {
  const methodEditor = { ...initialMethodLibraryOperationState, methodEditor: true }
  return applyMethodLibraryOperationEvent(methodEditor, { type: 'turn/start', seq: 0, time: 0, data: { turn: 1 } })
}
const userEvent = (source, text) => ({
  type: 'user/message',
  seq: 1,
  time: 1,
  data: { id: 'message-1', role: 'user', source, content: [{ type: 'text', text }] },
  surfaceOp: 'append',
})
const toolCallEvent = (callId, args) => ({
  type: 'tool/call', seq: 2, time: 2,
  data: { turn: 1, step: 1, callId, name: 'method_library_upsert', arguments: JSON.stringify(args) },
})
const toolResultEvent = (callId) => ({
  type: 'tool/result', seq: 3, time: 3,
  data: {
    turn: 1,
    step: 1,
    message: { id: 'tool-result-1', role: 'tool', source: { kind: 'tool', callId }, toolCallId: callId, content: [], isError: false },
  },
  surfaceOp: 'append',
})

test('owner command authorizes one matching save-and-set-default call', () => {
  const start = applyMethodLibraryOperationEvent(operationTurn(), userEvent(
    { kind: 'user', rpcId: requestId },
    methodLibraryCommandText(command),
  ))
  assert.deepEqual(start.pending, { ...command, requestId, turn: 1 })

  const claimed = applyMethodLibraryOperationEvent(start, toolCallEvent('call-1', {
    operationId: command.operationId,
    defaultAction: 'set',
    operationHash: payloadHash,
    entry: entryText,
  }))
  assert.equal(claimed.pending, null)
  assert.deepEqual(claimed.claims, [{ ...command, requestId, turn: 1, callId: 'call-1' }])
  assert.equal(claimed.claims[0]?.payloadHash, payloadHash)
})

test('non-owner, unrelated and mismatched calls cannot claim a UI command', () => {
  const nonOwner = applyMethodLibraryOperationEvent(operationTurn(), userEvent(
    { kind: 'user', rpcId: requestId, principal: { kind: 'bearer', name: 'other' } },
    methodLibraryCommandText(command),
  ))
  assert.equal(nonOwner.pending, null)
  const malformedSource = applyMethodLibraryOperationEvent(operationTurn(), userEvent(
    { kind: 'user', rpcId: requestId, principal: undefined },
    methodLibraryCommandText(command),
  ))
  assert.deepEqual(malformedSource.pending, { ...command, requestId, turn: 1 })

  const start = applyMethodLibraryOperationEvent(operationTurn(), userEvent(
    { kind: 'user', rpcId: requestId },
    methodLibraryCommandText(command),
  ))
  const unrelated = applyMethodLibraryOperationEvent(start, toolCallEvent('wrong-tool', {
    operationId: command.operationId,
    defaultAction: 'preserve',
    operationHash: payloadHash,
    entry: entryText,
  }))
  assert.equal(unrelated.pending, null)
  assert.deepEqual(unrelated.claims, [])
})

test('a tool call must echo the exact operation hash to acquire a Host claim', () => {
  const start = applyMethodLibraryOperationEvent(operationTurn(), userEvent(
    { kind: 'user', rpcId: requestId },
    methodLibraryCommandText(command),
  ))
  const mismatched = applyMethodLibraryOperationEvent(start, toolCallEvent('wrong-hash', {
    operationId: command.operationId,
    defaultAction: 'set',
    operationHash: '0'.repeat(64),
    entry: entryText,
  }))
  assert.equal(mismatched.pending, null)
  assert.deepEqual(mismatched.claims, [])

  const tamperedContent = applyMethodLibraryOperationEvent(start, toolCallEvent('tampered-content', {
    operationId: command.operationId,
    defaultAction: 'set',
    operationHash: payloadHash,
    entry: `${entryText}\n- changed: true`,
  }))
  assert.deepEqual(tamperedContent.claims, [{ ...command, requestId, turn: 1, callId: 'tampered-content' }])
})

test('malformed command markers and owner messages without the exact marker do not authorize writes', () => {
  const malformed = applyMethodLibraryOperationEvent(operationTurn(), userEvent(
    { kind: 'user', rpcId: requestId },
    '【方法库操作】{"operationId":"short","action":"clear-default"}',
  ))
  assert.equal(malformed.pending, null)
  const plain = applyMethodLibraryOperationEvent(operationTurn(), userEvent(
    { kind: 'user', rpcId: requestId },
    '请把它设为默认。',
  ))
  assert.equal(plain.pending, null)
})

test('a matching tool call from another turn cannot claim a command', () => {
  const start = applyMethodLibraryOperationEvent(operationTurn(), userEvent(
    { kind: 'user', rpcId: requestId },
    methodLibraryCommandText(command),
  ))
  const inTurn = applyMethodLibraryOperationEvent(start, { type: 'turn/start', seq: 2, time: 2, data: { turn: 7 } })
  const wrongTurn = applyMethodLibraryOperationEvent(inTurn, {
    ...toolCallEvent('wrong-turn', { operationId: command.operationId, defaultAction: 'set', entry: 'x' }),
    data: { ...toolCallEvent('wrong-turn', { operationId: command.operationId, defaultAction: 'set', entry: 'x' }).data, turn: 8 },
  })
  assert.equal(wrongTurn.pending, null)
  assert.deepEqual(wrongTurn.claims, [])
})

test('runtime context does not retire the UI command before the model step', () => {
  const start = applyMethodLibraryOperationEvent(operationTurn(), userEvent(
    { kind: 'user', rpcId: requestId },
    methodLibraryCommandText(command),
  ))
  const context = applyMethodLibraryOperationEvent(start, userEvent({ kind: 'runtime-context' }, 'workspace instructions'))
  assert.equal(context.pending?.operationId, command.operationId)
})

test('a newer owner message without an RPC id retires the pending UI command', () => {
  const start = applyMethodLibraryOperationEvent(operationTurn(), userEvent(
    { kind: 'user', rpcId: requestId },
    methodLibraryCommandText(command),
  ))
  const next = applyMethodLibraryOperationEvent(start, userEvent({ kind: 'user' }, 'Another owner prompt'))
  assert.equal(next.pending, null)
})

test('a newer owner prompt retires an unclaimed command', () => {
  const start = applyMethodLibraryOperationEvent(operationTurn(), userEvent(
    { kind: 'user', rpcId: requestId },
    methodLibraryCommandText(command),
  ))
  const next = applyMethodLibraryOperationEvent(start, userEvent({ kind: 'user', rpcId: 'request-2' }, '普通聊天'))
  assert.equal(next.pending, null)
})

test('tool result releases the claimed operation; the old token cannot authorize a later call', () => {
  const start = applyMethodLibraryOperationEvent(operationTurn(), userEvent(
    { kind: 'user', rpcId: requestId },
    methodLibraryCommandText(command),
  ))
  const claimed = applyMethodLibraryOperationEvent(start, toolCallEvent('call-1', {
    operationId: command.operationId,
    defaultAction: 'set',
    operationHash: payloadHash,
    entry: entryText,
  }))
  const settled = applyMethodLibraryOperationEvent(claimed, toolResultEvent('call-1'))
  assert.deepEqual(settled.claims, [])
  assert.equal(settled.pending, null)
  assert.deepEqual(applyMethodLibraryOperationEvent(settled, toolCallEvent('call-2', {
    operationId: command.operationId,
    defaultAction: 'set',
    operationHash: payloadHash,
    entry: entryText,
  })).claims, [])
})
