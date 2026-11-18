---
status: 修复就绪
severity: P2
opened: 2026-11-18
---

# BUG-242：run-driver 的非默认 profile 守卫只看 env/default，不看 `--profile` 参数——直起旧 profile 仍可绕过

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：修复就绪（自授权 P2：入口守卫）
>
> 位置：[tools/channel/run-driver.mjs](../../tools/channel/run-driver.mjs) 第 211 行（`staleProfileMessage(DEFAULT_PROFILE)`）
> 与第 270 行（`wantProfile = arg('--profile', DEFAULT_PROFILE)`）；判据 =
> [checks/lib/channel/profile-guard.mjs](../../checks/lib/channel/profile-guard.mjs)。
> 探索轮 = [搬家残差 II](../issues/2026-11-18-move-residuals.md) B。

## 症状

`run-driver` 的守卫用 `DEFAULT_PROFILE`（= `DSH_RUN_PROFILE || 'deep-research'`）判断，而真正要起的
profile 是 `--profile` 参数：

```text
211:  const message = staleProfileMessage(DEFAULT_PROFILE);
270:  const wantProfile = arg('--profile', DEFAULT_PROFILE);
```

所以 `DSH_RUN_PROFILE` 未设时：

```sh
node tools/channel/run-driver.mjs up --profile research
# 211 看 deep-research → message=null → 放行
# 270 用 wantProfile=research → boot-run 起旧镜像 0.3.1
```

这正是 BUG-237 想堵的「直起非默认 profile 跳过漂移检测」；`--profile` 是文档用法，守卫却漏了它。
`probe --profile` 同样。

## 分诊与授权

- 严重级：P2 — 运行态/旧镜像；默认路径有漂移门，但文档化的 flag 路径可静默绕过。
- 表面 / 边界：run 通道入口 / ② 行为（参数解析 + 守卫）
- DSH 不变量：fail-loud；守卫的输入必须是被启动的 profile
- 触及面：none（守卫修正 + 测试）
- 授权：自授权（P2 修理型）
- 批：搬家残差 II（B）

## 复现

复现状态：稳定（读码；不需要真起 web）。

```sh
sed -n '211p;270p' tools/channel/run-driver.mjs
node --input-type=module -e "
import {staleProfileMessage} from './checks/lib/channel/profile-guard.mjs';
console.log('deep-research:', staleProfileMessage('deep-research'));
console.log('research:', staleProfileMessage('research'));
"
# 运行时：DSH_RUN_PROFILE 未设 + --profile research → 211 放行，270 用 research
```

## 根因（已证）

守卫放在子命令解析之前，只有 `DEFAULT_PROFILE`（env/default）可用；`--profile` 在 270 才解析。
`profile-guard.test` 只测纯函数，不测 run-driver 的 flag 路径；`checks/AGENTS` 的入口测试也不覆盖。

## 牵出的失败类

- 运行态 C5/C7（旧镜像 + 守卫输入错位）；与 [BUG-243](BUG-243-boot-run-direct-profile-guard-bypass.md)
  同族，但这是 flag 路径，243 是 boot-run 直起。
- 类级方向 = 解析后的目标 profile 是唯一守卫输入；参数解析先于守卫。

## 修法

1. 把 `--profile` 解析提到守卫前，`staleProfileMessage(wantProfile)`；
2. `probe` 同样用解析后的 profile；`--allow-stale-profile` 保留；
3. 单测/入口测试：`up --profile research` 在无 `--allow-stale-profile` 时 exit 2，文案含 profile；
4. 与 `boot-run` 的判据共用 profile-guard（见 243）。

## 修复判据

- `DSH_RUN_PROFILE` 未设 + `up --profile research` → exit 2（或显式 `--allow-stale-profile` 放行）；
- 默认 `deep-research` 不受影响；`probe --profile` 同；
- `pnpm test` / run-driver 契约测试绿。
