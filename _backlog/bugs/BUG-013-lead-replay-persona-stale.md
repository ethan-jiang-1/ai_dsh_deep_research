# BUG-013：Lead 回放 persona 金标准未包含既有 HITL1 零例外规则

> 严重级别：P2｜发现：2026-10-05｜状态：活跃

## 症状

`source dev/env.sh && node scripts/snapshot-replay-smoke.mjs` 的 Lead B1 persona 全文比对失败。
其余三角色 A/B、Lead A/B2 与 C 浏览器渲染金标准通过。

## 根因（源码核对）

[Lead preset](../../packages/deep-research-pack/presets/lead.patch.yml) 包含既有的“HITL1 零例外”与 ask 约束规则，
录制的 [Lead 语料](../../tests/fixtures/snapshot-research-face/session.v4.jsonl) 仍是较旧 persona。首个差异位于第 473 字符。
本次目录治理未修改该 preset（`git diff --exit-code HEAD -- packages/deep-research-pack/presets/lead.patch.yml` 通过），
因此本次浏览器/折算改动不是该 B1 差异来源。

## 复现

运行完整 snapshot-replay-smoke，结果 1 FAILURE：`[lead] B1 组装请求 · persona 全文一致`。
当前 persona 在推荐项硬格式规则后含“HITL1 零例外”，录制文本直接进入“三问固定为”。

## 牵出的失败类

模型可见文本更新后录制输入与金标准未同步。A 通路与 C 渲染绿不能抵消 B 层组装文本红；
仅重写渲染期望或归一化差异都不能修复录制文本与当前合同的错位。

## 修复关联

[目录与入口治理 Note](../../notes/implemented/2026-10-05-project-navigability.md) 记录本次运行结果。
需要按 [开发环回放规则](../../docs/guides/60-dev-loop.md) 重新录制对应场景、审查模型可见文本与渲染期望，
再以 A/B/C 全绿确认；本次保留红证，未修改录制语料或放宽比较器。
