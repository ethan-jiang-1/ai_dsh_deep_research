# vendor pin 升到 dsh-v0.2.1-rc.2——兼容性重校与四处「从没被走到」的缺陷

> 状态：implemented

归宿：`vendor/dsh` submodule pin 换代（`dsh-v0.1.7-rc.2` → `dsh-v0.2.1-rc.2`）；插件兼容性 = 已实证

## 决定

`vendor/dsh` 从 `639ed01`（`dsh-v0.1.7-rc.2`）升到 `687f282e86`（`dsh-v0.2.1-rc.2`），
pack 的 18 个 peerDeps 与 `dsh.compatibility.dshReleases` 同步到 `^0.2.1-rc.2` / `dsh-v0.2.1-rc.2`。
**兼容性结论 = 兼容**，证据见下「验证证据」全档（含真模型端到端 run）。

## 问题

换 pin 是一次跨面换代：身份写四处、版本镜像散布 docs/scripts/tests、构建链依赖上游的
workspace 布局假设。0.2.1 恰好改动了后者——**包级 `tsdown.config.ts` 会替换根 workspace 布局**，
这让本仓构建链里三处「按 0.2.0 形状写死」的假设同时失效，且失败形态各不相同（有的只丢产物、
有的让后续步骤连锁红）。

## 方案

### 身份与镜像（机械面）

四处 pin 正本（submodule checkout / `verify.mjs` 的 `VENDOR_TAG` + `vendor-pin` PIN / pack
`package.json` 的 `dshReleases` + 18 个 peerDeps / 锁文件与 dist、手册镜像）与十处版本镜像同步；
`_backlog/_archived/` 里的历史 pin 提及按 `pin-agreement` 要求去字面量或加外部材料/参考仓措辞
（归档目录**不豁免**该门禁——这是本轮踩到的第一处认知修正）。

### `dev/vendor-build.sh` 三处修正（本轮核心）

上游 0.2.1 起，**包自己拥有 `tsdown.config.ts` 时，它的构建会替换根 workspace 布局**。旧链有三处
假设因此失效：

1. **④a 新增根 host 面专项构建**：`npx tsdown --env.DSH_BUILD_FACE host`。0.2.0 里 host 半由根
   配置统一产出；0.2.1 下包级配置接管后，根面不再覆盖这些包，host 半直接缺席。
2. **⑤ 补建谓词排除「自己拥有 `tsdown.config.ts`」的包**：它是**诊断用的补建**（谁的 host 半缺就
   补谁），对自带配置的包无效——补了也不产出，反而掩盖真问题。
3. **⑥b 新增 manifest 入口产物断言**（内联 `node -e`，输出 `全部 workspace 包的主入口已落地`，
   `SKIP_PKGS = new Set(["@deepseek-ai/dsh-desktop"])`）。这是本轮最关键的一条：**原链只看命令
   exit code**，而缺 host 半时 tsdown 全程 exit 0——产物没了却全绿，缺陷一路潜行到 L2 才以
   「peer 包缺 2 个」的形式暴露。

另有一次**自我致残**要记：⑤ 用 `find … -exec sh -c 'for l; do … ; done'` 时，条件不成立的
`[ … ] && …` 让整条 `sh -c` 返回 1，在 `set -e` 下静默杀死脚本（表现为脚本在打印半行后停止）。
修法是末尾补 `; exit 0`。

### 两处 smoke 的「从没被走到」

- **`client-load-smoke` 侧栏选行**：旧逻辑按 `textContent.includes(title)` 且**最新优先**扫描。
  dev home 里存在标题互为子串的会话（`Claude 模型发布线追踪` ⊂ `Anthropic Claude 模型发布线追踪`），
  于是点到了别家会话——活动流/队员/摘要三条断言全按错对象判红，**看起来像 pin 回归，实为选行缺陷**。
  修法：全量遍历、**精确等优先**、子串仅作退路（取最短匹配）；并补 `openSessionById`
  （`data-row-key` 精定位）作为退路。
- **`dev/boot-run.sh` 的 `profile_ok`**：旧实现只查文件**存在性**，pin 换代后旧 pin 的 team 层
  （`0.2.0-rc.2`）与旧 pack tgz 仍被判定「组合在位」而跳过重建，回放因此起不来（横幅超时，
  附 `exact-version exemption … not active` 警告）。修法：一次 `node -e` 同时核 bundle 集合、
  安装后 pack 版本 === `$PACKDIR` 版本、team profile 层版本 === `$LAYER_VER`。

