// release-anchor.mjs — 发布/移交锚的纯判据（无 I/O、无 git、无环境读取）。
//
// 为什么存在：0.3.4 的 annotated tag 在 ec652a30（2026-11-13，manual sha f41a6b），
// 而工作树/`_dist` 的 0.3.4 制品在 2026-11-14 由 HEAD 重建（manual sha eed98）——
// 同版本号两套制品，`release-check` 只看 HEAD 是否打了同名 tag，不把 tag 与制品配对，
// 所以两边都“合法”。本模块把配对关系变成可测的纯函数：tag 名/类型/commit、工作树、
// manual sha、build-manifest sha、artifact freshness 全部作为输入，缺一即红。
//
// 边界：只判“发布锚”，不判包内容（`dist-tarball`/`pack-manifest` 管）；不读盘是刻意的，
// `release-check` 负责取事实，测试直接喂矩阵。

/** 三段 semver；与 checks/dist/release-check.mjs 及 release-version 门禁同形。 */
export const SEMVER = /^\d+\.\d+\.\d+$/

const problem = (code, message) => ({ code, message })

/** 版本面：root 镜像 pack；HEAD 的 exact tag（若有）必须同名、annotated。 */
export function evaluateRelease({ rootVersion, packVersion, headTag = null, headTagType = null }) {
  const problems = []
  if (typeof rootVersion !== 'string' || !SEMVER.test(rootVersion)) {
    problems.push(problem('release-root-version-invalid', `root package.json version 不是三段 semver：${JSON.stringify(rootVersion)}`))
  }
  if (typeof packVersion !== 'string' || !SEMVER.test(packVersion)) {
    problems.push(problem('release-pack-version-invalid', `pack package.json version 不是三段 semver：${JSON.stringify(packVersion)}`))
  }
  if (problems.length === 0 && rootVersion !== packVersion) {
    problems.push(problem('release-version-drift', `版本漂移：root ${rootVersion} ≠ pack ${packVersion}——发布版本以 pack 为准，root 必须镜像`))
  }
  if (headTag !== null) {
    if (!SEMVER.test(headTag)) {
      problems.push(problem('release-head-tag-not-semver', `HEAD 的 tag 名不是三段 semver：${headTag}`))
    } else if (headTag !== packVersion) {
      problems.push(problem('release-head-tag-version-mismatch', `HEAD tag ${headTag} ≠ pack version ${packVersion}——tag 必须指向该版本已提交的 commit`))
    }
    if (headTagType !== 'tag') {
      problems.push(problem('release-head-tag-not-annotated', `tag ${headTag} 是 ${String(headTagType)}，不是 annotated tag（发布 tag 必须 git tag -a）`))
    }
  }
  return problems
}

/**
 * 移交锚：当前版本的 annotated tag 必须指向 HEAD；工作树干净；`_dist` 三件同源。
 * 输入允许 null 表示“缺席”；缺席本身是问题（移交必须有制品）。
 * mode='receiver'：clean clone 无 `lib/`，无法重算源指纹；只查 tag/manual/tarball/manifest
 * 对齐，跳过 `artifactFresh`。sender 的 `--handoff` 仍必须 fresh。
 */
export function evaluateHandoff({
  version,
  tag = null,
  tagType = null,
  tagCommit = null,
  headCommit = null,
  worktreeClean = null,
  tarballSha = null,
  manualSha = null,
  manualVersion = null,
  manifestSha = null,
  artifactFresh = null,
  mode = 'sender',
}) {
  const problems = []
  if (tag === null) {
    problems.push(problem('handoff-tag-missing', `当前版本 ${String(version)} 没有 annotated tag——先 commit 版本变更并 git tag -a ${String(version)} -m "${String(version)}"`))
  } else {
    if (tag !== version) problems.push(problem('handoff-tag-version-mismatch', `tag ${tag} ≠ 当前版本 ${String(version)}`))
    if (tagType !== 'tag') problems.push(problem('handoff-tag-not-annotated', `tag ${tag} 是 ${String(tagType)}，不是 annotated tag`))
    if (tagCommit === null || headCommit === null || tagCommit !== headCommit) {
      problems.push(problem('handoff-tag-not-head', `tag ${tag} 不指向 HEAD（tag ${String(tagCommit)} vs HEAD ${String(headCommit)}）——移交必须在“该版本已提交”的 commit 上`))
    }
  }
  if (worktreeClean !== true) {
    problems.push(problem('handoff-worktree-dirty', '工作树有未提交改动——先 commit，移交包必须来自干净树'))
  }
  if (tarballSha === null) {
    problems.push(problem('handoff-tarball-missing', '缺少 `_dist/dsh-deep-research-pack-<version>.tgz`——先 node tools/release/export-dist.mjs'))
  }
  if (manualSha === null || manualVersion === null) {
    problems.push(problem('handoff-manual-missing', '缺少 `_dist/安装手册.md` 或其版本/sha 表头——先重导出'))
  } else {
    if (manualVersion !== version) {
      problems.push(problem('handoff-manual-version-mismatch', `安装手册版本 ${manualVersion} ≠ 当前版本 ${String(version)}——重导出，不手改`))
    }
    if (tarballSha !== null && manualSha !== tarballSha) {
      problems.push(problem('handoff-manual-sha-mismatch', `安装手册 sha256 ${manualSha} ≠ 制品 ${tarballSha}——手册与 tarball 漂移，重导出`))
    }
  }
  if (manifestSha === null) {
    problems.push(problem('handoff-manifest-missing', '缺少 `_dist/build-manifest.json`——重导出以写源指纹'))
  } else if (tarballSha !== null && manifestSha !== tarballSha) {
    problems.push(problem('handoff-manifest-sha-mismatch', `build-manifest sha ${manifestSha} ≠ 制品 ${tarballSha}——重导出`))
  }
  if (mode !== 'receiver' && artifactFresh !== true) {
    problems.push(problem('handoff-artifact-stale', 'tarball 不是由当前 pack 源生成（build-manifest 源指纹不匹配）——先 node tools/release/export-dist.mjs'))
  }
  return problems
}

/** 便于 CLI/测试把问题列表压成一行。 */
export const problemCodes = (problems) => problems.map((p) => p.code)
