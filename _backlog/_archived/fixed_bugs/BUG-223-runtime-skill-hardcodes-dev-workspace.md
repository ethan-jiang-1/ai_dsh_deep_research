---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-223：运行时 skill `question-patterns` 硬编码开发工作区 `research-workspace/`——用户工作区不是这个名字

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行 pack 触面；research-workspace/ 改为运行期 workspace 根） — 结论：research-workspace/ → 当前 run 的 workspace 根（用户工作区任意目录）；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-shipped-boundary-self-contained.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e（2026-11-17）
>
> 位置：[packages/deep-research-pack/presets/lead/skills/question-patterns/SKILL.md](../../../packages/deep-research-pack/presets/lead/skills/question-patterns/SKILL.md)
> 第 225–226 行；探索轮 = [运行时/开发边界卡](../settled_issues/2026-11-17-runtime-dev-boundary.md) R2。

## 症状

运行时 skill 的「判型离线收割」给了一条命令：

```text
2. **离线收割**（归档时，操作侧）：`grep -rn "判型" research-workspace/
   --include=journal.md` → 两张清单：未命中候选 + 各条目命中账。
```

`research-workspace/` 是**本开发仓**的工作区实例名；用户 run 的 cwd 是任意目录（`drt_<slug>` 在其下）。
模型照 skill 执行会 grep 一个不存在的目录（或开发者的同名目录），收割命令在用户安装里没有意义。
同一 skill 的 `drt_*` 是运行期 bundle 约定（合法），`research-workspace/` 是开发期实例名（不合法）。

## 分诊与授权

- 严重级：P2 — 模型可见命令在用户工作区不可执行/指错目录；不阻断主流程，但会制造空收割或误报。
- 表面 / 边界：运行时 skill（preset 内容）/ ② 静态（文本 + 用户工作区语义）
- DSH 不变量：model-visible ⟺ logged；运行时指令必须相对运行期概念（bundle/workspace），不能写死开发实例
- 触及面：pack 公共行为（模型可见内容）
- 授权：用户 2026-11-17 放行（pack 触面 → 修复就绪 = P2 修复授权）
- 批：运行时/开发边界第一轮（R2）

## 复现

复现状态：稳定。

```sh
grep -n 'research-workspace' packages/deep-research-pack/presets/lead/skills/question-patterns/SKILL.md
# 225: `grep -rn "判型" research-workspace/`
ls research-workspace   # 仓内有；用户工作区没有
```

## 根因（已证）

收割条目来自开发期 `research-workspace/` 的操作经验，被原样写进模型可见 skill；没有把
`research-workspace/` 归一为「当前 run bundle 的父目录」或「用户指定的 workspace」。
`content`/`presets` 的发布面扫描（[BUG-227](BUG-227-pack-boundary-no-shipped-dev-ref-gate.md)）也不覆盖
「开发实例名」这一类词。

## 牵出的失败类

- 发布面 C2（开发实例名进入运行时指令）+ C11；与 [BUG-221](BUG-221-runtime-skill-references-dev-check-file.md) /
  [BUG-222](BUG-222-runtime-skill-references-dev-design-doc.md) 同族，但载体是「开发工作区名」而非文件路径。
- 类级方向：发布文本禁止开发实例名（`research-workspace/`、`_backlog/`、`checks/`、`tests/` 等），
  或把它们归一到运行期变量（`<workspace>`/bundle 根）。

## 修法

1. 把 `research-workspace/` 改为当前 run 的 workspace 根（或 `<workspace>/` 占位），并说明
   「在归档时对用户工作区执行」；
2. 若该段只面向开发/运维，移出模型可见 skill（放 guides/61 或维护者文档），skill 只留运行期动作；
3. 发布面扫描加开发实例名词表。

## 修复判据

- skill 不再出现 `research-workspace/`；改为 `<workspace>` 或 bundle 根；
- 发布面扫描对注入 `research-workspace/` 的 skill 红；`pnpm verify` / `pnpm test` 绿；
- 判型收割语义不变（仍能对用户工作区 journal 做未命中/命中账）。

## 修复关联

与 [BUG-221](BUG-221-runtime-skill-references-dev-check-file.md) / [BUG-222](BUG-222-runtime-skill-references-dev-design-doc.md)
同批；如果选择「移出模型可见面」，与 guides/61 的“操作侧”章节同变更。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/presets/lead/skills/question-patterns/SKILL.md",
    "checks/lib/repo/shipped-surface.mjs",
    "tests/checks/shipped-surface.test.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/shipped-surface.test.mjs",
    "exit": 1,
    "output": "presets/lead/skills/question-patterns/SKILL.md:225 随包文本引用开发面 research-workspace/"
  },
  "green": {
    "command": "node --test tests/checks/shipped-surface.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/shipped-surface.test.mjs"
  }
}
```