### 归一化契约跟着上游搬家（`scripts/lib/replay-request.mjs`）

0.2.1 把 boot 引导身份**从 persona 正文移到 runtime-context**：persona 里只剩「runtime context
names …」的间接引用，具体 checkout 路径与 GUI 端口落在 runtime-context 的三行里。旧 normalize
于是变成**死规则**（永不命中＝假装在防漂移）。修法：`normalizePersona` 清零（persona 确实无可变
令牌），三条归一（GUI 端口 / checkout 根 / workspace 根）迁到 `normalizeRuntime`。配套两条契约
测试改写：persona 侧改钉「无可变令牌 + 任一字节改动即红」，runtime 侧钉「三个槽可归、别的改动仍红」。
其中一个测试还暴露了自己的选靶错误——`runtime-context` 里 `Current working directory:` 行也嵌同一
路径，裸 `replace` 命中的是那一行（测错了槽），改为**限定在策略句内**取参。

### `dev/hitl-answer.mjs` 两个从未被执行过的缺陷

端到端跑通 HITL2 时才第一次走到这两条路径：

1. `L310` 直接引用 `selected.candidate.bundle`，而 `selected` 的作用域在上一块内 → **ReferenceError**。
   讽刺的是同文件 `L255` 的注释早已写明「直接引用它会在失败路径抛 ReferenceError」。修法：把
   bundle 提升到外层 `pendingBundle`。
2. `bundle: state.active ?? null` 取的字段名不存在（契约是 **`activeBundle`**）→ bundle 恒 null →
   交付代答闸永远读不到 `review.md` 的 readiness，只能报「无判定行」自拒（review 明明已 PASS）。

两处都是「代码在、路径没走过」，所以既没被测试咬到也没被冒烟咬到——这类缺陷只有真端到端能暴露，
这也正是用户要求「最后一定要上端到端测试」的实证价值。

## 实际跑过的验证

| 档 | 结果 |
|---|---|
| L0 `pnpm verify` | **全绿**（20 门；`3 个 commit + 20 个 tag` 与 submodule 一致；108 条源面已对账） |
| L0 `pnpm test` | **542/542 pass** |
| L1 `DSH_SMOKE_REAL=1 preset-smoke` | **ALL PASS**（4 个 preset 全部真挂载绿） |
| L2 `release-smoke --install-only` | **ALL PASS**（真实安装形状可用） |
| `entry-chain-probe`（真模型） | **ALL PASS**（3 问：授权范围/ RFC 非实施前置 / 指认 guides/60） |
| `team-preflight-smoke`（真模型） | **ALL PASS**（spawn_teammate ×2 真调用、成员发现与响应、无角色 preset 组合画像） |
| `l4-lite-smoke`（真模型） | **ALL PASS**（四角色 assistant 响应 + scout web_search 真调用） |
| `client-load-smoke` | **55 PASS**（侧栏选行修正后） |
| `snapshot-replay-smoke` | **ALL PASS**（4 场景 A 回放 + B 组装 diff + C 渲染金标准；金标准已按新 pin 真重录） |
| `e2e-021rc2`（常驻 `--profile research` 实例，`--url` 模式） | **ALL PASS 7/7**——① 四角色连续成组、②「研究状态」643 字真数据、③「研究配置」2169 字真数据、本插件面零故障 |
| **L4 端到端真模型 run** | **跑通**：`drt_semver-caret-prerelease`（HITL1 → 取证 15 张 evidence 卡 → 纯综合 → critic 两轮审查 FAIL→PASS → HITL2 拍板 → final.md + final/v1.md + present + goal complete） |

端到端 run 的核心结论另经**独立实证**复核：`^0.2.1-rc.2` ≡ `>=0.2.1-rc.2 <0.3.0-0` + per-tuple
预发布准入；12 个边界版本用 `semver.satisfies` 实跑，与报告判定 12/12 一致。

三个真模型档（entry-chain / team-preflight / L4-lite）**逐个单独跑过**，不是用端到端 run 顶替。

### discipline-map 逐条语义重读（76 行全表）

