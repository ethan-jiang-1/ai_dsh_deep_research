# BUG-013：Lead 回放 persona 金标准未包含既有 HITL1 零例外规则

> 严重级别：P2｜发现：2026-10-05｜状态：已修复（2026-10-05 重录转绿：B1 站立红 → 录制器补 lead → 真模型重录 + 人审 → 4 场景 ALL PASS）

## 症状

`source dev/env.sh && node scripts/snapshot-replay-smoke.mjs` 的 Lead B1 persona 全文比对失败。
其余三角色 A/B、Lead A/B2 与 C 浏览器渲染金标准通过。

## 根因（源码核对）

[Lead preset](../../../packages/deep-research-pack/presets/lead.patch.yml) 包含既有的“HITL1 零例外”与 ask 约束规则，
录制的 [Lead 语料](../../../tests/fixtures/snapshot-research-face/session.v4.jsonl) 仍是较旧 persona。首个差异位于第 473 字符。
本次目录治理未修改该 preset（`git diff --exit-code HEAD -- packages/deep-research-pack/presets/lead.patch.yml` 通过），
因此本次浏览器/折算改动不是该 B1 差异来源。

## 复现

运行完整 snapshot-replay-smoke，结果 1 FAILURE：`[lead] B1 组装请求 · persona 全文一致`。
当前 persona 在推荐项硬格式规则后含“HITL1 零例外”，录制文本直接进入“三问固定为”。

## 牵出的失败类

模型可见文本更新后录制输入与金标准未同步。A 通路与 C 渲染绿不能抵消 B 层组装文本红；
仅重写渲染期望或归一化差异都不能修复录制文本与当前合同的错位。

## 修复关联

[目录与入口治理 Note](../../../notes/implemented/2026-10-05-project-navigability.md) 记录本次运行结果。
需要按 [开发环回放规则](../../../docs/guides/60-dev-loop.md) 重新录制对应场景、审查模型可见文本与渲染期望，
再以 A/B/C 全绿确认；本次保留红证，未修改录制语料或放宽比较器。

## 修复关联（2026-10-05 修复，D23 站立红转绿）

- **站立红起点**：`snapshot-replay-smoke --scenario lead` = B1 persona 红（其余 A/B2/C 绿）——判据在修复前确实在红；
- **录制器补 lead 支持**（修复前置缺口：`ROLE_PROMPTS` 原无 lead、显式"不重录"）：lead 探针 = 2026-09-30 首录原文复用（同探针 → 会话形状同构 → 金标准漂移最小化）；lead fixture 住场景根（历史落点）；根 snapshot.yml 常驻契约不随重录改写；在场守卫先实测自拒一次再删旧录；
- **重录**（真模型档）：`git rm` 旧 session.v4.jsonl（替换 diff 可审）→ `record-role-fixture --role lead` → 哨兵落定 + 日志静默 → 新 fixture 入库；
- **人审**：①persona 合同在场——B1 全文一致（9505 字）即机械证（HITL1 零例外 + ask 硬约束随当前 persona 录入）；②C 金标准 diff 人审——窄带保持（web_search 卡标题「检索：DSH harness」钉住；活动行随新录制如实重写，比较器未动、无放宽——金标准只许重写不许归一化凑绿的既定纪律）；
- **终验**：`snapshot-replay-smoke` **ALL PASS**（4 场景 A 回放 + B 组装请求 diff + C lead 渲染金标准）——回放面 keyless 钉恢复；
- 副作用自知：录制在 dev home 留一次性探针会话（可按「观察面录制探针」标题清理——同其余角色探针会话的定期清理惯例）。
