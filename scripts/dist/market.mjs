#!/usr/bin/env node
// market.mjs — 生成 `_dist/market.json`（format 1）的 **staged** 形态。
//
// 为什么是 staged：本包当前按“本地 tarball”交付，当前版本未发布到 npm。DSH Discover 只读静态
// 索引；若索引列出 `source: npm` 的版本，用户点安装会 404。staged 形态 = 合法空索引
// （`plugins: []`）+ 明确文案，发现面可见但**不承诺可安装**；npm 发布后再由发布流程恢复条目。
//
// 纪律：产物必须先过 DSH 自己的 `parseMarketIndex` 再落盘；本脚本不发明格式。
// 用法：node scripts/dist/market.mjs [--check]（--check 只校验不写盘）

import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'
import { isMain } from '../lib/cli-entry.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const DIST = join(ROOT, '_dist')
const OUT = join(DIST, 'market.json')

/** 索引的对外地址（相对图标/相对引用解析用；staged 索引无条目，不依赖它）。 */
export const INDEX_URL = 'https://raw.githubusercontent.com/ethan-jiang-1/ai_dsh_deep_research/master/_dist/market.json'

/**
 * 组装 staged format 1 索引（未校验）。
 * @returns {{index: object}}
 */
export function buildMarketIndex() {
  const index = {
    format: 1,
    title: { en: 'Deep Research Pack (staged)', zh: '深度研究包（staged）' },
    description: {
      en: 'Staged index: no installable entries. The package is not published to npm; install the local tarball from _dist/ (see the installation manual).',
      zh: 'Staged 索引：暂无可安装条目。本包尚未发布到 npm；请用 _dist/ 下的本地 tarball（见安装手册）。',
    },
    metadata: {
      categories: { research: { title: { en: 'Research', zh: '研究' } } },
      labels: { community: { title: { en: 'Community', zh: '社区' } } },
      sortKeys: { updated: { title: { en: 'Updated', zh: '更新时间' }, order: 'desc' } },
    },
    plugins: [],
  }
  return { index }
}

/**
 * 校验并写入 `_dist/market.json`。
 * @param {{check?: boolean}} [options] - `check` 只校验、不写盘（门禁用）。
 * @returns {{path: string, bytes: number, sha256: string, index: object}} 写入结果
 */
export function writeMarketIndex(options = {}) {
  const { index } = buildMarketIndex()
  const parsed = parseMarketIndex(JSON.parse(JSON.stringify(index)), INDEX_URL)
  if (parsed.plugins.length !== 0) throw new Error('staged 索引不得包含插件条目')
  const body = `${JSON.stringify(index, undefined, 2)}\n`
  const sha256 = createHash('sha256').update(body).digest('hex')
  if (options.check === true) return { path: OUT, bytes: Buffer.byteLength(body), sha256, index: parsed }
  mkdirSync(DIST, { recursive: true })
  writeFileSync(OUT, body)
  return { path: OUT, bytes: Buffer.byteLength(body), sha256, index: parsed }
}

const invokedDirectly = isMain(import.meta.url)
if (invokedDirectly) {
  const check = process.argv.includes('--check')
  try {
    const result = writeMarketIndex({ check })
    console.log(`${check ? 'ok  ' : 'ok  '}market-index — ${check ? '校验' : '写入'} ${result.path}`)
    console.log(`     staged（0 installable entries） ${result.bytes}B sha256=${result.sha256.slice(0, 16)}…`)
  } catch (error) {
    console.error(`FAIL market-index — ${String(error)}`)
    process.exit(1)
  }
}
