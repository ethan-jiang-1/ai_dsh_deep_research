# 2026-11-16 · smoke-child-paths 豁免 vendor 构建产物 lib/

> 状态：implemented

## 决定

- `tests/checks/smoke-child-paths.test.mjs`（批 F BUG-192/193 类级守卫）的 `GENERATED` 豁免只免 `runtime/_dist/node_modules/` 与 **pack** 构建产物 `packages/deep-research-pack/lib/`，漏免 **vendor** 构建产物 `vendor/dsh/**/lib/`。`dev/run-driver.mjs` 的 `join(ROOT,'vendor','dsh','apps','cli','lib','bin.js')` 指向 vendor-build 后才在场的产物 → 在 fresh clone（无 vendor 构建）上 `existsSync` 假 → 守卫红。
- 修：`GENERATED` 增 `^vendor\/dsh\/.+\/lib\/` 豁免（与 pack lib 同类——keyless 合同 = fresh clone 无 vendor 构建也能跑，ci.yml keyless job 无 vendor-build 步骤却跑 `pnpm test`）；头注同步写明 vendor 构建 lib 豁免理由；负控测试增一条 vendor-lib synthetic 豁免断言（常驻复证）。
- 这是暖树绿掩盖的 clean-clone/CI 红：作者树 vendor 已构建故绿，HEAD ahead origin 未 push 故远程 CI 尚未见到；clean clone 真跑才暴露。

## 输掉的方案

- **给 CI keyless job 加 vendor-build 步骤**：违背 keyless「fresh clone 无构建也能跑」合同（ci.yml 明写 typecheck 才需 vendor 构建、放 deploy job），把构建成本摊到每次回归。放弃。
- **改 run-driver 的 vendor cli 路径**：路径本身正确（运行期就是 boot vendor 构建 bin），缺的是「构建产物不在 keyless 断言范围」的豁免，不是路径错。放弃改路径。
- **删/弱守卫**：会丢失 BUG-192/193 的搬家断链保护（子进程 argv 不在 import 图上）。放弃；只补豁免边界。

## 实际跑过的验证

- **红（真实 clean clone 形态）**：`/tmp/drp-cleanclone`（git clone 本地 + submodule b830ec950f + `pnpm install --frozen-lockfile`，无 vendor 构建）`pnpm test:checks` → `smoke-child-paths` FAIL：`dev/run-driver.mjs: join(ROOT,'vendor','dsh','apps','cli','lib','bin.js') -> … 不存在`（212/213）。
- **绿**：补豁免后暖树 `pnpm test:checks` 213/213；同一修复同步到 clean clone 复跑 `pnpm test:checks` 213/213。clean clone 首跑全链：install 0 / verify 58 门禁全绿 / spec 1365 全绿 / checks 213 全绿。
- 负控常驻：`scanChildPaths` synthetic vendor-lib 路径 → `checked == []`（豁免生效）；原有不存在路径必红、runtime/目录不误伤负控保留。
- **未跑**：远程 CI keyless 真跑（HEAD ahead origin 未 push，只读不可见 remote runs）；记 U，不写成绿。