`align-ledger` 只判**存在性**（源在、落点在），判不出语义过期。本轮按
[discipline-map §重审触发路径](../../docs/discipline-map.md)做了全表**逐行**重读：
76 条纪律行（照搬 34 / 带证据适配 25 / 不适用 17），每行**读上游原文 + 读本仓落点实体**，
不只看台账互相引用。结果 **9 行判定不成立，已同 diff 修正**：

| 源 | # | 问题 | 修正 |
|---|---|---|---|
| 1 | 15 | 规则 `Runtime invariants assert owned relationships` 已被 0.2.1 **删除**（pin 0.1.7 有、0.2.1 零命中），台账仍按旧原文并列 | 标注删除 + 复活条件 |
| 4 | 4 | 落点指 `AGENTS §notes implemented bullet`，该 bullet 已于 2026-09-25 下放删除 | 改指 `notes/implemented/README.md` + `notes/README.md` |
| 9 | 1 | vendor 子树 AGENTS.md 计数 22 → **28**（新增 6 份 snapshot 夹具） | 根 AGENTS.md 与本表两处同步为 28 |
| 9 | 12 | `docs/defensive-patterns.md` 在 0.2.1 已拆成**五卷目录**（双语对 + i18n） | 更新形态描述 |
| 10 | 9 | 判「不适用」，实况相反——`replay-scene.mjs` 早有 14 条比较前守卫 | 改「带证据适配」并登记该落点 |
| 10 | 10 | 判「不适用」，实况相反——`sessionFormat` 钉代已落地 | 改「带证据适配」，仅平台变体不适用 |
| 11 | 3 | 状态写「副本 = tracked 全量 + 补拷」，补拷已随 BUG-016 移除 | 改为「tracked 全量，等价 fresh clone」 |

另有 **9 行**（源 1 #6/#12、源 3 #3/#4、源 9 #10/#11、源 10 #5/#8、源 11 #5）判定为
「落点不符 / 三态可疑」——它们不是过时，而是**落点描述与实体不完全对应或三态归类站不住**
（例如把单行正则门禁称作「照搬」、把上游「禁 commit id 引用」的机检面记成 md-links 盲区、
声称的「承重四文件抽检」在采纳 Note 里并不存在）。修它们要先补门禁或重写归类理由，
**不是本轮 pin 升级能顺手收口的**，已立卡
[2026-10-19-discipline-map-semantic-drift](../../_backlog/issues/2026-10-19-discipline-map-semantic-drift.md)
待处置，不在本 Note 冒充已修。

源 5（3 行）、源 6（5 行）实读后**全部成立**：源 5 的进门判据原文、tier 表位置、双语三件套均与
`vendor/dsh/docs/postmortem/README.md`、`docs/AGENTS.md:27` 一致；源 6 的两类 Skill 分家、
`dev-skill-format` 门禁形态与渐进披露教义（出处 = vendor `.agents/notes/archived/feature/2026-07-05-skill-system.md`，
非 README）均核对属实。

### 补一条门禁：`discipline-na-trigger`（把承诺兑现，而不是再承诺一遍）

重读暴露的不只是 16 行数据，是**一句没兑现的承诺**。`discipline-map` §维护规则 写着：

> 写 `不适用` 必须同时给出**可判定的失效条件**……由 `align-ledger` 门禁的活性断言机械复核——理由变假即红。

但 `align-ledger` 只读 `docs/alignment-ledger.json`（108 条文件级账），**从不读人读表**。那句承诺
对 `discipline-map.md` 的 16 条「不适用」行根本没兑现——实测 10 行只写了理由、没写什么情况下来
重估。这正是源 10 那两行判反的土壤：`不适用` 一旦写下就再没人回头看。

**为什么选这条路而不是别的**：本轮先量化了三条"看起来能机械化"的路，全都太窄——vendor 路径
存在性（第一列只有 19 行含路径，4 个还是通配符误报）、落点链接可解析（37 个引用里仅 1 个失败，
且就是本轮修掉的那个）、数字镜像（全表只有 1 处数字断言）。**机械面本来就健康，烂的是语义**。
所以不去造一个假装能判语义的大检查，只补一条能真正判死的：**每条 `不适用` 必须写清什么情况下
回来重估**。这是把已有规则变成可执行的形式，不是发明新规则。

判据按**状态列真值**（剥 `**` 后取前缀 `不适用`），不做全文正则——「带证据适配（……原判「不适用」
与实况相反……）」这类行正文含"不适用"字样但判定不是 na，全文正则会把它们误红。防空语料：解析出
0 行或 na 行 < 10 即红。

