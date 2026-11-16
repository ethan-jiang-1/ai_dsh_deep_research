# tools/build/ · 环境冷启动与 vendor 构建（operate：act）

> 装什么：独立环境冷启动前置、vendor 树构建。
> 不装什么：不装 run 通道（→ `tools/channel/`）、裁决（→ `checks/`）。
> `build/vendor-host-bundle.config.ts`、`build/vendor-host-typert.config.ts`、`build/vendor-typert-emit.mjs` 是构建配置/产物生成（非面管道件）。
>
> 逐件职责与档位 = [tools/README](../README.md)（单一索引，本页不复制）；面规则 = [surface-contract](../../docs/guides/68-surface-contract.md)。
