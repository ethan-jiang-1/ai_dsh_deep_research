// src-lib-faces.spec.mjs — pack `src/lib` 的编译面归属（host / shared / client）单一事实源。
//
// 反证：把 host-include 里的一个文件从 faces.json 删掉、让 client 文件 import host-only 文件、
// 或让 shared 文件 import client 文件 → 本文件红。三层规则 = tsconfig.host include 对账 +
// 目录全集对账 + 相对 import 图方向检查。
// 2026-11-15：src/lib 按 domain 分层（run/plan/events/method-library/review/workspace/shared），
// 本测试按**相对路径**递归扫描；faces.json 仍按 basename（全局唯一）登记三面。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const LIB = join(PACK, 'src', 'lib')
const faces = JSON.parse(readFileSync(join(LIB, 'faces.json'), 'utf8'))
const base = (rel) => rel.split('/').pop()
const files = (() => {
  const out = []
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (ent.name.endsWith('.ts')) out.push(relative(LIB, p).split(sep).join('/'))
    }
  }
  walk(LIB)
  return out.sort()
})()
const all = [...faces.host, ...faces.shared, ...faces.client]
const relOfBase = new Map(files.map((f) => [base(f), f]))

test('faces.json：三面互斥且覆盖 src/lib 全部 .ts（递归）', () => {
  assert.equal(new Set(all).size, all.length, '同一文件不得出现在两个面')
  assert.deepEqual([...all].sort(), files.map(base).sort(), 'host+shared+client 必须等于盘上 src/lib/**/*.ts 的 basename 集')
  for (const name of all) assert.ok(relOfBase.has(name), `faces.json 点名了盘上不存在的文件：${name}`)
})

test('tsconfig.host include 的 src/lib 项 = host + shared 的相对路径（不多不少）', () => {
  const text = readFileSync(join(PACK, 'tsconfig.host.json'), 'utf8').replace(/^\s*\/\/.*$/gm, '')
  const included = JSON.parse(text).include
    .filter((p) => p.startsWith('src/lib/'))
    .map((p) => p.slice('src/lib/'.length))
    .sort()
  const expected = files.filter((f) => faces.host.includes(base(f)) || faces.shared.includes(base(f))).sort()
  assert.deepEqual(included, expected, 'host include 漂移 = host 面不可发现')
})

test('import 方向：host 不引 client、client 不引 host、shared 只依赖 shared', () => {
  const faceOf = new Map(files.map((f) => [base(f), faces.host.includes(base(f)) ? 'host' : faces.shared.includes(base(f)) ? 'shared' : 'client']))
  for (const file of files) {
    const text = readFileSync(join(LIB, file), 'utf8')
    for (const match of text.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)) {
      let target = resolve(dirname(join(LIB, file)), match[1])
      if (!target.endsWith('.ts')) target += '.ts'
      const rel = relative(LIB, target).split(sep).join('/')
      if (rel.startsWith('..') || !faceOf.has(base(rel))) continue
      const from = faceOf.get(base(file))
      const to = faceOf.get(base(rel))
      if (from === 'host') assert.notEqual(to, 'client', `${file}(host) 不得 import ${rel}(client)`)
      if (from === 'client') assert.notEqual(to, 'host', `${file}(client) 不得 import ${rel}(host)`)
      if (from === 'shared') assert.equal(to, 'shared', `${file}(shared) 只能依赖 shared；遇到 ${rel}(${to})`)
    }
  }
})