同 diff 补齐 10 行重估触发（全部写成可观察事件，不写"以后再说"），并三处同步：`gates` 数组、
[evaluation.md §L0 登记表](../../docs/evaluation.md)、`gates-cases.mjs` 两个注入案例。

反证实录（红 → 绿，两次）：把「站点投影」行状态列还原成裸 `不适用` → `FAIL discipline-na-trigger`
且报因精确到行（`「站点投影：website/.generated/」——状态列只写了理由…没写什么情况下来重估`）；
把全表 na 改成 `N/A` 使解析归零 → 报 `只解析到 0 条「不适用」行（下限 10）`。两次还原后均回绿。
`gates-smoke` 全绿（47 个注入案例均被点名报红）。

## 0.2.1 的首次真兼容回归：preset order 撞车（用户实测发现，本 Note 追加）

**症状（用户 2026-10-19 在 3085 上亲眼看到）**：角色列表里四个研究角色被内置模式隔开——
`Lead | Standard | PTC | Scout | Analyst | Minimal | Creator | Critic`。

**根因**：`presets/<role>.patch.yml` 的 `config.order` 是本包自 0.1.7 起就写死的 `1/2/3/4`；
0.2.1 给 web-app bundle 新插了四个出厂 preset，`order` 恰好也是 `1/2/3/4`
（`preset-standard/ptc/minimal/cordis`，`dsh --profile research --dump-config` 可直读）。
两套同号 → 排序交错。**0.1.7 时只有我们四个，所以这个缺陷被完全遮蔽**——它不是本轮引入的
错误，是本轮**暴露**的既有错误。

**修法**：`order` 整体挪到内置之后（lead 5 / scout 6 / analyst 7 / critic 8），四个连续。
`order` 是 `z.number()` 无上限，不占用"自定义排序权重"之类语义槽；挪到高于出厂档位是
"扩展后置"的自然表达，也保证将来 web-app 再加出厂 preset（只要仍从 1 递增）不会再次插进来。

**为什么不在 registry 上调 `default`/索引开关**：`agent-preset-registry` 的 `default` 只决定
**选中态**，不决定**排列顺序**；把默认设成 lead 并不能让四个角色相邻（本轮实测确认）。

**回归锁 = `scripts/smoke/e2e-021rc2.mjs` ①**：读角色选择器全部 preset 名，断言四个研究角色
占据**连续下标**。反证实录：把 overlay 的 order 还原成 `1/2/3/4` → `FAIL ① …连续=false
序列=[Deep Research Lead | Standard mode | PTC mode | …]`（逐字复现用户看到的现象）；
改回 `5/6/7/8` → 回绿。

## 端到端验收（用户 2026-10-19 指令：不许再让 owner 手测）

新增 `scripts/smoke/e2e-021rc2.mjs`（登记在 [scripts/README.md](../../scripts/README.md) 冒烟表）：
自 boot 真实例 → ① 角色成组 → 进绑定 run 的会话 → ②「研究状态」胶囊可点 + 页签体真数据 →
③「研究配置」同上 → ④ 本插件面零故障（JS 异常 / `deep-research` 资源 4xx）。判据 = 脚本全绿。

本脚本当场抓到一个**与本次升级无关但必然发生的既有缺陷**并修掉：`research-status` 的
`listDir` 对 `drt_*/evidence` 不存在的情况打 `console.error`——而 run 早期（scaffold 完、
分析员还没写第一份证据）**没有** `evidence/` 目录是合法空态。0.2.1 通道里
`drt_cn-us-agriculture-gap` 正好是这个状态，页签把正常空态当故障报红。
修法：`workspace-file/not-found` 按空列表降级、不打 error；其他 code / 抛错仍然 fail-loud
（[index.ts](../../packages/deep-research-pack/src/client/index.ts) `listDir` 注释记了完整理由与
"为什么不能一律静默"）。

**测出来的两个"假红"也记下来，避免下一个人重踩**：

- `/api/changes.summary` 进会话后 404：**对照实测**（stock `web` profile 不挂本包）同样 404，
  是宿主既有行为，不作兼容判据。脚本因此只收 `deep-research` 面的资源失败。
