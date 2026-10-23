---
topic: P5 溯源与可移植
intent: 记录 provenance 离线证明、local-file 哈希、manifest 生成与新 run 卫生扫描的落地与验收
---

# P5：溯源 / 可移植

> 消费者：[_backlog/issues/2026-10-23-run-bundle-agent-state-and-read-chain.md](../../_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)
> ｜ 2026-10-23 ｜ 新 run 才受约束；旧场 grandfather，不补 provenance/manifest。

## 1. 落地

| 面 | 改动 |
|---|---|
| provenance 校验 | 新增 `scripts/lib/provenance.mjs`：`kind` 闭集 web/local-file/command；local-file 的 `path` 必须相对、`sha256` 必须匹配；缺 `retrieved_at`/`channel`、非法 JSON、孤儿、绝对路径各报 finding |
| 审计集成 | `evidence-audit-core` 读 `provenance/`：valid local-file 的 `file://` 源不再判“伪造”，新 run 无 provenance 的 `file://` 记 MAJOR；语录料时零命中从 MAJOR 降为 INFO（以 provenance 离线复算），仍不冒充会话审计 |
| manifest | `run-accept` 绿后生成 `manifest.json`：contract / readOrder / 顶层文件角色 + sha256 / final/vN / evidence/provenance 计数；acceptance 增一行 |
| 新 run 卫生 | `schema-scan.hygieneOf`：有 run.md 的新 run 扫绝对路径 `/Users/`、`../drt_`、跨 bundle `[来源:]`，核心违约；旧场不扫 |
| 反证 | `tests/run/provenance.test.mjs` 3 例（哈希/孤儿/绝对路径/非法 kind / 离线审计）；`schema-scan.test` 增卫生例；`tests/run/evidence-audit.test` 15 例仍绿 |

## 2. 验收（2026-10-23）

- `pnpm verify`：全绿（2026-10-23 复跑）。
- `pnpm test`：**677 pass / 0 fail**。
- **离线审计实测**：临时 bundle 的 `file://` 源 + valid `provenance/x.json` + 空 sessions → `auditBundle` criticalCount 0，访语料零命中为 INFO；篡改 sha256 → CRITICAL。
- **manifest 实测**：`/tmp` 绿跑 `run-accept` → `manifest.json` 在场；`contract=2026-10-23`、readOrder 首项 `run.md`、顶层文件 8 条 + final/v1；acceptance 增“清单”行。
- 旧场：53 个 bundle 零写入；旧 `file://` 仍按旧审计口径（历史不下架、不追改）。

## 3. 未跑 / 边界

- `provenance/` 无独立模板文件；字段契约在 `scripts/lib/provenance.mjs`，手册读序/写入序 P7 落。
- `manifest.json` 在 acceptance 之前生成，故 manifest 不含 acceptance 自身；acceptance 是操作回执，不是研究状态。
- `file://` 的旧场（semver 等）仍是历史告警，不修；新 run 才有 provenance 要求。
- L1/L2、snapshot 重录、盲测 baseline：P7/P8。
