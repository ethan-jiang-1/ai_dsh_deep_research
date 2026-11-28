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
        get: (key) => (key === 'deep-research-milestone' ? { milestones: [{ kind: 'delivered', path: 'drt_x/final/v1.md', seq: 5 }] } : undefined),
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
  assert.match(html, /已交付/, '里程碑标签必须使用本地化中文，不得裸露 delivered')
  assert.doesNotMatch(html, />delivered</, '中文界面不得裸露内部英文枚举 delivered')
})

test('ResearchMilestoneCard：同回合已有原生 ui-deliverables 终稿交付卡时自动去重 delivered 行，但保留 protocol/review', () => {
  const onlyDelivered = renderToStaticMarkup(createElement(ResearchMilestoneCard, {
    sessionId: 's1',
    turn: {
      turn: 4,
      end: { seq: 12 },
      data: {
        get: (key) => {
          if (key === 'deep-research-milestone') {
            return { milestones: [{ kind: 'delivered', path: 'drt_x/final/readable-v1.md', seq: 8 }] }
          }
          if (key === 'deliverables') {
            return { produced: [], presented: [{ seq: 8, index: 0, path: 'drt_x/final/readable-v1.md' }] }
          }
          return undefined
        },
      },
    },
    seq: 12,
    openFile: () => {},
    openStatus: () => {},
    openFinal: () => {},
    t: tZh,
  }))
  assert.equal(onlyDelivered, '', '已有原生 ui-deliverables 交付卡时不再重复渲染 delivered 横条')

  const withReview = renderToStaticMarkup(createElement(ResearchMilestoneCard, {
    sessionId: 's1',
    turn: {
      turn: 4,
      end: { seq: 12 },
      data: {
        get: (key) => {
          if (key === 'deep-research-milestone') {
            return {
              milestones: [
                { kind: 'review', path: 'drt_x/review.md', seq: 6 },
                { kind: 'delivered', path: 'drt_x/final/readable-v1.md', seq: 8 },
              ],
            }
          }
          if (key === 'deliverables') {
            return { produced: [], presented: [{ seq: 8, index: 0, path: 'drt_x/final/readable-v1.md' }] }
          }
          return undefined
        },
      },
    },
    seq: 12,
    openFile: () => {},
    openStatus: () => {},
    openFinal: () => {},
    t: tZh,
  }))
  assert.match(withReview, /已完成对抗审查/)
  assert.match(withReview, /审查/)
  assert.doesNotMatch(withReview, /研究报告已正式交付/)
  assert.doesNotMatch(withReview, />review</)
})

// 负例留证 2026-11-27：BUG-440——deliverables/presented 同时包含主本与读者版多文件时，
// researchTurnDefinition 把每个文件都拆成一条 delivered 里程碑，导致回合尾出现两张重复交付卡片。
// 红配方：恢复 update 里对 rec.data.files 逐项 addMilestone → 本例红（length=2）。
test('BUG-440 researchTurnDefinition：单次多文件 deliverables/presented 只产出一张交付里程碑（优先读者版）', () => {
  const turnStart = { type: 'turn/start', seq: 1, data: { turn: 3 } }
  let state = researchTurnDefinition.start({}, { event: turnStart, role: 'start', location: { kind: 'session' } }, { previous: () => undefined })
  const multiPresent = {
    type: 'deliverables/presented',
    seq: 8,
    data: {
      turn: 3,
      files: [{ path: 'drt_x/final/v1.md' }, { path: 'drt_x/final/readable-v1.md' }],
    },
  }
  state = researchTurnDefinition.update({ state }, { event: multiPresent, role: 'update', location: { kind: 'session' } })
  const data = researchTurnDefinition.buildLocationData({ state }, 'turn', null)
  assert.ok(data !== null)
  assert.equal(data.value.milestones.length, 1, '同一次多文件交付不得重复渲染多条 delivered 行')
  assert.equal(data.value.milestones[0]?.kind, 'delivered')
  assert.equal(data.value.milestones[0]?.path, 'drt_x/final/readable-v1.md')
})