- 角色 seat 标签只在**首屏**（新会话输入框旁）在场；进了会话就是交付面。断言必须排在进会话
  **之前**，否则读出 `四个角色=0`。

## 0.2.1 的第二个真兼容断裂：brand 槽同优先级重复注册会抛错，并中断整个 apply

用户报「两个 panel 都看不到了」（四个角色在、两个页签消失）。定位出来的因果链比预想的深，
记全，因为它决定了本包的一条硬纪律：

1. **0.2.1 的官方侧栏自己注册了 `sidebar.brand.mark`**（0.1.7 没有）。`ui-slots` 的 single 槽
   只允许**完全相同 priority** 被占一次：同优先级撞车 → `throw`，
   「register at a different priority to shadow it (lowest renders)」
   （`vendor/dsh/packages/client/ui-slots/src/index.ts` 的 `case 'single'` 分支——vendor 树只读，
   按 BUG-016 用反引号路径不建链接）。
2. 我们的 `apply` 在 brand mark 处抛错 → **apply 从这里截断**，后面那条 `sidebarRightTabs.register`
   （「研究配置」）根本没执行；而它前面那条（「研究状态」）已注册，于是出现"一个在、一个不在"
   的半截状态。极限情况下连「研究状态」也不可见（entry 整体 failed：
   `web boot: 1 entry did not activate`）。
3. **为什么 `client-load-smoke` 当时是绿的**：它断言的是页签体与交互，跑在"注册刚发生"的窗口里；
   而 `ctx.inject(..., scoped => ...)` 的作用域在回调结束后失活，`scoped.effect` 的 disposer
   会把注册一起撤掉。**"注册成功" ≠ "一直存在"**。实测判据只有一条：等页面稳定后，
   在**常驻实例**上读 `[data-sidebar-right-session]` 的 innerText。

修法（两处，都最小）：

- `slots.register({ name: RESEARCH_BRAND_MARK_SLOT, priority: -1 }, OrcaMark)`（name 槽同）——
  用最低 band 遮蔽官方默认 occupant，这是 vendor 自己给的唯一合法路径；
- 页签注册保持 `ctx.inject` + `scoped.effect` 的原有形态（不动生命周期契约），只修撞车。

**硬纪律（新增）**：本包任何 `slots.register` 进 single 槽，必须显式写 priority，
默认 0 = 与官方抢座 = 抛错 + 静默截断 apply。已有先例：研究语义工具卡此前就因同键同优先级
被迫用 `priority: -1`——同一个坑第二次踩，这次升到纪律层。

诊断手法留档（下一个人省 2 小时）：在 `apply` 里临时 `try/catch` + `console.error`，看首个
抛出的 Error 文本；再用 `entries()` / `guide()` 在**根 ctx** 上取样（`scoped` 上取会抛
`cannot get required service ... in inactive context`——这条报错本身就是"作用域已失活"的铁证）。

## 输掉的方案

- **「把四个角色塞进一个分组/子菜单」**：先想过按 kind 或分组标签收拢，但 vendor 的 preset
  注册面（`@deepseek-ai/dsh-agent-preset` 行）**只有 `order`** 这一个排序杠杆，没有分组字段
  （`z.number()` schema 直读）。造分组要么改 vendor（只读铁律），要么在 client 半自绘选择器
  （把宿主 UI 复制一份，与"循 DSH 而不发明"冲突）。挪 order 是最小杠杆。

- **「放宽归一到凑绿」**：`snapshots/README` 明令禁止（fix fixtures, not normalizers）。本轮所有
  期望红都以**真重录**收口；归一化的改动只发生在上游真的搬家时，且零归一化方向（删死规则）
  优先于加规则。
- **「`--clean` 全量重建」**：中途试过，在 ⑥ 撞 `[UNRESOLVED_IMPORT] Could not resolve './base.css'`
  并抹掉 vendored `cordis`/`cosmokit` 等 6 包的 `lib/`（须用 `dev/vendor-host-bundle.config.ts`
  手工重建）。结论：本仓的 clean 重建路径在上游布局变化后同样脆，**不是**本轮要修的面，
  但记在这里以免下一个人重踩。
- **fixture 录制端口**：录制与回放端口必须一致，否则 `B·runtime-context` 必红（端口此刻归一到
  runtime-context，不再嵌 persona）。录制默认 3105、回放 3103——本轮统一到 3103 重录。
