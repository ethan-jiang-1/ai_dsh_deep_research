// product-startup — GUI 侧工作区记忆的纯谓词（D40）；不碰 DOM/localStorage。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CURRENT_SESSION_KEY, PRODUCT_WORKSPACE_KEY, PRODUCT_TITLE_PREFIX,
  needsProductSwitch, pickProductWorkspace, readCurrentSessionId,
} from '../../packages/deep-research-pack/src/client/startup.ts'

test('readCurrentSessionId：裸 id / {sessionId} / 坏值', () => {
  assert.equal(readCurrentSessionId(null), null)
  assert.equal(readCurrentSessionId(''), null)
  assert.equal(readCurrentSessionId('"session-a"'), 'session-a')
  assert.equal(readCurrentSessionId('{"sessionId":"session-b"}'), 'session-b')
  assert.equal(readCurrentSessionId('{"sessionId":42}'), null)
  assert.equal(readCurrentSessionId('not-json'), null)
})

test('pickProductWorkspace：保存 id 优先，其次唯一标题', () => {
  const items = [
    { workspaceId: 'w1', title: 'other', path: '/p/other' },
    { workspaceId: 'w2', title: `${PRODUCT_TITLE_PREFIX}acme`, path: '/p/acme' },
  ]
  assert.equal(pickProductWorkspace(items, 'w1')?.workspaceId, 'w1')
  assert.equal(pickProductWorkspace(items, 'gone')?.workspaceId, 'w2')
  assert.equal(pickProductWorkspace(items, null)?.workspaceId, 'w2')
  assert.equal(pickProductWorkspace([items[0]], null), null)
  assert.equal(pickProductWorkspace([], null), null)
})

test('needsProductSwitch：cwd 未知或不同即需要切', () => {
  assert.equal(needsProductSwitch(undefined, '/p/acme'), true)
  assert.equal(needsProductSwitch('/p/other', '/p/acme'), true)
  assert.equal(needsProductSwitch('/p/acme', '/p/acme'), false)
})

test('键名稳定（vendor 约定 + 产品键）', () => {
  assert.equal(CURRENT_SESSION_KEY, 'dsh.sessions.current')
  assert.equal(PRODUCT_WORKSPACE_KEY, 'dsh.deep-research.workspaceId.v1')
})
