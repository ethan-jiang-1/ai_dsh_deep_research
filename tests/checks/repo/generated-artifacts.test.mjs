// generated-artifacts — 生成物头必须与生成器模板一致（2026-11-17 审计）。
//
// 为什么：snapshots/replay 被 doc-paths 当作"录制证据不改写"排除，但 ui.expected.md 是
// **生成物**——生成器已写 `node checks/smoke/…`，盘上仍停在 `node scripts/smoke/…`，两条
// 命令各不相同且都"合法"。生成物与生成器不一致 = 下一次重录会凭空产生 diff，且照抄旧命令的人
// 一定失败。判据 = 生成器源码里的头模板命令 = 每个生成物里的同一行；正文不比对（归 --update-expected）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const GEN = join(ROOT, 'checks', 'smoke', 'snapshot-replay.entry.mjs')
const HEADER = /生成物：`([^`]+)` 从真实回放渲染捕获/

const commandOf = (text, label) => {
  const m = text.match(HEADER)
  assert.ok(m, `${label} 缺「生成物：…从真实回放渲染捕获」头行——模板与生成物都必须带可对账的命令行`)
  return m[1]
}

test('snapshot 渲染金标准头 = 生成器命令（防生成物停在旧根名）', () => {
  assert.ok(existsSync(GEN), 'snapshot-replay.entry.mjs 缺席——生成器不在盘上，本契约失去对象')
  const gen = commandOf(readFileSync(GEN, 'utf8'), '生成器')
  const dir = join(ROOT, 'snapshots', 'replay')
  const artifacts = existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory())
      .map((e) => join(dir, e.name, 'ui.expected.md')).filter((f) => existsSync(f))
    : []
  assert.ok(artifacts.length > 0, '防空语料：snapshots/replay 下没有 ui.expected.md')
  for (const f of artifacts) {
    assert.equal(commandOf(readFileSync(f, 'utf8'), relative(ROOT, f)), gen,
      `${relative(ROOT, f)} 的生成命令与生成器不一致——重跑 node ${gen} --update-expected（或修模板），不要手改`)
  }
})
