#!/usr/bin/env node
// market.mjs — 生成本仓插件的 DSH 插件市场索引（format 1）→ `_dist/market.json`。
//
// 为什么要有这一件：DSH 的发现页（Discover / `plugin_market`）只读**静态 JSON 索引**，格式与
// 校验器由 DSH 自己提供（`@deepseek-ai/dsh-plugin-market-index`，本仓以 workspace 依赖接入，
// 版本随 vendor pin）。不这样做，用户就只能先知道包名才能装——发布有了身份，市场条目才有"发现"。
//
// 三条纪律：
//   ① 展示文本单一来源 = 包内 locale（Plugins 页与市场读到同一份中英文案），不在脚本里另写字面量；
//   ② 产物必须先过 DSH 的 `parseMarketIndex` 再落盘——本脚本不发明格式，也不手写校验；
//   ③ 版本/兼容范围原样取自包清单（`version`、`engines.dsh`），索引与 tarball 不能各说各话。
//
// 时间戳口径：`publishTimestamp` 取"该包目录最后一次提交"的时间（秒），同一 commit 可重放出同一
// 索引；显式 `SOURCE_DATE_EPOCH` 可覆盖（CI 重放用）。索引条目只用于展示排序，不参与安装判定。
//
// 用法：node scripts/dist/market.mjs [--check]（--check 只校验不写盘）

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const DIST = join(ROOT, '_dist')
const OUT = join(DIST, 'market.json')

/** 索引的对外地址：市场条目里的相对图标与来源提示以它为准（本节条目用内联图标，不依赖它）。 */
export const INDEX_URL = 'https://raw.githubusercontent.com/ethan-jiang-1/ai_dsh_deep_research/master/_dist/market.json'

const MAX_INLINE_ICON_BYTES = 32 * 1024

function commitSeconds(scope) {
  if (process.env.SOURCE_DATE_EPOCH) {
    const epoch = Number(process.env.SOURCE_DATE_EPOCH)
    if (!Number.isInteger(epoch) || epoch < 0) throw new Error('SOURCE_DATE_EPOCH 必须是整数秒')
    return epoch
  }
  const time = execFileSync('git', ['-C', ROOT, 'log', '-1', '--format=%ct', '--', scope], { encoding: 'utf8' }).trim()
  if (time === '') throw new Error(`git 里没有 ${scope} 的提交时间——发布物必须来自已提交的树（或显式给 SOURCE_DATE_EPOCH）`)
  return Number(time)
}

function localeMeta() {
  const read = (rel) => JSON.parse(readFileSync(join(PACK, rel), 'utf8')).meta
  return { en: read('locale/en.json'), zh: read('locale/zh.json') }
}

function iconDataUrl() {
  const svg = readFileSync(join(PACK, 'icon.svg'))
  if (svg.length > MAX_INLINE_ICON_BYTES) throw new Error(`icon.svg 超过内联图标上限（${svg.length} > ${MAX_INLINE_ICON_BYTES} 字节）`)
  return `data:image/svg+xml;base64,${svg.toString('base64')}`
}

/**
 * 组装 format 1 索引（未校验）。展示文本来自包内 locale，版本与兼容范围来自包清单。
 * @returns {{index: object, pack: object}}
 */
export function buildMarketIndex() {
  const pack = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
  const enginesDsh = pack.engines?.dsh
  if (typeof enginesDsh !== 'string' || enginesDsh.trim() === '') {
    throw new Error('包清单缺 engines.dsh——市场条目的 engines 字段只能原样复制它，不能另写')
  }
  const meta = localeMeta()
  const published = commitSeconds('packages/deep-research-pack')
  const index = {
    format: 1,
    title: { en: 'Deep Research Pack', zh: '深度研究包' },
    description: {
      en: 'Community index for the Deep Research bundle. Enable Experimental plugins → Custom plugin markets, then add this URL in Plugins → Discover.',
      zh: '深度研究组合包的社区索引。先在 Experimental plugins 打开 Custom plugin markets，再在 Plugins → Discover 添加本索引地址。',
    },
    metadata: {
      categories: { research: { title: { en: 'Research', zh: '研究' } } },
      labels: { community: { title: { en: 'Community', zh: '社区' } } },
      sortKeys: { updated: { title: { en: 'Updated', zh: '更新时间' }, order: 'desc' } },
    },
    plugins: [
      {
        name: pack.name,
        title: { en: meta.en.title, zh: meta.zh.title },
        description: { en: meta.en.description, zh: meta.zh.description },
        icon: iconDataUrl(),
        author: typeof pack.author === 'string' ? pack.author : pack.author?.name,
        homepage: pack.homepage,
        repository: {
          url: 'https://github.com/ethan-jiang-1/ai_dsh_deep_research',
          directory: 'packages/deep-research-pack',
        },
        metadata: {
          category: 'research',
          labels: ['community'],
          keywords: Array.isArray(pack.keywords) ? pack.keywords : [],
          sortKeys: { updated: published },
        },
        'dist-tags': { latest: pack.version },
        versions: [
          {
            version: pack.version,
            publishTimestamp: published,
            source: { type: 'npm' },
            engines: { dsh: enginesDsh },
          },
        ],
      },
    ],
  }
  return { index, pack }
}

/**
 * 校验并写入 `_dist/market.json`。
 * @param {{check?: boolean}} [options] - `check` 只校验、不写盘（门禁用）。
 * @returns {{path: string, bytes: number, sha256: string, index: object}} 写入结果
 */
export function writeMarketIndex(options = {}) {
  const { index } = buildMarketIndex()
  // 校验器用于"这份文档合法"，不用于"这份文档长什么样"：它会归一化并丢掉可选展示字段
  // （如 dist-tags），直接写归一化结果会让作者面信息丢失。落盘 = 作者面原文（已过校验）。
  const parsed = parseMarketIndex(JSON.parse(JSON.stringify(index)), INDEX_URL)
  if (parsed.plugins[0]?.name !== index.plugins[0].name) throw new Error('校验器改写了包名——索引与包清单不一致')
  const body = `${JSON.stringify(index, undefined, 2)}\n`
  const sha256 = createHash('sha256').update(body).digest('hex')
  if (options.check === true) return { path: OUT, bytes: Buffer.byteLength(body), sha256, index: parsed }
  mkdirSync(DIST, { recursive: true })
  writeFileSync(OUT, body)
  return { path: OUT, bytes: Buffer.byteLength(body), sha256, index: parsed }
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (invokedDirectly) {
  const check = process.argv.includes('--check')
  try {
    const result = writeMarketIndex({ check })
    const plugin = result.index.plugins[0]
    console.log(`${check ? 'ok  ' : 'ok  '}market-index — ${check ? '校验' : '写入'} ${result.path}`)
    console.log(`     ${plugin.name}@${plugin.versions[0].version} engines=${plugin.versions[0].engines.dsh} ${result.bytes}B sha256=${result.sha256.slice(0, 16)}…`)
  } catch (error) {
    console.error(`FAIL market-index — ${String(error)}`)
    process.exit(1)
  }
}
