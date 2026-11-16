#!/usr/bin/env node
// release-check.mjs — 发布/移交锚检查（只读，不联网，不写盘）。
// 规则正本 = docs/guides/64-release-versioning.md：
//   发布版本 = pack version；root 镜像；tag = 同版本且必须 annotated。
// 默认模式：版本/tag 一致性（HEAD 未打 tag 是合法的“发布前”态）。
// --handoff：移交前把 tag 与制品配对——tag 必须指向 HEAD、工作树干净、
//   manual sha = tarball sha、build-manifest sha 同源、tarball 由当前 pack 源生成。
// --receiver：clean clone 上验证接收物——tag=HEAD、manual/tarball/manifest 对齐；
//   无 `lib/` 不重算源指纹（sender 的 `--handoff` 负责 freshness）。
//   为什么：0.3.4 tag（ec652a30 / manual f41a6b）与次日 HEAD 重建的 _dist（manual eed98）
//   同版本号却两套制品；默认模式与 dist-tarball 各自都绿，没人把 tag 与制品配对。
// 用法：node checks/dist/release-check.mjs [--handoff|--receiver]
// 退出：0 = 通过；1 = 不一致；2 = 前置缺席（未跑 ≠ 通过）。
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isMain } from '../lib/shared/cli-entry.mjs'
import { evaluateRelease, evaluateHandoff } from '../lib/repo/release-anchor.mjs'
import { artifactFreshness, packInputRoots } from '../lib/shared/artifact-freshness.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const DIST = join(ROOT, '_dist')
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'))
const git = (args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })

const parseManualVersion = (text) => text.match(/\|\s*版本\s*\|\s*([0-9]+\.[0-9]+\.[0-9]+)\s*\|/)?.[1] ?? null
const parseManualSha = (text) => text.match(/\|\s*sha256\s*\|\s*`([0-9a-f]{64})`\s*\|/)?.[1] ?? null

function main(argv = process.argv.slice(2)) {
  const receiver = argv.includes('--receiver')
  const handoff = argv.includes('--handoff') || receiver
  const unknown = argv.filter((a) => a !== '--handoff' && a !== '--receiver')
  if (unknown.length > 0) {
    console.error(`release-check: 未知参数 ${unknown.join(' ')}（用法：node checks/dist/release-check.mjs [--handoff|--receiver]）`)
    return 2
  }
  const inside = git(['rev-parse', '--is-inside-work-tree'])
  if (inside.status !== 0 || inside.stdout.trim() !== 'true') {
    console.error('release-check: NOT-RUN — 不在 git 工作树内')
    return 2
  }

  const rootPkg = readJson('package.json')
  const packPkg = readJson('packages/deep-research-pack/package.json')
  const rootVersion = rootPkg.version
  const packVersion = packPkg.version

  const described = git(['describe', '--tags', '--exact-match', 'HEAD'])
  const headTag = described.status === 0 ? described.stdout.trim() : null
  const headTagType = headTag === null
    ? null
    : git(['cat-file', '-t', `refs/tags/${headTag}`]).stdout.trim()
  const releaseProblems = evaluateRelease({ rootVersion, packVersion, headTag, headTagType })

  if (!handoff) {
    if (releaseProblems.length > 0) {
      console.error('release-check: FAIL')
      for (const p of releaseProblems) console.error(`  - ${p.message}`)
      console.error('  规则 = docs/guides/64-release-versioning.md；修完重跑。')
      return 1
    }
    if (headTag === null) {
      console.log(`release-check: OK version=${packVersion}（HEAD 未打 tag）`)
      console.log(`  发布前：git tag -a ${packVersion} -m "${packVersion}"，再跑 node checks/dist/release-check.mjs --handoff`)
    } else {
      console.log(`release-check: OK version=${packVersion} tag=${headTag}（annotated）`)
      console.log('  移交前：node checks/dist/release-check.mjs --handoff')
    }
    return 0
  }

  const version = packVersion
  const tagRef = `refs/tags/${version}`
  const tagExists = git(['rev-parse', '--verify', '--quiet', tagRef]).status === 0
  const tag = tagExists ? version : null
  const tagType = tagExists ? git(['cat-file', '-t', tagRef]).stdout.trim() : null
  const tagCommit = tagExists ? git(['rev-parse', `${version}^{commit}`]).stdout.trim() : null
  const head = git(['rev-parse', 'HEAD'])
  if (head.status !== 0) {
    console.error(`release-check ${receiver ? '--receiver' : '--handoff'}: NOT-RUN — 读不到 HEAD`)
    return 2
  }
  const headCommit = head.stdout.trim()
  const porcelain = git(['status', '--porcelain'])
  const worktreeClean = porcelain.status === 0 && porcelain.stdout.trim() === ''

  const tarballPath = join(DIST, `dsh-deep-research-pack-${version}.tgz`)
  const manualPath = join(DIST, '安装手册.md')
  const manifestPath = join(DIST, 'build-manifest.json')
  const tarballSha = existsSync(tarballPath) ? sha256(readFileSync(tarballPath)) : null
  const manualText = existsSync(manualPath) ? readFileSync(manualPath, 'utf8') : null
  const manualVersion = manualText === null ? null : parseManualVersion(manualText)
  const manualSha = manualText === null ? null : parseManualSha(manualText)
  let manifestSha = null
  let artifactFresh = null
  if (existsSync(manifestPath)) {
    try {
      manifestSha = JSON.parse(readFileSync(manifestPath, 'utf8')).artifactSha256 ?? null
    } catch {
      manifestSha = null
    }
  }
  if (!receiver && tarballSha !== null && existsSync(manifestPath)) {
    try {
      artifactFresh = artifactFreshness(tarballPath, packInputRoots(PACK), { manifestPath }).fresh
    } catch {
      artifactFresh = false
    }
  }

  const problems = [
    ...releaseProblems,
    ...evaluateHandoff({
      version,
      tag,
      tagType,
      tagCommit,
      headCommit,
      worktreeClean,
      tarballSha,
      manualSha,
      manualVersion,
      manifestSha,
      artifactFresh,
      mode: receiver ? 'receiver' : 'sender',
    }),
  ]
  const label = receiver ? '--receiver' : '--handoff'
  if (problems.length > 0) {
    console.error(`release-check ${label}: FAIL`)
    for (const p of problems) console.error(`  - [${p.code}] ${p.message}`)
    console.error('  规则 = docs/guides/64-release-versioning.md；修完重跑。')
    return 1
  }
  console.log(`release-check ${label}: OK version=${version} tag=${tag} commit=${headCommit.slice(0, 7)} artifact=${tarballSha.slice(0, 12)}…`)
  if (receiver) {
    console.log('  receiver：tag/manual/tarball/manifest 已对齐；源指纹由 sender 的 --handoff 证明。')
  } else {
    console.log('  下一步：git push origin master && git push origin ' + tag + '；然后 npm publish')
  }
  return 0
}

if (isMain(import.meta.url)) process.exitCode = main()
