---
name: adding-a-research-role
description: Use when adding a research role preset, renaming one, or changing a role's persona, skills, or tool rows in packages/deep-research-pack — covering the four-file shape, roster wiring, mirror sync, and the keyless smoke that proves the role really mounts.
---

# 新增或修改研究角色

本技能是 **guidance，不是 checklist**：按实际 diff 与风险选择动作，完成判据在各步末；相关技能：[`.agents/skills/writing-a-gate`](../writing-a-gate/SKILL.md) · [`.agents/skills/running-a-research-run`](../running-a-research-run/SKILL.md)。

角色 = 一个 preset 目录；它同时被三处消费：源码域（overlay）、镜像（`$DSH_HOME` profile）、
roster（角色清单）。**三处不同步 = 角色在场但行为不对**，所以顺序固定。

## 1. 角色目录的形状

在 `packages/deep-research-pack/presets/<role-id>/` 下：

| 文件 | 拥有 | 门禁 |
|---|---|---|
| `presets/<role>.patch.yml` | 一条 `@deepseek-ai/dsh-agent-preset` 行：config 带 `id`/`name`/`description`/`order`/`plugins`（0.1.7 形态） | `preset-structure` |
| `presets/<role>/skills/` | 该角色专属技能（`customSkillDirs` 指向它，硬隔离） | `preset-structure` |
| `skills/<n>/SKILL.md` | 该角色专属方法论（≥1 个） | `preset-structure`（frontmatter `name` = 目录名） |
| `README.md` | 该角色为什么这样切（可选但推荐） | — |

角色 id 用 `^[a-z0-9][a-z0-9-]*$`。persona 文本写"职责 + 边界 + 何时交给谁"，
不写工具用法（工具用法归 skill 或 vendor 文档）。

## 2. 三处同步（漏一处就漂移）

- **源码域**：`dev/research.overlay.yml` 的 bundle 行——源码域通道（冒烟、探针）走它；
- **镜像**：`dev/harness-home/profiles/research/` 的 profile 镜像——run 通道走它；
  `bash dev/boot-run.sh` 的漂移检测会逐文件比 pack 源 vs 镜像，不符即 fail-loud；
- **roster**：`scripts/lib/roles.mjs` 是访问器，事实源 = 盘上 `presets/`；改完跑
  `role-list-sync` 门禁（角色清单与 pack 对账）。

## 3. 验证（完成判据，keyless 优先）

```sh
node scripts/verify.mjs                    # preset-structure / row-deps / role-list-sync
node scripts/preset-smoke.mjs              # L1 接线（dump 面）
DSH_SMOKE_REAL=1 node scripts/preset-smoke.mjs   # L1 真挂载：真会话 + 逐角色断言 + skills 隔离
node scripts/release-smoke.mjs             # L2 真实安装形状（pack → 干净 profile → plugin add）
```

改了模型可见行（persona/skill 文本）→ 再跑真模型档 `node scripts/l4-lite-smoke.mjs`
（四角色响应 + scout 工具调用）。**只跑 keyless 不算验过角色行为**——机制基线切换的
教训（E1 回归）就是漏了 with-key 面。

## 4. 已装载角色改文本时

改 persona/skill 文本后，**运行中的 web 进程仍持 boot 时缓存的旧文本**（实测：spawn 出的
成员拿到修复前的 persona）。改完 pack 文本要重启 run 通道才生效——`boot-run.sh` 的漂移
检测会挡住 pack↔镜像不一致，但不会替你重启进程。
