# 发布前数据契约：按 FAQ 26 对账后的取舍与落地

> 状态：implemented
> 来源：[发布前数据契约卡](../../_backlog/_archived/settled_issues/2026-10-27-release-data-contract.md)（含 D1–D4 拍板）与
> [证据 digest](../../_backlog/_archived/research/data-contract/2026-10-27-dsh-data-plane-digest.md)；
> 缺陷侧 = [BUG-044](../../_backlog/_archived/fixed_bugs/BUG-044-delivery-receipts-leak-absolute-paths.md)。

## 决定

1. **只借 FAQ 26 的契约纪律，不借它的存储方案。** 本包继续零 `storageDomain`、零 home 账本、零新增
   session event、零客户端持久化；run bundle（P2 用户可见文件）+ 会话日志（P1 派生）是既有正解。
   新增用户可读数据卡（pack README §Data）与卸载/备份/保留/权限/版本线五节，把「谁拥有、活多久、
   怎么删」写成当前合同。
2. **交付回执的路径是「bundle 内相对标签」，不是本机绝对路径。** `buildDelivered`/`presentGate`
   经 `portableBundlePath` 归一；`run-accept` 在写盘前校验待写文本、落盘后复检门禁/审计生成物；
   `--repair` 只修可再生产物（回执归一 + 删 acceptance/node-gate），历史 bundle 按 D28 epoch 不追改。
3. **种子状态是独立的 schema。** `.dsh-research-seed.json` 带 `schemaVersion`；旧态同形前移，
   更新的 scaffold 写的状态 fail loud；`--clean` 拒绝在「工作区记录比 pack 新」时删孤儿。
4. **破坏性动作必须显式。** `--clean --write --dry-run` 直接拒绝；sidecar 默认只报告，需
   `--discard-sidecars` 才丢弃；`--force` 不覆盖用户改过的 `.gitignore`（写 `.seed-new` 供合并）。
5. **承重依赖按层级披露。** agent-team 系在 `packages/experimental/`（N2），不是产品稳定性承诺；
   README §Compatibility 列 N0/N1/N2/E 表，`triggers.md` 登记上游毕业/改名/移除的重议条件。
6. **秘密面只扫交付物、只认高置信形态。** `secret-scan` 覆盖 final/receipts/audit/node-gate，
   输出只到 path/line/kind；证据默认不扫（安全题材的示例代码会误伤），`--all` 才加。
7. **字面量 `apiKey` 从插件 Config 移除。** 秘密只走 `apiKeyEnv` 引用 + credentials 服务；
   pre-1.0 直接删，避免 profile patch 里出现明文 key。

## 输掉的方案

- **为「run 索引 / 上次打开的 run」加 storage domain 或 home 账本**：会引入第二权威与
  「删工作区→孤儿」；现有 journal 绑定（`bundle-session` 的 `drt_<slug>/` 写强读弱）已是 P1 正解。
- **按 workspace 建 domain**：`defineDomain` 静态、一个名字只能开一次，不是 DSH 的能力；
  用 `workspaceId` 当长期键也会在删重加后失联。
- **给 run 文件加跨进程锁**：角色写文件不经插件代码，锁无法被角色遵守；只会制造「锁住但没防住」
  的假安全。保留文档声明「一 workspace 一实例」，不新增机制。
- **`--clean --write` 默认丢 sidecar**：sidecar 可能是用户唯一未合并的种子更新；默认删除是数据丢失，
  改为 `--discard-sidecars` 显式选择。
- **把 `secret-scan` 扩到 evidence/ 并硬红**：研究会引用安全题材的示例密钥，硬红会误伤正常交付；
  默认只扫读者拿到的面，`--all` 作维护者审计。
- **收窄 `engines.dsh` 到 rc.2**：数据面机制经 rc.2↔rc.3 diff 确认一致，真正的 rc.3 增量在客户端包；
  选择补 `compat-client-smoke` 而不是放弃已声明版本。
- **保留 `apiKey` 字面量并标注「仅调试」**：标注挡不住误配；pre-1.0 删除成本最低。

## 实际跑过的验证

- `pnpm verify` 全绿；`pnpm test` 896 通过（新增 secret-scan / portable path / seed schema /
  deploy-args / repair 用例；含先红后绿的负例留证）。
- 版本 `0.1.2 → 0.1.3`（行为变更）；`export-dist` 产出 0.1.3 tarball + 安装手册；`release-smoke` /
  `data-smoke` / `compat-smoke` / `compat-client-smoke` 全 PASS。
- `node scripts/smoke/scaffold-smoke.mjs` ALL PASS：`--clean` 报告/执行、dry-run 拒绝、
  versionAhead 拒绝、sidecar 默认保留、`.gitignore` 不被 `--force` 覆盖、schema 新版拒绝。
- `node scripts/smoke/compat-client-smoke.mjs` ALL PASS（rc.3）：真安装 → 真 web → headless chromium
  断言零 apply 失败、client bundle 取到、研究状态/研究配置页签可见可开。
- `node scripts/run-gates/secret-scan.mjs` 对现网 bundle：交付物 9 文件 / 全量 69 文件均干净。
- 现网 `drt_cn-open-vs-us-closed-agentic`：`run-accept --repair` 后绿、`path-hygiene` 干净（69 文件）、
  同一 bundle 第二次 `run-accept` 仍绿（幂等）；`delivered.json present.path` =
  `drt_cn-open-vs-us-closed-agentic/final/v1.md`。
- 复核轮（2026-10-27）：数据卡补「谁看得见/秘密」列与 `run.md` 声明行；凭据从会话行拆出；
  写明 E2 出网、不使用 attachments/spill/RAG、一通道一工作区、N2 peer 精度。新增
  `data-plane-invariants`（注入 `storageDomain` 红→还原绿）、`secret-scan-smoke`、坏 state
  fail-loud、clean 不碰 `drt_*`/方法库、活跃锁拒绝 clean 等证据；`pnpm test` 896。
- `node scripts/run-gates/path-hygiene.mjs` 对现网 bundle exit 0；`pnpm test` 的
  `node-gate-witness` 绝对/外部 present 两例先红后绿。

## 残余风险

- 现网旧 bundle 的历史绝对路径不追改（D28 grandfather）；新回执才受合同约束。
- `compat-client-smoke` 依赖本机全局 rc.3 + chromium；CI/无桌面环境会 exit 2（未跑 ≠ 通过）。
- rc.4/0.2.2、Desktop、多租户、自动 GC、同 workspace 双实例仍不支持；前两者为显式延后，
  后三者是 DSH/产品边界，已在 README 与 `triggers.md` 登记。
