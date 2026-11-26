// research-turn.spec.mjs — Turn 级里程碑 fold 与 ResearchMilestoneCard 组件回归。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import '../css-module-helpers.mjs'
import { researchTurnDefinition } from '../../../packages/deep-research-pack/src/client/research-turn.ts'
import { ResearchMilestoneCard } from '../../../packages/deep-research-pack/src/client/ResearchMilestoneCard.tsx'
import { zh } from '../../../packages/deep-research-pack/src/client/locales.ts'
import { makeTranslator } from '../client-dom-helpers.mjs'

const tZh = makeTranslator(zh)

test('researchTurnDefinition：捕获 protocol.json / review.md 与 deliverables/presented 终稿里程碑', () => {
  const turnStart = { type: 'turn/start', seq: 1, data: { turn: 2 } }
  assert.deepEqual(researchTurnDefinition.match(turnStart), { id: '2', role: 'start' })
  let state = researchTurnDefinition.start({}, { event: turnStart, role: 'start', location: { kind: 'session' } }, { previous: () => undefined })

  const protoCall = { type: 'tool/call', seq: 2, data: { turn: 2, name: 'write_file', arguments: JSON.stringify({ path: 'drt_x/protocol.json' }) } }
  state = researchTurnDefinition.update({ state }, { event: protoCall, role: 'update', location: { kind: 'session' } })

  const presentEv = { type: 'deliverables/presented', seq: 5, data: { turn: 2, files: [{ path: 'drt_x/final/v1.md' }] } }
  state = researchTurnDefinition.update({ state }, { event: presentEv, role: 'update', location: { kind: 'session' } })

  const data = researchTurnDefinition.buildLocationData({ state }, 'turn', null)
  assert.ok(data !== null)
  assert.equal(data.value.milestones.length, 2)
  assert.equal(data.value.milestones[0]?.kind, 'protocol')
  assert.equal(data.value.milestones[1]?.kind, 'delivered')
})

test('ResearchMilestoneCard：无里程碑返回 null；有交付里程碑渲染阅读终稿按钮', () => {
  const empty = renderToStaticMarkup(createElement(ResearchMilestoneCard, {
    sessionId: 's1',
    turn: { turn: 1, end: { seq: 10 }, data: { get: () => undefined } },
    seq: 10,
    openFile: () => {},
    openStatus: () => {},
    openFinal: () => {},
    t: tZh,
  }))
  assert.equal(empty, '')

  const html = renderToStaticMarkup(createElement(ResearchMilestoneCard, {
    sessionId: 's1',
    turn: {
      turn: 2,
      end: { seq: 10 },
      data: {
        get: () => ({ milestones: [{ kind: 'delivered', path: 'drt_x/final/v1.md', seq: 5 }] }),
      },
    },
    seq: 10,
    openFile: () => {},
    openStatus: () => {},
    openFinal: () => {},
    t: tZh,
  }))
  assert.match(html, /研究报告已正式交付/)
  assert.match(html, /阅读终稿/)
})
