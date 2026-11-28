---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-466：`evidence-audit` 不跟随 `web_fetch` spill 文件且未剥 HTML/行内链接/省略号分片，误报 11 条 `MAJOR [转写不符]`

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

`node checks/run-gates/evidence-audit.mjs research-workspace/drt_huawei-ascend-dd` 对 `drt_huawei-ascend-dd` 报出 11 条 `MAJOR [转写不符]`（`web 语料覆盖率 0.00–0.50`），涉及 `t4-reg-hbm-3a090c.md`（×4）、`t4-reg-sme-eccn.md`（×2）、`t4-eda-reg-ecad-enduse.md`（×2）、`t3-f-price-history.md`（×1）、`t2-04-forecast-shares-trendforce-bernstein.md`（×1）、`t2-06-cambricon-positioning.md`（×1）。
逐一核对原始会话日志发现，**全部 11 条摘录均真实出现在本 run 抓回的网页原文中**，并非幻觉或编造。

## 分诊与授权

- 严重级：P1 — 正常读取超长网页（spill 文件）或带行内链接/HTML 碎片的来源会被审计工具批量打成 `MAJOR [转写不符]`，降低 `audit.md` 信噪比。
- 表面 / 边界：`checks/lib/gates/evidence-audit-core.mjs` / L0 门禁核
- DSH 不变量：verify the world（量具与真实运行时产物对齐）
- 触及面：门禁与验收合同 — 修改 `evidence-audit-core.mjs` 语料与归一化逻辑
- 授权：等人拍板（触及门禁与验收合同）
- 批：2026-11-28-run-fidelity-and-gate-accuracy

## 复现

复现状态：稳定 — `source tools/env.sh && node checks/run-gates/evidence-audit.mjs research-workspace/drt_huawei-ascend-dd`
边界：审计核心 (`evidence-audit-core.mjs`) — 实跑 `evidence-audit.mjs` + 对照 `analyst-a` / `analyst-b` / `analyst-c` 会话日志

```sh
source tools/env.sh && node checks/run-gates/evidence-audit.mjs research-workspace/drt_huawei-ascend-dd
# 输出：摘录回溯 258/283（复合 14 / 不符 11），其中 11 条 MAJOR 全为已知假阳性模式
```

## 根因（假设 → 已证）

对照 `evidence-audit-core.mjs` 与会话日志（`1b7bee9a`、`e6bd0b27`、`1c8add3d`）证实三类机制盲区：
1. **`web_fetch` 50KB 截断 spill 文件盲区（8 条）**：`analyst-b` `seq=77` 抓取 Federal Register `2024-28270` 时，`web_fetch` 返回前 50KB 并将完整 152KB 落盘到 `/var/folders/.../dsh-spill-.../08d97ee22ace-web_fetch.txt`，随后 `analyst-b` 通过 `read`/`grep`（`seq=84` 等）读取该 spill 路径得到 `Based on the importance of HBM`、`3B001.c.3` 等原文。但 [evidence-audit-core.mjs](../../../checks/lib/gates/evidence-audit-core.mjs)（`L177`）的 `buildCorpus` 只纳入 `web_fetch`/`web_search`/MCP 的 `tool/result`，既未把对**已登记 `web_fetch` spill 路径**的 `read`/`grep` 结果纳入语料，也未读取仍存在的 spill 文件。
2. **HTML 内联标签残余（1 条，`t3-f`）**：`analyst-a` `seq=291` 抓取 `support.huaweicloud.com` 时网页含 `<span style="color:#1f1f1f;">`，`normalize()`（`L95`）未剥 HTML 标签，使 `规格：ModelArts昇腾AI加速型(B1)1卡实例` 对 `规格：<spanstyle=color:1f1f1f;modelarts...` 仅覆盖 `0.50`。
3. **句内 Markdown 外链与 `…` 省略号（2 条，`t2-04`/`t2-06`）**：`t2-04` 原文含 `寒武紀 ([688256-CN](https://www.cnyes.com/...))`，剥掉链接后的干净摘录在带 URL 的原始串上分片失配（`0.38`）；`t2-06` 摘录 `风险提示：…客户集中度较高风险等` 刚好 16 字，因中间含 `…` 切碎两个子串而无一满足 `N=16` shingle（`0.00`）。
- 根因证据：实测 `1b7bee9a` `seq=77/84`、`e6bd0b27` `seq=291`、`1c8add3d` `seq=132/181` 原始日志载荷与 `normalize()` 输出。
- DSH 不变量：不适用。

## 牵出的失败类

- 同机制第 1 次（前例对反斜杠与装饰引号做过 `normalize` 补丁，见 `evidence-audit-core.mjs:91-95`，但未覆盖 spill 路径、HTML 标签及 markdown 行内超链接）｜处置：类修

## 修法

1. 在 `buildCorpus` 中记录 `web_fetch` `tool/result` 声明的 `Full formatted result stored at: <spillPath>`，把针对**这些已登记 spill 路径**的 `read`/`grep` `tool/result`（或仍存在的对应 spill 文件）纳入 `webChunks`（注意仍严格隔离 agent 写盘路径，防止自证）；
2. `normalize()` / 网页语料视图在匹配前剥离 markdown 行内超链接目标（只保留锚文本）与内联 HTML 标签（`<...>`）；对含 `…`/`...`/`[…]` 的摘录按省略号拆段各自做子串/shingle 匹配。

## 修复判据

1. `web_fetch` spill 读取、行内超链接剥链、HTML 标签夹杂、`…` 分段四类夹具在 `tests/evidence-audit.spec.mjs` 全部命中；
2. 负控：针对任意非 spill 本地文件的 `read` 仍不得进入 `webChunks`（保持防自证红线），真实捏造文本仍判 `转写不符`。

## 修复关联

去向：implemented — [2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/evidence-audit-core.mjs",
    "tests/run/gates/evidence-audit.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/run/gates/evidence-audit.spec.mjs",
    "exit": 1,
    "output": "BUG-466 evidence-audit: 4 false-positive 转写不符 on web_fetch spill read, HTML tags, inline/paren links, and ellipsis quotes"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/run/gates/evidence-audit.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/evidence-audit.spec.mjs"
  }
}
```
