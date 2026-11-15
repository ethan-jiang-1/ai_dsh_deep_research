> 状态：implemented

# 移交锚机械化：`dist-freshness` 门禁、tag 时点检查与 0.3.6 发布

## 决定

1. 发布 **0.3.6**（patch）。0.3.5 tag 之后的 17 个 commit 是 owner 镜像重构（95 个 pack 文件、
   +162/−162，本质是路径搬家），已发布的 `0.3.5` tag 不移动——移动会让同一版本号对应两套制品，
   正是 0.3.4 的旧病（[release-anchor 头注](../../scripts/lib/repo/release-anchor.mjs)）。
2. 「制品由当前 pack 源生成」成为 L0 门禁 `dist-freshness`：读 `_dist/build-manifest.json` 的
   源指纹，与 pack 输入根逐一比对；**制品缺席 = note**（clean clone/源码 handoff 合法），
   在场而指纹不符 = 红并给出重建命令。
3. tag=HEAD、annotated tag、manual sha=制品 sha 仍由 `release-check --handoff` 在发布/移交
   **时点**判；普通 commit 不假定 tag 在场，所以不进 L0。
4. dev shell 里写死的 `scripts/lib/*.mjs` 字面量由 `repo-conventions` 把守（模块搬家后消费方
   未跟 = 红）——2026-11-15 实测 `bootstrap --check` 因路径搬家永远误报「vendor 产物缺席」。

## 输掉的方案

- **把 0.3.5 的 tag 移到 HEAD**：已发布 tag 不可移动；同版本号两套制品会让接收方无法判断
  「装的是哪份 0.3.5」。发包新 patch 是唯一无歧义路径。
- **只靠 `release-check --handoff` 的散文步骤**：0.3.4/0.3.5 两轮都漏——门禁全绿与交接锚红
  可以同时成立，因为 `dist-tarball` 只证「手册↔制品」、`release-version` 只证「版本↔版本」。
- **把 tag=HEAD 放进 L0**：CI 与日常 commit 未打 tag，会让每个普通 commit 红；tag 是发布时点
  事实，不是常驻结构事实。
- **让 CI 在 tag 上重建 `_dist` 再判 handoff**：手册含本地日期、制品哈希不保证跨机重放，
  重建会让工作树变脏，`--handoff` 的 worktree-clean 断言必然失败。

## 判据形状

- 权威输入 = `_dist/dsh-deep-research-pack-<pack version>.tgz` + 同目录 `build-manifest.json`
  的 `sourceFingerprint`；唯一写入者 = `scripts/dist/export-dist.mjs`；读取者 = 门禁与
  `release-check`。
- 缺失（clean clone / 源码 handoff）→ note，不静默也不误红；在场且指纹不匹配 → 红，报
  `mode: reason` 与重建命令。
- 互斥/非法：版本文件名与 pack version 不一致由 `dist-manual-version` 判；手册 sha 与制品
  sha 不一致由 `dist-tarball` 判；两处与本源指纹检查互不顶替。
- 反证：2026-11-15 旧 0.3.5 制品在场 → `dist-freshness` 点名红；重导出后绿。
- 旧形态退场：`dist-tarball` 的「sha 自洽」不再被当作「制品↔源同源」的证据。

## 实际跑过的验证

- 红证 ①：`node scripts/verify/verify.mjs --only=dist-freshness` → FAIL
  `source-changed（409 → 409 files）`（旧制品与当前源文件数相同、内容不同）。
- 红证 ②：`node scripts/verify/verify.mjs --only=repo-conventions` → 5 处
  `dev/*.sh: 引用不存在的 scripts/lib/...`（boot-run 4 处、bootstrap 1 处）。
- 绿证 ①：修 4 处 shell 路径 + `vendor-artifacts` 默认 root（两层→三层）后
  `--only=repo-conventions` PASS；`node scripts/lib/harness/vendor-artifacts.mjs` exit 0。
- 绿证 ②：`node scripts/dist/export-dist.mjs` 重建 0.3.6（186 条目、preset 行 5/5、skill 15、
  模板 11、manifest 源 409 files）后 `dist-freshness` / `dist-tarball` / `dist-manual-*` PASS。
