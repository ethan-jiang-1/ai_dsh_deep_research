#!/usr/bin/env node
// readme-manual-commands — README 的最短路径命令必须与用户实际拿到的安装手册同源。
// 为什么：README 给人 5 分钟路径，手册给完整合同；两份都写 `dsh` 命令，漂移会让用户照着
// README 装到一半发现参数对不上。判据 = README 里每条 `dsh …` 行逐字出现在
// _dist/安装手册.md（tracked 生成物，用户拿到的那份），不比对源模板（含 {{tarballName}} 占位）。
// 防空：README 少于 3 条 = 测试空转（最短路径至少要有建 profile / 装包 / 启动三条）。
// 反证：把 README 的 `--from-default-profile` 改成别的值 → 红；改回 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

// 只收以 `dsh ` 开头的命令行；行尾 `#` 注释剥掉（命令本身不含 #）；保留引号与占位符原样。
const dshCommands = (text) => text.split('\n')
  .map((line) => line.trim())
  .filter((line) => /^dsh\s/.test(line))
  .map((line) => line.replace(/\s+#.*$/, ''))

test('README 的最短路径命令与 _dist/安装手册.md 同源', () => {
  const readme = dshCommands(read('README.md'))
  const manual = new Set(dshCommands(read('_dist/安装手册.md')))
  assert.ok(readme.length >= 3, `README 只有 ${readme.length} 条 dsh 命令——最短路径应含建 profile / 装包 / 启动（防空）`)
  const manualText = read('_dist/安装手册.md')
  assert.ok(manual.size >= 3, '安装手册缺 dsh 命令——生成物与源模板对不上，先跑 node scripts/dist/export-dist.mjs')
  for (const command of readme) {
    assert.ok(manual.has(command), `README 的命令不在 _dist/安装手册.md：${command}\n—— 两处必须逐字一致；改一条就同 diff 改另一条（源 = scripts/dist/product-manual.md，记得重导出）`)
  }
  assert.ok(manualText.includes('--profile deep-research'), '安装手册缺 --profile deep-research——手册的用户路径变了？')
})
