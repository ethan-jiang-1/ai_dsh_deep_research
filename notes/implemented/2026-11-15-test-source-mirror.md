# 测试子目录按消费者接口分层（owner 轴）

> 状态：implemented
> 历史注记：决定 3 的「`tests/checks` 平铺（门禁车道）」于 2026-11-18 被
> [tests/checks owner 镜像](2026-11-18-tests-checks-owner-mirror.md) 取代（改为 `tests/checks/<owner>/`）；
> 本页其余决定仍有效。

## 决定

1. **研发面第一层轴 = owner**：`scripts/lib/{gates,ops,channel,harness,probes,tools,repo,shared,test-infra}/`。
   归位规则 = 最终调用它的命令家族；被 2+ 家族消费 → `shared/`；只服务记录/校验工具 → `tools/`；
   无入口消费者 → `test-infra/`。
2. **测试镜像**：`tests/run/<owner>/` 与源码同名；根层零平铺；跨切或只测 pack 折算的 spec 住 `shared/`。
   `tests/cockpit` 切 `client/`（`src/client` 纯逻辑）与 `lib/`（pack `src/lib` 折算）。
3. **入口目录不搬**：`scripts/{verify,smoke,run-gates,run-ops,dist,test}`、`dev/`、`probes/` 的对应物是
   车道与登记簿；`tests/checks` 平铺（门禁车道）、`tests/contracts` 不动。
4. **冻结层不改写**：`scripts/test-path-redirects.json` 登记旧→新；`md-links` 对缺失目标查簿
   （条目失真 / 目标悬空 / 未跟踪 = 红）。
5. **索引**：`tests/INDEX.generated.md`（生成器 `dev/render-test-index.mjs`，对账
   `tests/checks/test-index.test.mjs`）；镜像契约 `tests/checks/test-owner-mirror.test.mjs`
   （根层平铺 / 错位 / 空 owner 目录 = 红）。
6. **门禁归属判据**：spec 的 `scripts/lib` 依赖 owner ∈ {spec 目录, `shared`}；无依赖或只依赖
   `shared` 的跨切 spec 可住任一 owner（索引记录实际依赖面）。

## 输掉的方案

- **import 图分组**：只证依赖不证消费者；八个入口目录零 import 边。
- **源根镜像**（`tests/scripts-lib`、`tests/pack-lib`）：破六域语义与 D53「命名即车道」。
- **主语轴**（gate / session / audit…）：人读顺，但不是「谁在用」，agent 找命令仍要二次跳转。
- **改写冻结层链接**：违反冻结纪律；用登记簿，沿用 `archived-note-pointers` 先例。
- **合并 lib 小模块**：删除测试跑过——27 个 ≤60 行模块多为纯判据；合并撞 550 行上限并拆掉
  一域一文件的可 review 性。

## 实际跑过的验证

- `pnpm verify` 全绿（md-links 118 条经登记簿解析；doc-paths / align-ledger / backlog-liveness 同步）。
- `pnpm test` 全绿（checks 188，零 skip；spec 车道全绿）。
- `node scripts/smoke/gates.e2e.mjs --case md-links-redirect-stale,md-links-redirect-dangling,md-links-redirected`
  全绿（三案例先红后绿，案例表 127 条）。
- 红证：run 根平铺 spec → `test-owner-mirror` 红（`tests/run 根仍平铺 spec：__redprobe.spec.mjs`）；
  删一条索引行 → `test-index` 红（`漂移——重跑 node dev/render-test-index.mjs`）；还原后绿。
- 迁移量：166 文件（86 lib 模块 + 77 run spec + 1 helper + 2 `.cjs`）；442 条 import 重写；
  cockpit 97 条 import；登记簿 206 条；guard-ledger 19 + 10 条路径；asset-ledger 212 条重生成。
- 环境：测量基线 `686d4482` → 复核 `7421dc17` → 实施 `71e4776d` / `a81f9424` / `787e5914`。

## 残余风险与重议条件

- owner 随消费关系漂移 → 重跑 `node dev/render-test-index.mjs`；索引/镜像门禁红即提醒。
- `shared/` 27 个模块（31%）；超过 50% 时重估二级桶（`shared/<子簇>/`）。
- `pack src/lib` 家族化（原 Step 3）未做：它已 84% 同名，收益最小；触发 = 该树出现第二个跨域证据
  或名字漂移。
