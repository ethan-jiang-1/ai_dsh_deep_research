---
name: bumping-vendor-pin
description: Use when upgrading the vendored DSH pin (vendor/dsh submodule tag/commit) — covering the identity re-pin, clean build, per-source re-review, compatibility matrix, full evidence tiers, and the graduation Note.
---

# 换 vendor pin（升基线）

本技能是 **guidance，不是 checklist**：按实际 diff 与风险选择动作，完成判据在各步末。相关：
[guides/60 §2 换 vendor pin 路由行](../../../docs/guides/60-dev-loop.md)（必跑面正本）、
[discipline-map §重审触发路径](../../../docs/discipline-map.md)（逐源重审清单正本）。
两次实操的教训已固化进本流程（[017rc2](../../../notes/implemented/2026-09-25-vendor-pin-bump-017rc2.md) /
[020rc2](../../../notes/implemented/2026-09-30-vendor-pin-bump-020rc2.md)）；流程缺口按"缺什么再加"补进本页。

## 1. 钉身份（四处同 diff）

新 tag/commit 落四处，缺一即漂移：`.gitmodules` 正源（submodule checkout 到新 commit）→
[AGENTS §DSH 源码表](../../../AGENTS.md)（tag @ short-sha 复述）→
[evaluation §L0 vendor-pin 行](../../../docs/evaluation.md)（钉 commit 字面量——门禁对账对象）→
pack 兼容矩阵 `dsh.compatibility.dshReleases`。改完 `pnpm verify`：`vendor-pin` / `pin-agreement`
应绿（它们机械咬四处不一致——红 = 先修复述再继续）。

## 2. 干净构建

`bash dev/vendor-build.sh --clean`——**--clean 必做，不是可选项**：旧 typert 产物与前端壳
build-time externals 会把新 host 半的改动静默稀释（020rc2 轮实证：浏览器模块表报
"build-time externals drift"，根因 = 陈旧产物）。顺序铁律已固化进脚本注释（host 半补建
先于 tsdown client），不要调整。

## 3. 逐源重审（重审清单的正本在 discipline-map）

按 [§重审触发路径](../../../docs/discipline-map.md) 清单**逐条重读**我们赖以立论的 vendor
源（根/子树 AGENTS、testing、architecture、notes 约定、skills 约定……），三态结论有变的
更新 discipline-map 对应行。外部材料登记同步对账：钉版语料/参考仓若自钉旧 DSH 版本，
其结论标记"待复核"（00-index §外部研究材料的钉版纪律）。

## 4. 全档证据（漏一档 = 有实证的漏网形态）

按路由行：**L0 + L1 + L2 + client-load-smoke + L4-lite**。client-load-smoke 不是可选——
020rc2 轮的漏网直接原因 = 必跑面不含它（build-time externals 漂移只有浏览器模块表能抓）。
L4-lite 需凭据（真模型档）；未跑项如实分列，不算通过。

## 5. run 通道与镜像

`dev/boot-run.sh` 漂移检测会红（**预期态**——agent-team-profile 层版本随兼容矩阵变了）：
按其处方删旧 profile 重建，别手改镜像。

## 5-bis. 证据层（升 pin 必红，不许降档凑绿）

`snapshots/` 场景证据随模型可见输入漂移：升 pin 后 `snapshot-replay` 的 **B·headers 面必红**
（组装请求头随新 vendor 变），这是**预期真红**，不是噪声。处置 = 真模型重录 `research-face`
整组 + 同步 `snapshot.json` 的场景身份（recordedAt / 钉版）；**不许**为凑绿削减判据集或降档——
判据集由消费者固定不可削减（BUG-018 教训）。判定日期与 recordedAt 是两件事。
见 [snapshots/README](../../../snapshots/README.md)、[guides/60 §2](../../../docs/guides/60-dev-loop.md)。

## 6. 毕业

升 pin 毕业 Note（`notes/implemented/`）= 重审结论的正本：四处身份落点、逐源重审结论、
全档证据实跑清单、环境状态（profile 重建等）。按实际授权与验收范围收尾。

## 已知边界

- 构建产物 gitignored（vendor-clean 不受影响），但根 node_modules 全 workspace 重解析
  （锁条目千级）——install 时长预期要给够。
- `--clean` 会清 vendored cordis 全家（vendor/cordis、cosmokit、schemastery）——重装走
  workspace 解析，不需要手工补救。
