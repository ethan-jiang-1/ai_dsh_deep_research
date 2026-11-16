# tools/channel/ · run 通道与驱动（operate：run + 会话驱动 act）

> 装什么：起/复用 run 通道、验面与呈交、建会话发 kickoff、HITL 代答、LLM socket 隔离预载。
> 不装什么：不装裁决（→ `checks/`）、只读投影（→ `probes/analyze/`）、导出与清理（→ `tools/release/`、`tools/clean/`）。
> `channel/llm-socket-isolation.cjs` 是预载驱动（非面）；其余为 operate 入口。
>
> 逐件职责与档位 = [tools/README](../README.md)（单一索引，本页不复制）；面规则 = [surface-contract](../../docs/guides/68-surface-contract.md)。
