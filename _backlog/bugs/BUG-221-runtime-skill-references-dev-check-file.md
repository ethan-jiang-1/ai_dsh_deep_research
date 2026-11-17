---
status: 等人拍板
severity: P2
opened: 2026-11-17
---

# BUG-221：运行时 skill `research-brief` 让 lead 依赖 `checks/lib/shared/plan-card.mjs`——该文件不随包

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：等人拍板（pack 公共行为/模型可见内容）
>
> 位置：[packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md](../../packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md)
> 第 76 行；该 skill 随 `presets/**` 进 tarball，会进 lead 的模型上下文。
> 探索轮 = [运行时/开发边界卡](../issues/2026-11-17-runtime-dev-boundary.md) R2。

## 症状

运行时 skill 的 HITL1 卡片段写：

> 不写默认 lens（`按计划开跑` 标签不动，**`checks/lib/shared/plan-card.mjs`** 据此识别计划卡）。

`checks/` 不在发布 tarball（`tar -tzf` 无 `package/checks/`）；lead 在用户安装里看到的是
一个不存在的开发仓文件。模型可能尝试 `read` 它（读空/报错），或被引导去猜一个包内不存在的实现。
这属于「运行时模型可见文本依赖开发时刻脚本」的典型形态。

## 分诊与授权

- 严重级：P2 — 模型可见内容指向不存在的文件；单条不阻断跑，但会消耗探索/误诊。
- 表面 / 边界：运行时 skill（preset 内容）/ ② 静态（文本 + 发布物）
- DSH 不变量：model-visible ⟺ logged；模型可见文本不得依赖未发布的开发面
- 触及面：pack 公共行为（模型可见内容）
- 授权：等人拍板（pack 触面）
- 批：运行时/开发边界第一轮（R2）

## 复现

复现状态：稳定。

```sh
grep -n 'checks/lib/shared/plan-card.mjs' packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md
tar -tzf _dist/dsh-deep-research-pack-0.3.6.tgz | grep -c 'package/checks/'   # 0
```

`doc-paths` 在仓内是绿的（`checks/lib/shared/plan-card.mjs` 存在），这正是盲区：门禁验的是
开发仓存在性，不是发布可达性。

## 根因（已证）

文案把「开发侧如何识别计划卡」写进了运行时 skill；`doc-paths` / `call-surface` 扫描的是仓内
文件（仓内该路径存在），没有「发布物内是否存在」这一层；`content-shape` / `preset-structure`
也不扫 skill 文本里的仓内路径。

## 牵出的失败类

- 发布面 C2（模型可见内容引用未发布件）+ C11（文档漂移）；与 [BUG-220](BUG-220-pack-readme-user-section-dev-smokes.md)
  同族，但载体是模型可见 skill。
- 类级方向 = 发布文本零 dev 引用（[BUG-227](BUG-227-pack-boundary-no-shipped-dev-ref-gate.md)）。

## 修法

1. 删掉实现文件名，改成行为描述：「标签不动，计划卡由宿主识别」；
2. 若必须给维护者线索，放进不进模型上下文的开发文档，而不是 skill；
3. 发布面加扫描（见 BUG-227）：tarball 内 `presets/**/skills/**` 不得出现 `checks/|tests/|tools/|_backlog|docs/|runtime/`。

## 修复判据

- `grep -rn 'checks/\|tests/\|tools/\|_backlog\|docs/' presets/*/skills` 对运行时 skill 为空；
- 新增扫描对注入 `checks/__gone__.mjs` 的 skill 红；`pnpm verify` / `pnpm test` 绿；
- lead 的 HITL1 卡片行为不变（`按计划开跑` 仍不写默认 lens）。

## 修复关联

与 [BUG-220](BUG-220-pack-readme-user-section-dev-smokes.md) / [BUG-222](BUG-222-runtime-skill-references-dev-design-doc.md) /
[BUG-223](BUG-223-runtime-skill-hardcodes-dev-workspace.md) 同批（发布文本 dev 引用）。
