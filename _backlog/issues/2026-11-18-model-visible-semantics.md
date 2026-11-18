---
status: 推敲中
opened: 2026-11-18
---

# 推敲：模型可见语义的「发了但没验」面（2026-11-18 第 5 轮）

> 立卡：2026-11-18 ｜ 状态：推敲中（第一轮已跑；10 张卡 250–259） ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> **一句话**：路径/集合/安装面的 bug 已经修完；这一轮专挑**模型可见但机械判据薄**的语义面：
> 模板声明的字段有没有消费者、值域有没有闭集、critic 的覆盖表有没有门、skill 正文有没有金标准、
> probe 缓存键有没有覆盖探针自己。10 张卡，只报不修。
>
> 前序 = [命名空间搬家](../_archived/settled_issues/2026-11-17-exploratory-namespace-move.md) ·
> [运行时/开发边界](../_archived/settled_issues/2026-11-17-runtime-dev-boundary.md) ·
> [运行时依赖/安装](../_archived/settled_issues/2026-11-17-runtime-deps-install-boundary.md) ·
> [搬家残差 II](../_archived/settled_issues/2026-11-18-move-residuals.md)（209–249 已修复归档）。

**问题与期望结果：** 过去几轮把“发布物/路径/依赖/安装”收得很紧，但**模板/技能/审计**里还有一类
“声明了但没人验”的语义：

- evidence 模板/手册说八字段，审计是否真的八字段都查？值域是否查？
- findings 的 gap 四态、topics 的 scope_role 四值、review 的 topic×lens 覆盖表，是否有闭集消费者？
- protocol.output.sections 在 question 投影里被查，final 里是否被查？
- critic 的 CRITICAL/MAJOR 与 audit.md 是否对账？
- skill 正文（on-demand 模型可见）有没有快照金标准？
- probe 缓存键是否覆盖了探针驱动本身？

**当前情况：**

- 240–249 已由 `b58395c0` 修复归档；active bugs 为空。
- `pnpm verify` / `pnpm test` 绿；`pack.e2e` 86 条目绿；`snapshot-replay --layers b` 与 `--layers c` 均 ALL PASS
  （第一次 exit 2 是 dev profile 镜像漂移，重建后通过——不是快照过期）。
- 发现：`evidence-audit` 只查硬五 + 软二；`lens` 完全不查，`quality`/`source_tier` 只查在场；
  `findings.gap` 只被模板契约的 `\S+` 查；`scope_role` 只消费 primary/comparison；review 覆盖表/severity
  没有门；`protocol.output.sections` 只对 question 投影；`lens_gaps` 无消费者；snapshot B 只比 catalog；
  probe 缓存键只含 3 个 shell 文件。

**未决问题：**

- 这些语义是“技能纪律”还是“机械契约”？若是后者，模板字段必须逐一有消费者（250–257）。
- 旧 bundle 断代：`run.md` 在场/契约日之前不追补；新 run 从严。
- skill 正文金标准用 hash 还是全文？快照 B 的“模型可见 = 初始请求”边界是否要扩到 on-demand 正文（258）。
- probe 缓存键的驱动源清单：显式清单还是 import 闭包（259）。

**下一步：** 250–257 触门禁/验收合同，`等人拍板`；258/259 为测试/运行态，`修复就绪`。本轮不改产品代码。

## 判据：三层

| 层 | 判据 | 卡 |
|---|---|---|
| 模板字段 → 消费者 | 模板/手册声明的每个字段至少有一个门/解析器消费；闭集字段有值域 | 250–253 / 255–257 |
| critic 结构化面 | review 的覆盖表/severity 与 readiness 同级可核 | 254 / 257 |
| 模型可见覆盖/运行态 | skill 正文有金标准；probe 缓存键覆盖驱动 | 258 / 259 |

## 执行记录（2026-11-18，keyless，0 模型）

| 卡 | 层 | 严重级 | 状态 | 一句话 |
|---|---|---|---|---|
| [250](../bugs/BUG-250-evidence-lens-field-not-audited.md) | 字段 | P2 | 等人拍板 | evidence 八字段里的 `lens` 从未被审计 |
| [251](../bugs/BUG-251-evidence-quality-tier-value-domains.md) | 值域 | P2 | 等人拍板 | `quality: Z` / `source_tier: foo` 只查在场 |
| [252](../bugs/BUG-252-findings-gap-four-states-ungated.md) | 值域 | P2 | 等人拍板 | findings `gap` 四态只查非空 |
| [253](../bugs/BUG-253-topics-scope-role-unknown-escapes-coverage.md) | 值域 | P2 | 等人拍板 | `scope_role` 拼错静默逃出 L2 覆盖 |
| [254](../bugs/BUG-254-review-lens-coverage-table-ungated.md) | review | P2 | 等人拍板 | critic 要求 topic×lens 表，门禁不读 |
| [255](../bugs/BUG-255-protocol-output-sections-not-in-final.md) | 输出 | P2 | 等人拍板 | `output.sections` 只对 question 投影，final 可换节 |
| [256](../bugs/BUG-256-findings-lens-gaps-no-consumer.md) | lens | P2 | 等人拍板 | findings `lens_gaps` 无消费者 |
| [257](../bugs/BUG-257-review-severity-not-cross-checked-with-audit.md) | review | P2 | 等人拍板 | review CRITICAL/MAJOR 与 audit.md 不交叉 |
| [258](../bugs/BUG-258-snapshot-skill-body-not-covered.md) | 覆盖 | P2 | 修复就绪 | snapshot B 只比 skill-catalog，不比正文 |
| [259](../bugs/BUG-259-probe-cache-key-excludes-driver.md) | 运行态 | P2 | 修复就绪 | probe 缓存键不含 run-driver/探针实现 |

