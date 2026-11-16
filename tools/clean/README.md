# tools/clean/ · 运行区清理（operate：act）

> 装什么：运行区保留期清理：默认 dry-run，`--yes` 才删。
> 不装什么：不装自动 GC（删除是用户显式动作）；不碰 harness-home / research-workspace / scenes。
> 判据核 = `checks/lib/ops/runtime-clean-core.mjs`；白名单与保留期 = [runtime/README](../../runtime/README.md)。
>
> 逐件职责与档位 = [tools/README](../README.md)（单一索引，本页不复制）；面规则 = [surface-contract](../../docs/guides/68-surface-contract.md)。
