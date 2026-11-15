# pack src ↔ 测试按 domain 同名（方案 A）

> 状态：implemented

## 决定

1. **`src/lib` 切 7 个 domain**：`run`（9）/ `plan`（4）/ `events`（6）/ `method-library`（11）/
   `review`（1）/ `workspace`（3）/ `shared`（4），共 38 个 `.ts`；`faces.json` 留 `src/lib` 根
   （host/shared/client 三面清单是横切属性，不是模块）。
2. **测试同相对路径**：`src/lib/<domain>/x.ts` ↔ `tests/cockpit/lib/<domain>/x.spec.mjs`；
   `src/client/<sub>/` ↔ `tests/cockpit/client/<sub>/`；`src/<surface>/` ↔ `tests/pack/<surface>/`。
   跨切（i18n / client-pure-logic / defaults-ui）住 `tests/cockpit/shared/`；无主语产品合同住
   `tests/pack/contract/`；pack 脚本住 `tests/pack/scripts/`。
3. **术语避免撞义**：`events`（不用 `journal`——run bundle 已有 `journal.md`）、`workspace`、
   `shared`；不用 `presentation`（层名）、`surface`（DSH `app surface`）、`ui`/`view`（纯数据）。
4. **`src/client` 子目录不改名**（页签名），只让测试对齐；`src/*/index.ts` 与 `exports` 不动。
5. **跨根例外登记**：`tests/contracts`（`markdown-mask`）与 `tests/run`（`review-readiness`）允许测
   pack 模块；不为字面对齐搬走 scripts/contracts 域测试。`tests/cockpit/lib/review/` 因此可空。
6. **门禁**：`pack-mirror` 钉根层零平铺、spec 依赖 domain ∈ {目录, shared}、`src/lib` 根零 `.ts`、
   `faces.json` 留根、client 子目录与 pack surface 同名；`src-lib-faces` 改递归 + 相对路径；
   `test-surface` 的 pack 覆盖改递归；`tests/INDEX.generated.md` 扩到 pack lib + client。

## 输掉的方案

- **`journal/`**：与 run `journal.md` 撞义。
- **`presentation/`**：层名不是 domain；把默认值/标题与 i18n/文本混成一桶。
- **`surface/`**：与 DSH `app surface` 撞义。
- **技术形态名**（fold/ui/bundle）：新模块会持续落错。
- **按 client 页签切 lib**：`events`/`run` 同时喂多页签，会逼出「共享页签」假 domain。
- **改 client 子目录名**：连带 keys/文案/docs，成本高收益低。
- **把 `tests/run` / `tests/contracts` 的 pack 相关 spec 搬进 cockpit**：会破坏 scripts/contracts 域的
  主语归属，只为字面对齐。

## 实际跑过的验证

- `pnpm verify` 全绿（登记簿 312 条；`cockpit-doc-registry` / `doc-paths` / `md-links` / `backlog-liveness`）。
- `pnpm test` 全绿（checks 189+，零 skip）；`pnpm typecheck` 通过（`tsc -b packages/deep-research-pack`）。
- 迁移量：Step 1 = 58 文件（38 lib + 20 spec）+ 281 条 import；Step 2 = 10 spec（`client/<sub>` 与
  `shared/`）；Step 3 = 38 spec（surface / contract / scripts / 4 个 lib 依赖件迁 cockpit）。
- 红证（`pack-mirror`）：run 根平铺 spec → 红（`tests/cockpit/lib 根仍平铺 spec`）；run spec 放进
  plan/ → 红（`住 plan/，但只依赖 run`）；`src/lib` 根放 `.ts` → 红（`根仍平铺模块`）；还原后绿。
- 环境：HEAD `ef23c213`（RFC）→ `09e98025`（Step 1）→ `3f77b3e7`（Step 2）→ `867de359`（Step 3）。

## 残余风险

- `shared/` 4 件、跨根例外 2 处；例外超过 5 条或 `shared` 超过 6 件时重估规则。
- `faces.json` 仍按 basename 对账，依赖「src/lib 内 basename 全局唯一」；出现同名域文件时改为相对路径。
- 未来 domain 预留 `evidence/`、`protocol/`、`lens/`；新模块不得塞 `shared/` 了事。
- `tests/pack/contract/` 仍可 import 源码（host 入口件如 `method-library-io`），「contract 不 import
  源码」不是硬规则——合同 = 无单一 surface 主语的产品合同。
