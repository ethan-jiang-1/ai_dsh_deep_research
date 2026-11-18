---
status: 修复就绪
severity: P2
opened: 2026-11-18
---

# BUG-258：snapshot B 只比 skill-catalog，不比 SKILL.md 正文——skill 文案回归不会被任何回放抓到

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：修复就绪（自授权 P2：测试覆盖）
>
> 位置：[checks/lib/shared/replay-request.mjs](../../checks/lib/shared/replay-request.mjs) 第 95 行
> （`JUDGED_KINDS = system-prompt / agent-instructions / skill-catalog / runtime-context / time-context`）；
> 文档边界 = [snapshots/README.md](../../snapshots/README.md) 第 17/22 行（“skill 目录”）。
> 探索轮 = [模型可见语义卡](../issues/2026-11-18-model-visible-semantics.md)。

## 症状

`snapshot-replay` B 层比对的是 **skill-catalog**（技能名/描述/路径），不是每个 `SKILL.md` 的正文。
技能正文由模型按需加载，不进入初始组装请求；因此：

- 221–223 改了 `research-brief` / `nodes-contract` / `question-patterns` 的正文，B 仍绿；
- `preset.e2e` 只挂载，不读正文；
- `client-load`/快照 C 不涉及 skill 正文。

任何 skill 正文的语义回归（错误状态机/失效命令/矛盾纪律）都没有金标准。上一轮 221–223 的修复
本身就是正文变更；当时的“快照 B 未重录”并未覆盖正文。

## 分诊与授权

- 严重级：P2 — 模型可见文本的最大一块（skill 正文）无回放/金标准；不阻断运行，但内容回归静默。
- 表面 / 边界：snapshot B 覆盖 / ② 行为（模型可见文本）
- DSH 不变量：model-visible ⟺ tested；技能正文也是模型可见
- 触及面：none（测试覆盖）
- 授权：自授权（P2 修理型）
- 批：模型可见语义（第 4 轮）

## 复现

复现状态：稳定（读码）。

```sh
grep -n 'JUDGED_KINDS' -A 2 checks/lib/shared/replay-request.mjs
grep -n 'skill-catalog\|skill 目录' snapshots/README.md checks/smoke/snapshot-replay.entry.mjs
# 改任一 SKILL.md 正文（非 description）→ snapshot-replay B 绿
```

## 根因（已证）

B 的比对面来自 **request injections**（catalog 是注入面），skill 正文不在注入面；snapshot 场景
`source` 身份也只声明 catalog。于是“模型可见 = 初始请求”被当作全集，漏掉 on-demand 正文。

## 牵出的失败类

- 语义 C2/C7（模型可见但无测试）；与 254/250 同族。
- 类级方向 = skill 正文金标准（hash/全文）独立于 B；或把 skill 正文纳入 header/agent-instructions
  的派生面。不能只比目录。

## 修法

1. 新增 `skill-body` 比对面：遍历 `presets/*/skills/*/SKILL.md`，与场景 `source` 里的 hash/全文比对；
2. 变更时先红，`--update-skill-golden` 重录（只重录正文，不放宽）；
3. 或把正文纳入一个 keyless 的 `skill-contract` 快照（不依赖 boot）；
4. 测试：改一行正文 → 红；还原 → 绿。

## 修复判据

- skill 正文有金标准/哈希，正文变化 → 红；还原绿；
- 不把 catalog 与正文混为一份；`pnpm test` / snapshot-replay 绿。
