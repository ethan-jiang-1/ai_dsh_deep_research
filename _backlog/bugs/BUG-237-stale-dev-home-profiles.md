---
status: 修复就绪
severity: P2
opened: 2026-11-17
---

# BUG-237：dev home 的 `research` / `wave-pilot` profile 镜像停在 0.3.1 / 0.3.0；直起 `dsh --profile` 跳过漂移检测

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：修复就绪（自授权 P2：运行态清理 + 检查）
>
> 位置：`runtime/harness-home/profiles/{research,wave-pilot}/node_modules/dsh-deep-research-pack`
> （gitignored 运行态）；相关说明 = [tools/channel/run-driver.mjs](../../tools/channel/run-driver.mjs) 第 28 行
> 「从不直起 `dsh --profile research`——那会跳过 pack 漂移检测、静默用旧镜像」。
> 探索轮 = [运行时/开发边界卡](../issues/2026-11-17-runtime-deps-install-boundary.md) 第三轮。

## 症状

dev home 的三个 profile 各有一份 pack 副本，版本/构建不一致：

| profile | 版本 | 镜像时间（client.js） |
|---|---|---|
| `deep-research` | 0.3.6 | 11-17 05:25（当前源 17:53） |
| `research` | **0.3.1** | 11-10 23:39 |
| `wave-pilot` | **0.3.0** | 11-05 07:26 |

`run-driver` 默认 profile = `deep-research`，且经 `boot-run` 做 pack 漂移检测（当前 `lib/client.js` 不一致
会被点名红）；但 `research` / `wave-pilot` 若被 `boot-run` 以外的路径直起（或 `DSH_RUN_PROFILE=research`），
按 `run-driver` 自己的注释会**跳过漂移检测、静默用旧镜像**。0.3.1/0.3.0 的镜像里没有本轮的 heartbeat/
namespace 修复；一次「看起来正常」的 run 可能在旧插件上跑。

## 分诊与授权

- 严重级：P2 — 运行态/证据新鲜度；不阻断主通道（默认 profile 有漂移检测），但存在静默旧镜像路径。
- 表面 / 边界：dev home 运行态 / ② 行为（profile 选择 + 漂移检测）
- DSH 不变量：fail-loud；运行态必须可追溯到当前源（或显式标注旧）
- 触及面：none（运行态清理 + 检查；不改产品）
- 授权：自授权（P2 修理型）
- 批：运行时/开发边界第三轮（运行态）

## 复现

复现状态：稳定。

```sh
for p in runtime/harness-home/profiles/*/node_modules/dsh-deep-research-pack; do
  printf '%s ' "$p"; grep -m1 '"version"' "$p/package.json"; stat -f '%Sm' -t '%m-%d %H:%M' "$p/lib/client.js"
done
sed -n '28p' tools/channel/run-driver.mjs
```

## 根因（已证）

profile 副本由 `dsh plugin add`/镜像流程安装；`boot-run` 的漂移检测按**当前 `DSH_RUN_PROFILE`** 跑，
且 `run-driver` 注释明确「直起 `dsh --profile research` 会跳过检测」。旧 profile 从未清理/升级；
`dev-runtime-clean` 只查 `tools/` 无运行态，`doctor`/`dev-parity` 不检查各 profile 的 pack 版本/构建。
默认 `deep-research` 的 `lib/client.js` 也已落后当前构建（05:25 vs 17:53），只是 `boot-run` 会红。

## 牵出的失败类

- 运行态 C5/C9（旧副本冒充当前）+ C7（漂移检测只覆盖默认通道）。
- 类级方向 = profile 镜像清单/版本+指纹检查；非默认 profile 要么删除、要么受同一漂移门。

## 修法

1. 清理/重建 `research` / `wave-pilot` profile（或删除死 profile），只保留默认 `deep-research`；
2. `boot-run` 的漂移检测对所有 profile 生效（不只当前），或 `run-driver` 在 `DSH_RUN_PROFILE != deep-research`
   时 fail-loud 要求显式 `--allow-stale-profile`；
3. `doctor`/`dev-parity` 加一条：每个 profile 的 pack 版本 + 运行时文件指纹 = 当前 pack（或显式旧标记）；
4. 默认 profile 的落后镜像由 boot-run 红提示重建（已存在），文档写清 `rm -rf profile` 的重建步骤。

## 修复判据

- 三个 profile 的 pack 版本/指纹与当前源一致，或不存在非默认 profile；
- 直起非默认 profile 不再能静默跳过漂移检测（fail-loud 或同一门）；
- `doctor`/`dev-parity` 有对应检查；`pnpm verify`/`test` 绿。
