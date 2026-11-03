// src-lib-faces.test.mjs — pack `src/lib` 的编译面归属（host / shared / client）单一事实源。
//
// 反证：把 host-include 里的一个文件从 faces.json 删掉、让 client 文件 import host-only 文件、
// 或让 shared 文件 import client 文件 → 本文件红。三层规则 = tsconfig.host include 对账 +
// 目录全集对账 + 相对 import 图方向检查。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const LIB = join(PACK, 'src', 'lib')
const faces = JSON.parse(readFileSync(join(LIB, 'faces.json'), 'utf8'))
const files = readdirSync(LIB).filter((f) => f.endsWith('.ts')).sort()
const all = [...faces.host, ...faces.shared, ...faces.client]

test('faces.json：三面互斥且覆盖 src/lib 全部 .ts', () => {
  assert.equal(new Set(all).size, all.length, '同一文件不得出现在两个面')
  assert.deepEqual([...all].sort(), files, 'host+shared+client 必须等于盘上 src/lib/*.ts')
})

test('tsconfig.host include 的 src/lib 项 = host + shared（不多不少）', () => {
  const text = readFileSync(join(PACK, 'tsconfig.host.json'), 'utf8').replace(/^\s*\/\/.*$/gm, '')
  const tsconfig = JSON.parse(text)
  const included = tsconfig.include
    .filter((p) => p.startsWith('src/lib/'))
    .map((p) => p.slice('src/lib/'.length))
    .sort()
  assert.deepEqual(included, [...faces.host, ...faces.shared].sort(), 'host include 漂移 = host 面不可发现')
})

test('import 方向：host 不引 client、client 不引 host、shared 只依赖 shared', () => {
  const faceOf = new Map(all.map((f) => [f, faces.host.includes(f) ? 'host' : faces.shared.includes(f) ? 'shared' : 'client']))
  for (const file of files) {
    const text = readFileSync(join(LIB, file), 'utf8')
    for (const match of text.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)) {
      let target = resolve(dirname(join(LIB, file)), match[1])
      if (!target.endsWith('.ts')) target += '.ts'
      const rel = relative(LIB, target).split(sep).join('/')
      if (rel.startsWith('..') || !faceOf.has(rel)) continue
      const from = faceOf.get(file)
      const to = faceOf.get(rel)
      if (from === 'host') assert.notEqual(to, 'client', `${file}(host) 不得 import ${rel}(client)`)
      if (from === 'client') assert.notEqual(to, 'host', `${file}(client) 不得 import ${rel}(host)`)
      if (from === 'shared') assert.equal(to, 'shared', `${file}(shared) 只能依赖 shared；遇到 ${rel}(${to})`)
    }
  }
})
