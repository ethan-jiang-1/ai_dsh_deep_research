// profile-health.mjs — dev DSH profile 的版本面与 pack 镜像新鲜度预检（纯读；boot 前 fail-fast）。
//
// 为什么存在（BUG-066 + BUG-080）：
// 1. profile 的团队层版本未随 pin 重钉时，dsh 不退出、只是拒绝服务；boot 只看到「等待启动横幅超时」（BUG-066）。
// 2. profile 内已安装的 dsh-deep-research-pack 镜像落后于工作树源码时（如 content/manual.md 或 preset 已改），
//    record-role-fixture 会把旧手册录进新快照，而本机 snapshot-replay 对同一陈旧镜像回放仍假绿，直到干净 CI 炸红（BUG-080）。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

/** 运行中 dsh 的版本（vendor 源码包清单；与 boot 实际二进制同源）。 */
export function runtimeVersionOf(root) {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'vendor', 'dsh', 'package.json'), 'utf8'))
    return typeof pkg.version === 'string' && pkg.version !== '' ? pkg.version : null
  } catch {
    return null
  }
}

function collectPackRuntimeFiles(packDir) {
  const rels = []
  if (existsSync(join(packDir, 'cordis.patch.yml'))) rels.push('cordis.patch.yml')
  const walk = (subDir) => {
    const abs = join(packDir, subDir)
    if (!existsSync(abs)) return
    for (const ent of readdirSync(abs, { withFileTypes: true })) {
      const childRel = `${subDir}/${ent.name}`
      if (ent.isDirectory()) walk(childRel)
      else if (ent.isFile()) rels.push(childRel)
    }
  }
  for (const dir of ['content', 'presets', 'workers']) walk(dir)
  for (const built of ['lib/content.js', 'lib/defaults.js', 'lib/method-library-tool.js', 'lib/fetch-fallback.js']) {
    if (existsSync(join(packDir, built))) rels.push(built)
  }
  return rels.sort()
}

function packMirrorDrift(packDir, mirrorDir) {
  if (!existsSync(mirrorDir)) return ['node_modules/dsh-deep-research-pack（缺席）']
  const drifted = []
  for (const rel of collectPackRuntimeFiles(packDir)) {
    const srcPath = join(packDir, rel)
    const dstPath = join(mirrorDir, rel)
    if (!existsSync(dstPath)) {
      drifted.push(`${rel}（镜像缺席）`)
      continue
    }
    if (readFileSync(srcPath, 'utf8') !== readFileSync(dstPath, 'utf8')) {
      drifted.push(rel)
    }
  }
  return drifted
}

/**
 * profile 版本面与（可选）pack 镜像新鲜度问题（空数组 = 可启动）。
 * @param {{profileDir: string, runtimeVersion: string, profileName?: string, layer?: string, packDir?: string}} input
 * @returns {string[]}
 */
export function profileLayerIssues({
  profileDir,
  runtimeVersion,
  profileName = 'deep-research',
  layer = '@deepseek-ai/dsh-experimental-agent-team-profile',
  packDir,
}) {
  const manifest = join(profileDir, 'package.json')
  if (!existsSync(manifest)) return [`profile 不在场：${profileDir}——${profileName === 'deep-research' ? '先跑 tools/boot-run.sh（guides/60 §2）' : `${profileName} 档已弃用，消费方改用 deep-research`}`]
  let pkg
  try { pkg = JSON.parse(readFileSync(manifest, 'utf8')) } catch (error) {
    return [`profile 清单不可解析：${manifest}（${String(error?.message ?? error)}）`]
  }
  const actual = pkg?.dependencies?.[layer]
  if (actual === undefined) return [`profile 缺团队层 ${layer}——${profileName === 'deep-research' ? '先跑 tools/boot-run.sh 重建' : `${profileName} 档已弃用，消费方改用 deep-research`}`]
  if (typeof runtimeVersion !== 'string' || runtimeVersion === '') return [`读不到运行中 dsh 版本，拒绝用猜的版本门`]
  if (actual !== runtimeVersion) {
    return [`${layer} ${String(actual)} ≠ runtime ${runtimeVersion}——profile 未随 pin 重钉；${profileName === 'deep-research' ? '先跑 tools/boot-run.sh 重建' : `${profileName} 档已弃用，消费方改用 deep-research（boot-run 只维护 deep-research）`}`]
  }
  if (typeof packDir === 'string' && packDir !== '' && existsSync(packDir)) {
    const mirrorDir = join(profileDir, 'node_modules', 'dsh-deep-research-pack')
    const drifted = packMirrorDrift(packDir, mirrorDir)
    if (drifted.length > 0) {
      const sample = drifted.slice(0, 4).join('、') + (drifted.length > 4 ? ` 等 ${drifted.length} 项` : '')
      const relProfile = relative(process.cwd(), profileDir) || profileDir
      return [`profile 内 pack 镜像与源码不一致（${sample}）——先跑 rm -rf '${relProfile}' && MCP_PLAYWRIGHT=0 bash tools/boot-run.sh --prepare-profile 重建镜像`]
    }
  }
  return []
}
