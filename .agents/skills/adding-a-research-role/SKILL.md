---
name: adding-a-research-role
description: Use when adding a research role preset, renaming one, or changing a role's persona, skills, or tool rows in packages/deep-research-pack — covering the four-file shape, roster wiring, mirror sync, and the keyless smoke that proves the role really mounts.
---

# 新增或修改研究角色

本技能是 **guidance，不是 checklist**：按实际 diff 与风险选择动作，完成判据在各步末；相关技能：[`.agents/skills/writing-a-gate`](../writing-a-gate/SKILL.md) · [`.agents/skills/running-a-research-run`](../running-a-research-run/SKILL.md)。

角色 = `presets/<role>.patch.yml`（preset 行）+ `presets/<role>/`（技能根）；它同时被源码域
（overlay）、镜像（`$DSH_HOME` profile）、roster（角色清单）与 bundle 装载面消费。**漏一处 =
角色在场但行为不对（或根本没装载）**，所以顺序固定。

## 1. 角色的文件形状（包内）

| 文件 | 拥有 | 门禁 |
|---|---|---|
| `presets/<role>.patch.yml` | 一条 `@deepseek-ai/dsh-agent-preset` 行：config 带 `id`/`name`/`description`/`order`/`plugins`（0.1.7 形态） | `preset-structure` |
| `presets/<role>/skills/<n>/SKILL.md` | 该角色专属方法论（≥1 个；`customSkillDirs` 指向 `presets/<role>/skills/`，硬隔离） | `preset-structure`（frontmatter `name` = 目录名） |
| `presets/<role>/README.md` | 该角色为什么这样切（可选但推荐） | — |
| `package.json` 的 `dsh.bundle.patch` | 列出 `cordis.patch.yml` + 每个 `presets/*.patch.yml`（漏则 preset 行不随 bundle 装载） | `pack-bundle-compat` |

角色 id 用 `^[a-z0-9][a-z0-9-]*$`。persona 文本写"职责 + 边界 + 何时交给谁"，
不写工具用法（工具用法归 skill 或 vendor 文档）。

## 2. 装载点同步（漏一处就漂移）

- **bundle 装载**：`package.json` 的 `dsh.bundle.patch` 数组补上 `presets/<role>.patch.yml`
  ——0.1.7 的 preset 行随 bundle 装载，漏了它角色不进 roster（`pack-bundle-compat` 红）；
- **源码域**：`dev/research.overlay.yml` 的 bundle 行——源码域通道（冒烟、探针）走它；
- **镜像**：`runtime/harness-home/profiles/research/` 的 profile 镜像——run 通道走它；
  `bash dev/boot-run.sh` 的漂移检测会逐文件比 pack 源 vs 镜像，不符即 fail-loud；
- **roster**：`scripts/lib/roles.mjs` 是访问器，事实源 = 盘上 `presets/`；改完跑
  `role-list-sync` 门禁（角色清单与 pack 对账）；
- **persona 引用对账**：每个 preset 的 persona 文本硬引用 skill 名（如 critic「先加载
  adversarial-review skill」）——增删/改名 skill 时同 diff 检查 persona 是否跟着改（模型可见面）；
- **真模型档覆盖**：`scripts/smoke/l4-lite-smoke.mjs` 的 `PROMPTS` 加该角色的标记 prompt——它是
  全角色冒烟，盘上有角色而无覆盖即 exit 2；
- **台账**：增删角色 = 推翻 D2（角色 = 5 个：4 研究 + 方法编辑，D37），先在 `docs/decisions.md` 台账登记新 D 号，
  再动代码——`tests/pack/presets.test.mjs` 的数量哨兵会拦住没登记的增删。

## 3. 验证（完成判据，keyless 优先）

```sh
node dev/render-overlay.mjs                       # 生成物先行：L1 挂的是 overlay 不是 pack 源（改 pack 后必跑且先于 L1）
node scripts/verify/verify.mjs                    # preset-structure / row-deps / role-list-sync
source dev/env.sh && node scripts/smoke/preset-smoke.mjs                  # L1 接线（dump 面；未 source 自拒）
source dev/env.sh && DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs # L1 真挂载：真会话 + 逐角色断言 + skills 隔离
source dev/env.sh && node scripts/smoke/release-smoke.mjs --install-only  # L2 仅部署面改动时必跑（跳凭据；未 source 自拒）
```

改了模型可见行（persona/skill 文本）→ keyless 先跑 `node scripts/smoke/snapshot-replay-smoke.mjs`
（B 层组装请求 diff：persona 全文 + 全部 request/header + 四处 user/message 注入（含时钟序列）；有意变更的
红 = 已捕获，走重录场景或 `--update-expected` 重写金标准）→ 再跑真模型档
`source dev/env.sh && node scripts/smoke/l4-lite-smoke.mjs`（全角色响应，含 method-editor；+ scout 工具调用）。
**只跑 keyless 不算验过角色行为**——机制基线切换的
教训（E1 回归）就是漏了 with-key 面。

## 4. 已装载角色改文本时

改 persona/skill 文本后，**运行中的 web 进程仍持 boot 时缓存的旧文本**（实测：spawn 出的
成员拿到修复前的 persona）。改完 pack 文本要重启 run 通道才生效——`boot-run.sh` 的漂移
检测会挡住 pack↔镜像不一致，但不会替你重启进程。
