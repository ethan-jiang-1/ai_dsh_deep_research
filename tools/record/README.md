# tools/record/ · 录制与生成器（operate：act）

> 装什么：fixture / CI oracle / 测试资产账录制，overlay 与测试索引生成。
> 不装什么：不装裁决（→ `checks/`）、只读投影（→ `probes/`）；录制品的**判定标准**归 `tests/` 与 `snapshots/`，本组只产资产。
> `record/research.overlay.yml` 是生成物（勿手改，重生成 = `node tools/record/render-overlay.mjs`）。
>
> 逐件职责与档位 = [tools/README](../README.md)（单一索引，本页不复制）；面规则 = [surface-contract](../../docs/guides/68-surface-contract.md)。
