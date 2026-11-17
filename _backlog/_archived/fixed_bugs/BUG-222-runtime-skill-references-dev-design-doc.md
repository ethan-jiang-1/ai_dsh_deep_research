---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-222：运行时 skill `nodes-contract` 把开发仓 `docs/design/50-agent-loop-and-state.md` 写成状态合同正本——该文件不随包

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行 pack 触面；状态合同指向随包 content/generic/state-and-recovery.md） — 结论：状态合同指向随包 content/generic/state-and-recovery.md（补 canonical 优先级段）；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-shipped-boundary-self-contained.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e（2026-11-17）
>
> 位置：[packages/deep-research-pack/presets/lead/skills/nodes-contract/SKILL.md](../../../packages/deep-research-pack/presets/lead/skills/nodes-contract/SKILL.md)
> 第 10–11 行；探索轮 = [运行时/开发边界卡](../settled_issues/2026-11-17-runtime-dev-boundary.md) R2。

## 症状

lead 的 `nodes-contract` 是运行时会加载进模型上下文的 skill；它把状态合同的**正本**指向开发仓：

> 状态合同（run bundle / session log / goal·任务板 / 观察面的 canonical 与恢复优先级）正本 =
> 开发仓 `docs/design/50-agent-loop-and-state.md`（不随包）；……随包部署的种子不带仓内链接，
> 故此处纯文本指路。

`docs/` 不在 tarball（186 条目里无 `package/docs/`）。模型在用户安装里读不到「正本」，只能
在 skill 文本的二手摘要与一个不存在的路径之间取舍；这违反「模型可见文本 = 自足/可发布」的边界。

## 分诊与授权

- 严重级：P2 — 模型可见内容的权威指针指向未发布文件；不阻断跑，但状态/恢复判据的溯源断在发布面外。
- 表面 / 边界：运行时 skill（preset 内容）/ ② 静态（文本 + 发布物）
- DSH 不变量：model-visible ⟺ logged；模型可见文本必须自足或指向随包载体
- 触及面：pack 公共行为（模型可见内容）
- 授权：用户 2026-11-17 放行（pack 触面 → 修复就绪 = P2 修复授权；随包载体已拍板）
- 批：运行时/开发边界第一轮（R2）

## 复现

复现状态：稳定。

```sh
grep -n 'docs/design/50-agent-loop-and-state.md' packages/deep-research-pack/presets/lead/skills/nodes-contract/SKILL.md
tar -tzf _dist/dsh-deep-research-pack-0.3.6.tgz | grep -c '^package/docs/'   # 0
```

`doc-paths` 在仓内绿（文件存在），但它不检查「该文件是否随包」——这正是 [BUG-227](BUG-227-pack-boundary-no-shipped-dev-ref-gate.md)
的缺口。

## 根因（已证）

skill 以「开发仓正本 + 不随包」的方式指路：作者知道文件不随包，却仍把正本地位给了它。
包内没有等价的状态合同载体（`content/generic/state-and-recovery.md` 是运行手册的一部分，
但未被 skill 指为状态合同正本），于是模型可见面缺一个可发布的正本。

## 牵出的失败类

- 发布面 C2（模型可见内容引用未发布件）+ C11；与 [BUG-221](BUG-221-runtime-skill-references-dev-check-file.md) 同族。
- 修法不是「删路径」了事：要么把状态合同摘要内联进 skill/随包 content，要么在包内建正本并让 skill 指它。

## 修法

1. 把 skill 需要的状态合同条（run bundle / session log / goal·任务板 / 观察面的 canonical 与恢复优先级）
   内联到 skill，或指向随包的 `content/generic/state-and-recovery.md` 并在其中补足；
2. 删除 `开发仓 docs/design/50…（不随包）` 这行；
3. 发布面扫描（BUG-227）覆盖 `presets/**/skills/**` 的 `docs/` 引用。

## 修复判据

- skill 不再出现 `docs/`/`checks/`/`_backlog`；状态合同在包内可读（skill 内联或随包 content）；
- 发布面扫描对注入的 `docs/__gone__.md` 红；`pnpm verify` / `pnpm test` 绿；
- lead 的状态/恢复行为不变（现有 run 模板与手册断言不回归）。

## 修复关联

与 [BUG-221](BUG-221-runtime-skill-references-dev-check-file.md) / [BUG-223](BUG-223-runtime-skill-hardcodes-dev-workspace.md)
同批（发布文本 dev 引用）；建议先定「模型可见文本自足」的载体规则。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/presets/lead/skills/nodes-contract/SKILL.md",
    "packages/deep-research-pack/content/generic/state-and-recovery.md",
    "checks/lib/repo/shipped-surface.mjs",
    "tests/checks/shipped-surface.test.mjs",
    "tests/checks/navigability-contract.test.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/shipped-surface.test.mjs",
    "exit": 1,
    "output": "presets/lead/skills/nodes-contract/SKILL.md:10 随包文本引用开发面 docs/design/50-agent-loop-and-state.md"
  },
  "green": {
    "command": "node --test tests/checks/shipped-surface.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/repo/shipped-surface.test.mjs"
  }
}
```
