# tools/release/ · 分发与移交（operate：act）

> 装什么：pack → `_dist/` tarball / 安装手册 / staged 市场索引；HEAD tracked 源 → 干净移交包。
> 不装什么：不装发布前裁决（→ `checks/release/release-check.mjs`）。
> `release/product-manual.md` 是手册源（数据，非面）；生成物一致性由 `dist-manual-fresh` / `dist-freshness` 把守。
>
> 逐件职责与档位 = [tools/README](../README.md)（单一索引，本页不复制）；面规则 = [surface-contract](../../docs/policy.md)。