## 基线与负对照

- `pnpm verify` / `pnpm test` 绿；`pack.e2e` 86 条目；snapshot B/C 全绿（重建 profile 后）。
- 临时 evidence bundle（无 `lens`、`quality: Z`）→ `auditBundle` 无 lens/quality finding（现场见 250/251）。
- 模板契约：`gap` 只 `\S+`（252）；`node-gate` 只对 primary/comparison 算覆盖（253）。
- `grep lens` gates：只有 topics/protocol，无 review 表（254）；`grep lens_gaps` 无消费者（256）。
- `protocol-audit` 的 sections 对账只取 question §Protocol（255）；`final` 首屏六节是另一份 `presets.test`。
- `snapshot-replay` B 的 `JUDGED_KINDS` 不含 skill 正文（258）；`DEV_SHELL_FILES` 3 项（259）。

## 覆盖地图

| 面 | 状态 | 判定 |
|---|---|---|
| evidence 八字段/值域 | 已探 → 2 卡 | 250 / 251 |
| findings gap/lens_gaps | 已探 → 2 卡 | 252 / 256 |
| topics scope_role | 已探 → 1 卡 | 253 |
| review 覆盖表/severity | 已探 → 2 卡 | 254 / 257 |
| protocol output sections | 已探 → 1 卡 | 255 |
| skill 正文金标准 | 已探 → 1 卡 | 258 |
| probe 缓存键 | 已探 → 1 卡 | 259 |
| 快照 A/B/C | 已关闭 | B/C 全绿；profile 重建后无过期 |
| 模板 JSON schema | 已关闭 | protocol-core 值域/形状绿 |
| 生成账本/类型闭包/索引 | 已关闭 | probes 18 支一致；test-index up to date；pack.e2e 类型闭包绿 |
| 客户端 locale/keys | 已关闭 | i18n/client-locale/cjk-source 通过 |
| 安装/clean-room | 已关闭 | cold-start 6.6s GREEN；pack.e2e 86 |
| claims/verdicts | 已关闭 | 逐字/finalRef/coverage/readiness 已有门 |

## 覆盖面补记（goal 轮，2026-11-18）

- **生成账本 / 类型闭包 / 索引**：`probes/_index.mjs --check` 一致（18 支）；`render-test-index --check`
  up to date；`pack.e2e` 类型闭包/夹具/86 条目绿；asset-ledger / guard-ledger 测试绿；`pnpm verify` 绿。
  未发现新 bug，关闭。
- **客户端 locale / keys**：`i18n.spec` / `client-locale.spec` / `cjk-source.test` 通过（裸 `node --test`
  不加载 tsx loader 时会在 `views.tsx` 报 `ERR_UNKNOWN_FILE_EXTENSION`，这是命令缺 loader，不是产品 bug；
  `pnpm test:spec` 用 tsx loader）。未发现新 bug，关闭。
- **快照 A/B/C**：重建 dev profile 后 B/C ALL PASS；第一次 exit 2 = profile 镜像漂移（14 项），按提示重建后
  通过——不是快照过期。关闭。
- **安装 / clean-room**：`cold-start` 6.6s GREEN（仓外 home + 钉版 DSH + tarball）；240–249 已修；
  `pack.e2e` 86 条目绿。关闭。
- **运行时缓存 / 并发**：259 是唯一新卡（probe 缓存键不含 driver）；profile 守卫/直起已由 237/242/243 覆盖。
- 本轮 10 张卡（250–259）即完整；生成/账本/locale 面没有为凑数开卡。

## 验收标准

1. 250–259 全部有复现/证据/修法；模板字段→消费者/值域/review/覆盖四层有判定。
2. 语义门扩展有正反控；实例卡可逐条修。
3. `pnpm verify` / `pnpm test` 绿；本轮不改产品代码。

## 关闭条件

- 10 张卡有去向；250–257 的“技能纪律 vs 机械契约”决策落定；258/259 落地；
- 覆盖地图更新；审查记录 `审查：agent｜用户｜跳过 — 理由`。

## 范围与排除

**范围**：`content/templates/run/*`、`content/generic`、`presets/*/skills`、`checks/lib/gates`、
`checks/run-gates`、`checks/lib/shared/replay-request.mjs`、`snapshots/replay`、`tools/channel/run-driver.mjs`。
**排除**：改产品代码/发布配置；真模型；重跑 209–249 已闭面；把技能散文当机械契约（除非本卡明确）。

## 判据形状

不适用（本卡不改产品判据；三层判据 = 上表；各卡修复判据自理）。
