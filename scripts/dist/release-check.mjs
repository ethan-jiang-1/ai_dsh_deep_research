#!/usr/bin/env node
// release-check.mjs — 发布前版本/tag 一致性检查（只读，不联网，不写盘）。
// 规则正本 = docs/guides/64-release-versioning.md：
//   发布版本 = pack version；root 镜像；tag = 同版本且必须 annotated。
// 用法：node scripts/dist/release-check.mjs
// 退出：0 = 版本一致（未打 tag 是合法的“发布前”态）；1 = 版本/tag 不一致或 tag 类型错。
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'))
const rootPkg = readJson('package.json')
const packPkg = readJson('packages/deep-research-pack/package.json')
const SEMVER = /^\d+\.\d+\.\d+$/
const rootVersion = rootPkg.version
const packVersion = packPkg.version
const problems = []

if (typeof rootVersion !== 'string' || !SEMVER.test(rootVersion)) problems.push(`root package.json version 不是三段 semver：${JSON.stringify(rootVersion)}`)
if (typeof packVersion !== 'string' || !SEMVER.test(packVersion)) problems.push(`pack package.json version 不是三段 semver：${JSON.stringify(packVersion)}`)
if (!problems.length && rootVersion !== packVersion) problems.push(`版本漂移：root ${rootVersion} ≠ pack ${packVersion}——发布版本以 pack 为准，root 必须镜像`)

const git = (args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
const described = git(['describe', '--tags', '--exact-match', 'HEAD'])
let tag = null
if (described.status === 0) {
  tag = described.stdout.trim()
  if (!SEMVER.test(tag)) problems.push(`HEAD 的 tag 名不是三段 semver：${tag}`)
  else if (tag !== packVersion) problems.push(`HEAD tag ${tag} ≠ pack version ${packVersion}——tag 必须指向该版本已提交的 commit`)
  const kind = git(['cat-file', '-t', `refs/tags/${tag}`])
  if (kind.status !== 0) problems.push(`无法读取 tag 对象：${tag}`)
  else if (kind.stdout.trim() !== 'tag') problems.push(`tag ${tag} 是 ${kind.stdout.trim()}，不是 annotated tag（发布 tag 必须 git tag -a）`)
}

if (problems.length) {
  console.error('release-check: FAIL')
  for (const p of problems) console.error(`  - ${p}`)
  console.error('  规则 = docs/guides/64-release-versioning.md；修完重跑。')
  process.exit(1)
}

if (tag === null) {
  console.log(`release-check: OK version=${packVersion}（HEAD 未打 tag）`)
  console.log(`  发布前：git tag -a ${packVersion} -m "${packVersion}" && git push origin master && git push origin ${packVersion}`)
} else {
  console.log(`release-check: OK version=${packVersion} tag=${tag}（annotated）`)
  console.log('  下一步：git push origin master && git push origin ' + tag + '；然后 npm publish')
}
