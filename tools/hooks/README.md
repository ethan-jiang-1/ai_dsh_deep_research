# tools/hooks/ · 提交门禁（judge —— tools/ 内的唯一例外）

> 装什么：pre-commit：whitespace + verify + keyless tests，红灯拦 commit。
> 不装什么：不装 operate 入口；钩子的产物是裁决，故面 = judge（例外登记 = [surface-contract §5](../../docs/guides/68-surface-contract.md)）。
> 激活 = `source tools/env.sh`（幂等 `git config core.hooksPath tools/hooks`）；未激活由 `hooks-active` 门禁点名。
>
> 逐件职责与档位 = [tools/README](../README.md)（单一索引，本页不复制）；面规则 = [surface-contract](../../docs/guides/68-surface-contract.md)。
