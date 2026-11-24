// errorDetailOf 的失败详情折算（BUG-410）：任何拒绝值都要交出可读原因，不许退化成 undefined。
//
// 负例留证 2026-11-24：BUG-410——StartCard 曾用 `(error as Error).message`，字符串/结构化对象/
// 数字拒绝值都渲染「失败：undefined」。红配方：把该调用改回 `(error as Error).message`。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { errorDetailOf } from '../../../../packages/deep-research-pack/src/lib/shared/error-detail.ts'

test('Error：取 message；空 message 退回 name；都空才用 fallback', () => {
  assert.equal(errorDetailOf(new Error('boom')), 'boom')
  const unnamed = new Error('')
  unnamed.name = 'TypeError'
  assert.equal(errorDetailOf(unnamed), 'TypeError')
  const blank = new Error('')
  blank.name = ''
  assert.equal(errorDetailOf(blank, '未知失败'), '未知失败')
})

test('非 Error 拒绝值：字符串 / 结构化对象 / 数字都保留真实原因', () => {
  assert.equal(errorDetailOf('EACCES: permission denied'), 'EACCES: permission denied')
  assert.equal(errorDetailOf({ code: 'EACCES', message: 'permission denied' }), 'permission denied')
  assert.equal(errorDetailOf({ code: 'EACCES' }), 'EACCES')
  assert.equal(errorDetailOf({ code: 42 }), '42')
  assert.equal(errorDetailOf(42), '42')
  assert.equal(errorDetailOf(false), 'false')
})

test('无法读出原因的输入：给 fallback，绝不返回 undefined/null 字面量', () => {
  for (const value of [undefined, null, '', '   ', {}, []]) {
    const detail = errorDetailOf(value)
    assert.equal(typeof detail, 'string')
    assert.notEqual(detail, '')
    assert.notEqual(detail, 'undefined')
    assert.notEqual(detail, 'null')
  }
  assert.equal(errorDetailOf(undefined, '未知失败'), '未知失败')
})
