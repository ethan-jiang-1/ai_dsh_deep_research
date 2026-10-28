# 数据面收口：执行者、时间与可移植性（FAQ 24 对账后的落地）

> 状态：implemented
>
> 来源：[数据面收口问题卡](../../_backlog/_archived/settled_issues/2026-10-28-data-plane-hardening.md)；决定 = [D32–D36](../../docs/decisions.md#d32)；合同 =
> [guides/65 §2](../../docs/guides/65-run-forms.md) + [研究手册](../../research-workspace/AGENTS.md) + pack README §Data。

## 决定

**一句话：插件数据面的平面没画错，错在「谁执行契约」「时间从哪来」「事实能不能带走」。**
本轮把这三处从散文变成可核对的事实，并把两块承诺改成它能兑现的样子。

- **D32 时间原生化。** 四个 preset 各挂 `@deepseek-ai/dsh-time-context`（DSH 原生：每步注入 ISO
  时间 + 时区 + 耗时）。手册 §日期最小契约 从「网页/文件校准」改成「以读数为准，无读数如实写
  不确定」。理由不是"更优雅"：archive 扫描已有 **4 处 journal 未来日期**（2027-04-30 /
  2027-09-22 / 2026-11-02 / 2030-12-31）——散文纪律的漏损是实测的，而原生读数把它变成结构性消失。
  `maxBytes` 同变更 18944→22528（新增契约文本）。
- **D33 契约版本整数化。** `run.md` 的 `contract: YYYY-MM-DD` 兼职"schema 版本"是这套设计里最尖的
  一处：模型没有钟，写一个合法的早日期就让整份核心检查豁免（fail-open）。改成 `schema: 2`（整数，
  门禁按整数分档）+ `created:`（人读日期、带来源）；旧 bundle 仍按 `contract` 日期断代（读兼容），
  未来 schema 判红、不猜语义。**配套 `epochDateOf`**：schema 形态的见证下界取 `created`
  （`contractEpochOf` 在新形态返回空串，若直接沿用，`run-accept` 的 present 扫描与 `node-gate`
  的见证扫描会丢掉时间下界——自审时抓到的回归，见验证）。
- **D34 承诺与数据现实对齐。** 三条：①**回执三态**——装态没有审计工具时，显式写
  `no machine audit (install-only)`，不许声称 `CRITICAL=0`，`phase` 停 `delivery`；`accepted` 只由
  验收工具绿后操作侧写。②数据卡增 **`可移植`** 列（随 bundle / 随工作区 / 随包 / 随 profile /
  仅本机）——`present` 与 `audit.md` 是**仅本机**，移交后的 bundle 自证"交付了什么、谁拍的板"，
  不自证"审计跑过"。③`method-library.md` 的承诺改为「本工作区方法库」：它是工作区数据，不跨
  工作区；**不搬** `$DSH_HOME`（面板的 `remote.workspaceFiles` 读不到 home，搬就要新增 host 半）。
- **D35 种子所有权三态。** `seed.json` 每文件带 `policy: contract|corpus|user`：手册/节点契约/模板
  跟包版本（漂移 = 契约漂移），判型库是可生长底本，`.gitignore` 是用户数据。此前这三类只藏在
  scaffold 的两个特例分支里，`--check` 说不清"你改的是契约还是语料"。
- **D36 见证边界（收窄）。** 原计划给 `manifest.json` 加 `sourceHashes` + stale 判定；复核发现
  见证链已存在：`receiptProblems` 复算 final/readable/audit 哈希并被门 A 消费。manifest 是**目录
  快照**（`generatedAt` + 哈希），不是见证；给它加全量校验会把"交付后追加 journal"这种合法动作
  判 stale，等于造第二权威。故只把边界写清，不新增校验。

## 输掉的方案

- **把 `contract` 日期保留为唯一纪元**（只加 `created`）：改动最小，但早日期 fail-open 与"模型没钟"
  两个问题一个都没解；且日期常量继续散在五门里。
- **一刀切废掉日期断代**：会让 32 个契约期 archive bundle 全部退回"旧形态"，等于丢掉既有覆盖面；
  选"整数优先、日期读兼容"。
- **给角色加 `tool-bash` 让他们自己跑门禁**：能解"写的人当场没反馈"，但能力面（网络/文件系统
  shell）扩张远超收益，也与"角色无命令执行能力"的既有纪律冲突。留给 P2 的 host 只读工具。
- **把 `method-library.md` 搬进 `$DSH_HOME`**：符合"关于这个人 → home"的判据，但驾驶舱读不到
  home，必须新增 host 半 + 新数据面承诺；需求未证，先改承诺不动存储。
- **给 `manifest.json` 加全量 stale 校验**：见 D36——把合法追加判红，且与 `delivered.json` 重复见证。
- **让 M2 工作区也走 scaffold（W→D 翻转为 D→W）**：方向正确，但改动面覆盖 dev 环、门禁、snapshot
  与多份文档；本轮只登记为 watch（问题卡缺口 6）。

## 实际跑过的验证

- **L1 真挂载 ALL PASS**：`DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs`——四角色
  `session/create` 全绿、skills 硬隔离断言全绿（证明 `time-context` 行在真会话里可激活，不只是 YAML 形状）。
- **L2 安装形状 ALL PASS**：`release-smoke`——tarball 安装 → clean profile → scaffold/preflight →
  安装域 preset-smoke 四角色真挂载 → remove 后无残留 → 端口释放；`pack-smoke` 104 条 tarball 条目全绿。
  另跑 `preflight-smoke` 全绿（fake anchor 的 peer/未验证面）。
- **见证下界回归（自审红→绿）**：`contractEpochOf` 对 `schema` 形态返回 `''`（实测），
  修复前 `run-accept`/`node-gate` 拿到的下界是 `null`；新增 `epochDateOf` 后同一 bundle 返回
  `2026-10-28`（`contractEpochOf = ""` → `epochDateOf = "2026-10-28"`），并有单测锁三形态
  （schema→created；contract→contract；两者全缺→空串）。
- `pnpm verify` 全绿；`pnpm test` **943 pass / 0 fail**（新增整数契约四例 + 缺 created 一例、模板↔解析器同源、
  数据卡 10 列 + 可移植闭集、手册两处副本的回执三态句、seed policy 两例、审计 findings.policy）。
- **时钟行门禁先红后绿（实录）**：删掉 `analyst.patch.yml` 的 `- id: time-context` 两行 →
  `verify` 报 `preset-structure: analyst.patch.yml: 须恰有一条 - id: time-context（D32 时钟行，当前 0 条）`
  → 还原 → 全绿。gates-smoke 全绿（88 个注入案例，含新增 `preset-structure-clock-missing`）。
- **整数契约反证**：`schema: 2` 模式不读日期、`date` 取 `created`；`schema: 99` → 核心违约 +
  red；`schema: two` → 违约；无 schema 且 contract 非法 → 违约；仅 `contract: 2026-10-23` 的旧形态
  判定与改前一致（`tests/run/schema-scan.test.mjs`）。
- **现网结论未漂移**：`schema-scan` 缺省（archive）仍是 `契约前 0/46｜契约期 0/32`；显式点名
  在飞两 bundle 仍是 `2/2 RED`（`leads-eu.md` / `leads-supply.md` 未登记、journal 跨 bundle
  `[来源:]`、drafts 绝对路径）——本轮没有"顺手变绿"，因为那正是缺口 1 的证据。
- 生成物同步并复检：`dev/render-overlay.mjs` + `dev/sync-pack-workspace.mjs`；`overlay-fresh` /
  `pack-workspace-fresh` / `handbook-budget` 全绿（手册 18539B / 预算 22528B；201 行 / 上限 200 行
  经压缩后达 200）。
- **真模型重录 + 回放 ALL PASS**：四角色 fixture 用 `dev/record-role-fixture.mjs` 重录（真模型；
  重录前先 `git mv` 备份旧 fixture 到 /tmp 再删，录制器拒绝静默覆盖）。新基线带新手册与
  `time-context` 注入；`snapshot-replay-smoke` 从 **9 FAILURE**（旧基线：手册过期 + 新注入种类 +
  scout skill-catalog 存量漂移）转为 **ALL PASS**。`time-context` 进比对面后判据 = **注入的
  turn/step**（载荷是墙钟，逐字不可复现——理由与边界写进 [snapshots/README](../../snapshots/README.md)）；
  C 金标准 `--update-expected` 重写并人审：只差 lead 一句总结措辞（模型换了说法），无结构变化。

**卡 §验收标准逐条对账（1–8）：** ①回执三态 = 手册 + `data-plane-invariants` 两副本断言；②时间原生 =
四 preset 时钟行 + `preset-structure` 先红后绿 + L1 真挂载；③整数契约 = 模板/解析器/门禁 + 四例 + 缺
`created` 一例 + `epochDateOf` 三形态；④可移植列 = 数据卡 10 列形状锁 + 65 §2；⑤种子三类 =
`seed.json.policy` + scaffold/preflight 标注 + 两件测试；⑥回执 stale = **收窄**（D36，见证已由
`receiptProblems` 覆盖）；⑦措辞 = 手册/种子方法库 + `_abandoned`（本机文件，已如实标注）；⑧门禁与证据 =
`verify` 绿 + `test` 全绿 + L1/L2/回放/回执 smoke 全 PASS。P2 与缺口 6 已转 [triggers](../../_backlog/triggers.md)。

## 残余风险

- **C0 曾瞬时失败一次**：重录后首次全跑在 `C0 回放会话可开且真渲染` 处红，原样重跑即 ALL PASS；
  未改判据、未加 retry（浏览器面属外部边界，但一次样本不足以证明需要重试；再复现再立观察项）。
- **time-context 的比较面是结构性的**：只比"注入发生在哪个 turn/step"，不比时间戳/耗时/浏览器时区
  （物理上不可复现）。这不是放宽确定性面的比对——其余五个面仍逐字全等；若未来要让该面比正文，
  得先让载荷可复现（例如注入固定的时钟源）。
- **重录基线的锚点 = 承载该输入的 commit**：录制发生在脏工作树，`codeAnchor` 起初记 `a1a7f78`；
  提交后已改指 `d52b8e2`（README 要求 codeAnchor 与录制输入一致——脏树录制时唯一真实的对应物是
  把这份输入提交出来的那个 commit）。若以后在录制后改模型可见文本，仍须重录，不能只改锚点。
- **P2 未做**：随包只读 audit bin、host 半只读 `bundle_check` 都还只是问题卡里的选项；在飞 2/2 红
  仍需操作侧跑门禁才能发现。
- **W 与 D 同路径**（`research-workspace/` 既是 M2 运行时又是包种子源）未动；方向与重议条件记在
  问题卡缺口 6。
- 旧 bundle 的早日期仍可豁免（读兼容的代价）；新 run 由模板写 `schema`，不再新增这类形态。
- **本地 peer 解析比矩阵新**：`pnpm-lock.yaml` 把 `@deepseek-ai/dsh-time-context` 解析到 registry 的
  `0.2.1-rc.4`（vendor 是 rc.2、兼容矩阵测到 rc.3）。运行期由宿主按自己的安装解析该行
  （preflight/row-deps 把守），`pnpm typecheck` 绿；要把 dev 树钉回矩阵就加 override 或等 rc.4 进矩阵。
- `research-workspace/_abandoned/README.md` 的 D28 措辞修正是**本机工作区文件**（gitignored），
  不是随包交付物；可发布的那一半（手册"位置 = 操作桶"）本来就在。
