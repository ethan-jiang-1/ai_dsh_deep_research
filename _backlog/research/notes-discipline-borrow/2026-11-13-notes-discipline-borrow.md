---
topic: notes 工程纪律的补借面：孙目录、状态面、冻结层与归档校准
intent: 对照 DSH 原生 notes 制度（参考卷八篇 + vendor 一手定义）找出本仓漏借的工程纪律，给出可证伪的优先级建议，供用户裁定后立卡。
---

# notes 工程纪律补借：先看哪些地方其实没有把守

> 证据边界：数字 = 本机 2026-11-13 实测（HEAD `8e935037`，工作树干净；语料 = `notes/` 盘上文件 +
> `git log --diff-filter=M`）。探针 A–F 真跑、跑完即删（§10.1 附命令与还原证据）。参考卷 =
> 作者本地 `deepseek-harness/_digested/development-flow/` 八篇（仓外，不随仓）；一手定义 =
> `vendor/dsh/.agents/notes/`（只读）。本页只做调研，**不改任何 notes 文件、不加门禁**。

> **前提（用户 2026-11-13 明确）**：`notes/` 留在仓库根目录，位置不动——它是登记的偏离，
> 不参与本轮讨论。本页借的是**思想**（判据、门禁、封印、校准），不是 vendor 的
> `.agents/notes/` 路径，也不是 class 目录的位置。即使将来要加分类层，也只会在 `notes/`
> 内部加，不会把目录搬到 `.agents/` 下。

## 0. 结论

1. **我们借到的是骨架，漏掉的是把守。** 生命周期四层、取代检查、毕业改写、归档层、
   活面→冻结层指针登记簿都在；缺的是让这些规则**会响**的几道窄检查：树形闭集/深度/日期前缀、
   归档元数据、拒绝条的重启条件。前三条探针实测全部**静默通过**（§3.4、§4.1、§4.2）。
2. **子目录的孙目录（class 层）不建议加。** 现在 82 篇活跃 + 136 篇冻结，文件名主题家族
   61 / 94，机制名检索没有失效；参考卷自己也承认第四层是"放弃分类多样性换校验收口"的
   **结构性取舍**，而本仓的冻结层一旦上封印，按类重组历史会与封印直接冲突（§3.3）。
3. **真正该借的是 class 层的前提，而不是 class 层：树的形状必须被闭集咬住。** 实测把一篇
   坏 Note 放进 `notes/implemented/子目录/`、或另立 `notes/任意层/`，格式/毕业门禁全部 PASS
   ——正是参考卷所述 vendor 源码注释里"invisible to the walk below"的失败形态（§3.4）。
4. **冻结层是最大缺口：它现在只是声明，不是事实。** 28 篇归档后正文被改过（跨八次提交），
   根因是 `md-links` 仍扫 `notes/archived/**`，全仓改名会逼着改档案；实测往冻结件追加一行，
   `pnpm verify` 全绿（§5.2）。参考卷的答案是"封印 + 出链排除 + 具名例外"，本仓适合分两阶段落地。
5. **归档判断缺一个校准载体。** 2026-10-08 的三轮独立判定给出几乎不相交的名单，抽样
   8/8 被对抗证伪打回；而 2026-11-10 两批共 84 篇的实际判据只活在 commit message 里。
   参考卷把这种判断写成**一份带反例与反指标的 skill**，本仓没有（§6.3）。

### 0.1 建议清单（按优先级；判据与红证见 §9）

| 优先级 | 借什么 | 落点 | 成本 | 为什么现在 |
|---|---|---|---|---|
| **P0** | 树形门禁：生命周期闭集 / 禁止嵌套 / 文件名日期前缀 / `INDEX.md` 禁令 | 新门禁 `note-tree` | 窄（一处门禁 + 台账） | 探针 A–C 证明现在可静默逃逸；也是将来加任何结构层的前提 |
| **P0** | 归档元数据：唯一状态行、`> 状态：implemented`、`> 归档：<合法日期>` 且不早于文件名日期 | `note-format` 扩展 | 窄 | 探针 D/E 证明现在零把守；也是封印的元数据前提 |
| **P0** | 拒绝条"重启条件"在场（容忍 复活/重启/重新引入 词表） | `note-format` 扩展 | 窄 | 这一层的价值就是"什么时候可以重提"；现仅 3/10 有独立 `## 复活条件`，按字面断言会误红 7 篇 |
| **P0** | 归档判断校准 skill（判据 / 反指标 / 本仓校准样例 / 程序 / 报告格式） | `.agents/skills/archiving-a-note/` | 一个文件 | 判据现在只活在 commit message；三轮实验已证判据裸用不可靠 |
| **P1** | 冻结封印（append-only 清单 + `--write` + 具名例外）**并**把 `notes/archived/**` 排除出链接门禁 | 新门禁 `archive-seal` + `md-links`/`md-anchors` 排除 | 中 | 冻结声明与现状不符；排除是封印的必要配套，否则改名继续逼改档案 |
| **P1** | 功能移除的负向证明条款（完整取代 feature 类 Note 前证明"功能真的不存在"） | `notes/README` 取代检查 + `reviewing-a-delivery` | 窄（纯散文） | 本仓已多次移除功能（launcher/seed/postmortem 层），实践对、规则不要求 |
| **P2** | class 子目录（孙目录） | — | 高 | **不做**；触发条件 = 机制名检索失败，或按类批量审阅成为常态（§3.5） |
| **P2** | `> 类型：<class>` 头字段 | — | 低 | **不做**；没有消费者的分类会腐烂；真要分类直接做目录 |
| **P2** | 提案期标题禁行（`## 提案`/`## 方案`/`## 验收标准`…） | — | 低 | **不做**；`## 方案` 在活跃区是合法的交付方案节，标题检查只证外观（§4.5） |
| **P2** | 动词开头文件名 / 禁 `v2`/`final` 后缀 | — | 中 | **不做**；版本化发布 Note 是有意命名，重命名 = 全仓链接噪声（§7） |

## 1. 参考卷讲的是什么（每篇一句，不复制结论）

| 篇 | 它真正主张的一件事 | 对本仓的用处 |
|---|---|---|
| `00-map` | notes 是"想法→已落地→冻结"全程有机器判据的通道，不是博客归档 | 判断我们缺的是"通道"还是"判据" |
| `01-lifecycle` | 路径即状态：`{lifecycle}/{class}/yyyy-mm-dd-topic.md`，三层钉死，class 闭集 | 孙目录问题的正反两面、深度代价 |
| `02-gates` | 能机械判的进红灯，判不了的明文交给人 + 校准 skill；规则最密处也有"没管的那一半" | 我们该补哪几道窄门禁、哪些不该补 |
| `03-transitions` | 三条边两套判据；拒绝要便宜（只加一句理由），落地要昂贵（整篇改写） | 我们的 rejected 形态与 vendor 不同，需按本仓适配 |
| `04-forgetting` | 四分法 + **明文排除字数/年龄/配额** + 校准样例；归档只加一行，所以"归档不是修订"可逐字节验证 | 冻结层为什么必须硬、归档判断为什么需要校准 |
| `05-writeback-loop` | 学习落成 note/docs/skill/常驻规则/门禁五形态；存在性与质量**没有**门禁，是设计而非疏漏 | 我们不必补"该写没写"的门禁 |
| `06-honest-gaps` | 每条判断都要能回答"哪份文件改掉后这句话变假" | 本页 §8.3 与 §11 的写法 |
| `07-naming` | 三层命令文件（规范/义务/禁令）、管辖权对偶、动词命名、闭集章节、链接代替叙述 | 命名只借可检的部分 |
| `08-enforcement-sites` | 六类执法者、时机表、归档被十余道门禁主动排除、编辑期那一格是空的 | 我们的执行面盘点（§8） |

一句话概括参考卷的"真正内容"：**形状上硬（位置/骨架/封印都有红灯），判断上软（写不写、
写得对不对、何时忘，靠校准过的判据加人读）；中间层是把判据写成可执行形式，把不能执行的
写成明文与样例。** 本页按这个三分法检查本仓：形状缺哪几道、判断缺哪个载体、哪些明文已经
有了但没有样例。

## 2. 本仓现状：已经借到的部分（不要重做）

| vendor 做法 | 本仓落点 | 状态 |
|---|---|---|
| 四个生命周期目录 + 目录即状态 | `notes/{proposed,implemented,rejected,archived}/`，各自 README 宪章；`note-status` 强制每层有 README | 已对齐（形态与语气都够） |
| 每新 Note 触发取代检查 | `notes/AGENTS.md` §取代检查 + `notes/README.md` §决定覆盖与取代检查 | 已对齐 |
| Alternatives 强制（"没记击败了什么 = 会重开讼"） | `note-format` 强制 `## 输掉的方案` | 已对齐 |
| 冻结层路径 + 归档纪律 | `archived/README.md`：正文永不修改、唯一机械编辑 = 插 `> 归档：<日期>`；事故复盘也冻结在此 | 声明已对齐，**执行未封印**（§5） |
| 活面引用冻结件要显式裁定 | `archived-note-pointer` 门禁 + `scripts/archived-note-pointers.json`（实测 187 对登记、89 个冻结目标） | 本仓比 vendor 多出的一层 |
| 不建集中 INDEX、用路径 + 检索 | 无 INDEX；各目录 README 只写宪章 | 已对齐 |
| Status 裸值、目录互验 | `> 状态：<裸值>` + `note-format` 目录互验；实测 82+136 篇状态行全部在头七行、恰一条 | 形态已对齐，**位置/唯一性零门禁**（§4.1） |
| 毕业 = 正文改写 | `note-graduation-rewrite` 门禁（裸 `## 验收` + 计划体标记，含 fenced/反引号引文豁免） | 本仓比 vendor 的标题禁行更进一层 |
| 学习五形态 / 载体分工 | `docs/discipline-map.md` §载体分工 + §源 7 五种维护形态 | 已对齐 |
| 归档判断校准 | 无（`reviewing-a-delivery` 只加了一条"旧 Note 一致性"） | **缺口**（§6） |
| 冻结封印 | 无（`discipline-map` 源 4 登记为"带证据适配，manifest 面不引入"） | **缺口**（§5） |

**读法**：本仓在"流程与载体"上借得比 vendor 的多数 fork 都全；差的三处恰好是参考卷反复强调
的"使规则会响"的部分——树形、元数据、封印；再加一处"判断的样例"。

## 3. 专题一：孙目录（class 层）

### 3.1 参考卷的账

vendor 的树是两层编码 × 三层深度：生命周期（四值闭集）× class（六值闭集）→
`{lifecycle}/{class}/yyyy-mm-dd-topic.md`。它的收益不是"分类好看"，而是三件：

- **路径即元数据**：找"活跃的架构决定"是一个目录名，不需要索引；
- **class 改变规则**：`feature` 的合并删除要负向证明、`simplification` 的判别词是"可观察行为
  是否改变"、`architecture` 与 `process` 的边界是"发布的源码 vs 围绕源码的工装"；
- **闭集可校验**：加一个 class 是"deliberate act"（要同时动脚本与 README）。

代价参考卷自己写得很诚实：深度必须是三层，**没有第四层**（分组名没有闭集、移动成本、
可预测性）；而"`ls` 在单个目录越过几十篇后就不可读"，`browse` 在 180 篇量级已退化为
grep 一条路。它选择"放弃第四层换分类只有一套且校验收口"。

### 3.2 本仓的数据

| 项 | 值 | 口径 |
|---|---:|---|
| `notes/implemented/` | **82** 篇 | 排除 README |
| `notes/archived/` | **136** 篇 | 排除 README |
| `notes/rejected/` | **10** 篇 | 排除 README |
| `notes/proposed/` | **0** 篇 | 空层本身是信息：当前没有需要显式评审的持久决定 |
| 活跃区主题家族 | **61** 个（82 篇） | 文件名去日期后首 token；最大族 5 篇 |
| 冻结区主题家族 | **94** 个（136 篇） | 同上；最大族 6 篇 |
| 单日最大归档批 | **84** 篇（2026-11-10，两提交） | 归档行日期统计 |
| 活面→冻结件 Markdown 链接 | **224** 条（187 对登记、94 个活面源） | 解析 + 登记簿对账 |
| 冻结件出链 | **442** 条（353 条指向活跃区、89 条指向冻结区、10 条外链） | 解析 |

**读法**：61 家族 / 82 篇与 2026-10-08 体检时的 61 家族 / 72 篇同构——篇数长了，家族没合并，
说明"按主题再分一层"没有分布依据；而 class 轴（决定种类）本可以切，但本仓的构成是
"吸收/审计/交付记录"为主（见 §3.3），与 vendor 的 feature/bug-fix 重心不同。

### 3.3 为什么"不加"仍然成立（并有新证据）

1. **历史结论未过期**：`notes/README.md` 差异表登记的引入条件是析取——"机制名检索实测失败，
   **或**出现按类别批量审阅/浏览的常态工作流"；2026-10-08 体检实测两条都不满足，2026-10-10
   重估维持；本篇按 82 篇复核，仍不满足。
2. **迁移成本随冻结层增长而变硬**：`notes/implemented/` 被 133 个 tracked `.md` 提及（含 notes 自身与 README），
   `notes/archived/` 被 93 个引用；按类搬家要同时改活面链接、187 对登记、冻结件的出链。
   更要紧的是：一旦 §5 的封印落地，**冻结层就不可重组**——class 层只能覆盖活跃区，形成
   "新归档按类、旧归档按平铺"的两套路径，比现在更不可预测。
3. **class 的规则收益可以脱层获得**：三条类特异规则里，只有"功能移除负向证明"值得借，
   另两条（simplification 判别、architecture/process 分界）在本仓已有等价物（D16/D40 的
   技术决定台账 + docs/notes 管辖权），不需要标签。见 §3.6。
4. **本仓已有一个"空层即信息"的对应物**：`notes/proposed/` 零篇，读者一眼知道没有待评审
   RFC——这与参考卷"20 个叶子目录而非 24 个，缺的目录本身是信息"是同一种红利。

### 3.4 但漏了它的前提：树形没有被咬住（探针 A/B/C）

参考卷把"未知顶层目录会让整批 Note 对 walk 不可见"写进了源码注释，并用**等号**判深度。
本仓相反：门禁只读生命周期根下的**直接文件**，嵌套目录被静默跳过；`note-status` 只要求
子目录有 README。实测（完整命令与结果 = §10.1）：

| 探针 | 注入 | 期望（参考卷） | 实测 |
|---|---|---|---|
| A | `notes/implemented/probe-depth/`（README + 无骨架 Note） | 红（深度错） | **全绿**：格式/毕业门禁根本没走进去 |
| B | `notes/probe-layer/`（README + 无状态 Note） | 红（未知生命周期） | **全绿**：`note-status` 只看 README 在场 |
| C | `notes/implemented/notadate.md`（无日期前缀，骨架合法） | 红（文件名格式） | **全绿**：文件名无人判 |

**这就是"孙目录问题"的真正答案**：不是"要不要加孙目录"，而是"现在的门禁根本不知道树长
什么样"。补上门禁后，加不加 class 层都会变成一次**显式的结构调整**（要改闭集与门禁），
而不是一次静默逃逸。参考卷缺口一（分类门禁不读 README）提醒我们：闭集只写一份——门禁
常量即正本，README 只链接它，避免 vendor 那种"两份字面副本"。

### 3.5 如果将来要加：触发条件与形态

- **触发（可判定）**：机制名检索实测失败（已知存在的条目搜不到）；或按类别批量审阅成为
  常态（例如"改测试栈前要通读所有 testing 类 Note"）。
- **形态**：闭集（起手五到六类，与 D16/D40 的台账词表对齐）、每层一个开发周期的迁移、
  **不做第四层**、路径与状态行互验、迁移同 diff 修活面链接与登记簿。
- **前置**：必须先有 §3.4 的树形门禁；否则加了 class 层也没有校验收口。
- **硬约束**：若 §5 封印已落地，class 层不能覆盖 `notes/archived/`（历史层不可重组），
  只能在 `implemented/` 内引入——这会产生"未来归档是否按类"的新问题。**这是本仓比 vendor
  更该谨慎的理由**：vendor 是从第一天就分好的，我们的历史层已经平铺了 136 篇。

### 3.6 残余可借：三条类特异义务

不必等 class 层，先把**判断条款**写进 `notes/README.md` §决定覆盖与取代检查：

1. **功能移除的负向证明**（vendor `feature` 特判）：一篇功能新增 Note 只有在功能从生产代码、
   配置、schema、持久化/wire 格式、迁移、兼容行为里**全部消失**，且没有现行文档把它写成可用、
   没有测试把它当受支持行为时，才能被后续移除 Note 吸收删除；移除方必须保留原动机、为什么
   不再成立、完全移除的替代方案、放弃的能力、重新引入条件、以及"确实不存在"的验证。
   **本仓实践已经接近**（D40 删除 launcher/seed 的 Note 保留了动机、输掉的方案与替代路径），
   但规则没有要求，下一次可能只写"删了"。
2. **`simplification` 的判别词**："可观察行为是否改变？"——本仓没有这个类，但它在取代检查里
   仍有用：判断"这是简化还是新能力"决定要不要新 Note、要不要保留旧 Note 的负向保证。
3. **`architecture` vs `process` 的分界**："发布的源码" vs "围绕源码的工装"——本仓已由
   `docs/design/` 与 `docs/guides/` 的管辖权承担，不必再借。

## 4. 专题二：状态与 flow

### 4.1 状态行的位置与唯一性（探针 D）

vendor 的头三行是位置敏感的（`# Agent Note:` / 空 / `Status:`），且 `Status:` 全文件唯一。
本仓用 `> 状态：<裸值>` banner，`note-format` 只用多行正则**找得到一条**即可。实测：

- 语料层：82 篇 implemented + 136 篇 archived 的状态行全部在头七行、恰一条——**纪律已经
  形成，但没有门禁**；
- 探针 D：在合法 Note 末尾再塞一行 `> 状态：rejected` → **PASS**。

建议把"唯一 + 在头部"写成断言（头七行内、恰一条）。成本约十行，基线绿；这不是学究气——
状态行是"目录↔状态互验"的锚点，正文里第二条状态行会让读者和脚本各读一条。

### 4.2 archived 元数据（探针 E）

vendor 的 `validateMetadata()` 要求：恰一行 `Status: implemented`、下一行 `Archived: YYYY-MM-DD`、
日期是合法日历日、且不早于文件名日期；正文只允许这两行的机械编辑。本仓：

- `archived/README.md` 声明了同样的纪律；
- `note-format` **不扫 archived/**；实测探针 E 把一篇无标题、无状态、无归档行、无骨架的
  文件放进 `notes/archived/` → **PASS**（仅 `note-status` 因目录有 README 而 PASS）。

建议把上述四条写进 `note-format`（扫描 archived 只读元数据，不读骨架——冻结件不追改骨架）。
基线全绿：实测 136 篇全部有 `> 状态：implemented` 与 `> 归档：<日期>`。这也为 §5 的封印
准备元数据前提：归档行是"何时冻结"的唯一记录，不能靠猜。

### 4.3 rejected：重启条件才是这一层的价值

vendor 的 rejected 是"冻结的提案快照 + 状态行一句理由"。本仓是**另一种形态**（更接近
decision record）：正文写原方案、否决理由、复活/重启条件，`rejected/README.md` 明确
"先读复活条件：条件未出现就不要重提"。这个差异是**有意的**，不该回写成 vendor 形态。

但这一层现在只被 `note-format` 检查状态行（`> 状态：rejected`，允许 `—— 理由`），
**重启条件零校验**。实测：

- 10 篇 rejected 全部有该节，但字面形态分三族：**3 篇**是独立 `## 复活条件`；**4 篇**是
  `## 重启条件` / `## 重启判据`（其中一篇另有 `## 未来若需要自愈：必须满足的硬要求`）；
  **3 篇**老篇把它写在 `## 验收（= 复活条件现状）` 里。
- 也就是说：按字面 `## 复活条件` 断言会误红 7 篇；按**容忍词表**（复活|重启|重新引入）
  断言会 10/10 绿。

建议按本仓既有的"证据节词表"风格加一条：rejected 必须有标题含 复活/重启/重新引入 的 h2。
这与 `note-format` 的验证节断言同构（容忍历史命名，咬住"根本没有这一节"），成本约八行。

### 4.4 `approved` / `superseded`：未被使用的词汇

`notes/proposed/` 允许 `proposed | approved | superseded`（`note-format` 与 `proposed/README`）。
vendor 没有这两个值；本仓当前 `proposed/` 零篇，两个值**零实例**。不建议现在删（零成本、
未来可能需要），但要登记一个观察：若一年内仍零实例，说明 RFC 层实际只用 `proposed → 迁出`，
可把词汇收成两值，减少读者要记的状态。这与参考卷"闭集越小越好、加一个值是 deliberate act"
同源。

### 4.5 提案期标题禁行：不借

vendor 的 `BANNED_IMPLEMENTED` 挡 `## Proposal` / `## Plan` / `## Migration plan` /
`## Acceptance criteria`；参考卷自己承认"只挡标题，不挡内容"。

本仓的对应物是 `note-graduation-rewrite`：裸 `## 验收` + 计划体标记（TODO/TBD/待办/待实施/
下一步将/…），且做了 fenced 与反引号引文豁免——**比 vendor 多咬住一层**。是否再加标题禁行？
实测语料：`## 方案` 出现在 2 篇 implemented（一篇有 grandfather、一篇无），而后者是
"已交付方案"的合法节；`## 提案` / `## 计划` / `## 验收标准` / `## 风险` 均零篇。加禁行只会
制造一次 grandfather 补丁或一次无意义改写，**收益不抵**。结论：保留现状，把"标题检查只证
外观"写进 §8.3 的缺口登记。

### 4.6 毕业改写：我们比 vendor 多，但仍不是内容检查

`note-graduation-rewrite` 的标记词表是实测归纳的，且已知边界写在实现注释里（`## 证据待补`/
`## 验证计划（未执行）` 这类空洞标题仍会通过）。这与参考卷缺口三同性质：**能保证作者被逼
开一节，不能保证这一节有证据**。不需要补更强的机械检查；需要的是在缺口登记里写清楚，
让 review 知道该看什么。

### 4.7 转换纪律：拒绝要便宜、归档只加一行

两条本仓已在执行：

- 拒绝的"最小操作"在本仓的等价物是"在 rejected 正文写清理由 + 重启条件"，而不是改写整篇；
  2026-10-30 的许可证否决条就是"吸收进 open-source-launch 后删除"，说明"完整取代"路径也在用。
- 归档的"只加一行"有机械证据：`2bfc17c7` 的归档批里，既有冻结件只有 8 行删改，全部是链接
  重定向；新归档件正文零改动。**但"此后冻结"没有守住**——见 §5。

## 5. 专题三：冻结层——本仓最大的借点

### 5.1 参考卷的主张

`04-forgetting` 的三条支撑里，第三条是"封印是硬的"：`manifest.json` 逐文件哈希 + append-only
校验，让"冻结区不是现行权威"有执行基础；它还有一个反直觉的副产品——**冻结层越硬，活跃区
就越敢删**，因为删除不再是烧档案。配套的第二条设计是：**归档层被十余道文档门禁主动排除**，
包括出链检查；参考卷明说"不要声称归档出链有效，校验器故意不查"。

### 5.2 本仓实况：28 篇冻结后被改过

`git log --diff-filter=M -- notes/archived` 实测（排除 `archived/README.md`）：

| 提交 | 日期 | 被改冻结件 | 增/删行 | 起因 |
|---|---|---:|---:|---|
| `70866fee` | 2026-09-28 | 5 | 5/5 | 驾驶舱毕业，入口重定向 |
| `16163e87` | 2026-10-10 | 1 | 1/1 | 登记簿计数修正 |
| `5d00f997` | 2026-10-20 | 3 | 3/3 | tests 分域改名 |
| `8c5b11f9` | 2026-10-30 | 2 | 2/2 | postmortem 层退役（另有 README 章程修订 25/22） |
| `8822e48d` | 2026-11-10 | 7 | 7/7 | 批量归档，入链重定向 |
| `2bfc17c7` | 2026-11-10 | 5 | 8/8 | 批量归档，入链重定向 |
| `767674b1` | 2026-11-13 | **11** | 13/13 | **测试车道改名，`md-links` 逼着改档案** |
| `6803fa5f` | 2026-11-13 | 1 | 1/1 | backlog 研究归档，路径重定向 |

按提交计共 35 次修改事件（含跨提交重复），**唯一 28 篇 / 136 篇（20.6%）**在冻结后正文
被改过；全是链接目标的重定向，没有事实改写。
但"正文永不修改"是 `archived/README.md` 的原话，且它自己划的边界是"**搬移当时**因路径变更
产生的出链重定向……此后冻结"——`767674b1` 发生在归档数周之后的仓库级改名，已经在边界之外。

**根因不是纪律松，是结构逼的**：`md-links`/`md-anchors` 扫全部 tracked `.md`，包括
`notes/archived/**`；活跃区的文件一改名，冻结件里的旧链接就红，而修红的唯一办法是改档案。
这正是参考卷 `08` 的"代价一"：归档层必须被链接门禁排除，否则"冻结"与"链接可解析"不可兼得。

**探针 F** 更直接：往一篇冻结件末尾追加一行 `appended after seal`，`pnpm verify` **全绿**。
也就是说，今天既没有封印阻止改，也没有任何检查能发现改。

### 5.3 建议设计：seal + 排除 + 具名例外

分两阶段，避免一次改太多：

**阶段一（只做排除，不改内容）**

- `md-links` / `md-anchors` 对 `notes/archived/**` 的**出链**跳过（同 vendor 的
  `isArchivedAgentNotePath` 谓词）；活面→冻结件的入链仍由 `archived-note-pointer` +
  登记簿把关（本仓已比 vendor 多这一层）。
- 在 `archived/README.md` 把"已知限制"改写为明确规则：归档出链不检查、不声称有效；
  这是刻意留白，不是遗漏。
- 收益：下一次仓库级改名不再产生"改档案"的强制动作。代价：353 条冻结出链可能腐烂
  （当前全部可解析；腐烂只影响历史读者，不影响任何门禁）。

**阶段二（封印）**

- 新 tracked 文件 `scripts/notes-archive-seal.json`：`{version: 1, files: {path: "sha256:…"}}`，
  路径排序、字节稳定；
- 新门禁 `archive-seal`（c-notes 域）：
  1. 每条登记必须存在且哈希一致（缺失/改动 = 红）；
  2. `notes/archived/**` 的每篇 Note 必须在清单里（未封印 = 红）；
  3. 清单为空或冻结语料为空 = 红（防空语料，同 `archived-note-pointer` 的既有做法）；
  4. 例外必须是**具名前后哈希对 + 理由**（照 vendor 的 `figmaLinkRemovals` 形态），
     只允许"清单里记着的那一对"通过；
- 生成/追加：`node scripts/verify/notes-archive-seal.mjs --write` 先证明既有封印全部匹配，
  再追加新件；`--reseal <path> --reason <why>` 写一条具名例外（前后哈希 + 理由）。
- 文档：`archived/README.md` 的"冻结纪律"补"封印与例外程序"；`docs/evaluation.md` 加台账行；
  `tests/checks` 加静态对账、`gates.e2e` 加两条常驻案例（未封印 / 改封印件）。

**为什么用仓库内清单而不是环境变量基线**：vendor 用 `DSH_ARCHIVE_BASE_REF`（CI 注入受信
基线），本仓是单人仓、无 CI 注入点；仓库内 append-only 清单的 diff 本身就是可见性
（改内容必须同时改哈希，一次提交里两处都动，review 一眼可辨）。代价要说清：**清单本身
可被改**，它不是密码学防护，是"篡改必须留下两次编辑"的可见性防护——与参考卷的定位一致。

### 5.4 成本、风险与备选

| 方案 | 成本 | 收益 | 风险 |
|---|---|---|---|
| 只软化声明（"冻结 = 不追改事实，路径重定向除外"） | 零 | 声明与现状一致 | 冻结仍是软的；删除活跃 Note 时仍没有"历史不会丢"的底气 |
| 只做 pre-commit 检查（staged 改冻结件就拦） | 低 | 拦得住本地手滑 | 与本仓"pre-commit 跑全量 verify"重复；CI/其他入口逃逸；仍要处理排除 |
| **seal + 排除（建议）** | 中 | 冻结成为事实；改名不再逼改档案；删除决策有底 | 冻结出链可能腐烂；一次历史修补需要走具名例外 |
| 只做排除、不做封印 | 低 | 停止强制改档案 | 档案仍可被随手改而无人知 |

风险最大的一条是"冻结出链腐烂"。本仓已有 353 条，且 `archived/README.md` 现在承诺
"`md-links` 仍扫 archived"——改成排除是**承诺降级**，必须在同一变更里改写该段，不能让
文档继续声称一个已被放弃的检查。这是本页要求"排除与封印同 diff"的原因。

## 6. 专题四：忘记的校准

### 6.1 参考卷的答案：反指标 + 成对样例

`04-forgetting` 的核心不是四分法，而是两句：**"word count and age are discovery aids, never
archive criteria"**，以及**"不要按配额归档"**。它给校准样例时刻意让字数与判定方向**相互
矛盾**（533 词的小 UI 记录删、248 词的基础决定留；972 词的否决删、426 词的否决留），
并用一句判准把"看起来完整"与"真的可忘"分开："use current code, configuration, package docs,
generated catalogs, newer Agent Notes, and inbound links to establish whether a rationale still
owns or constrains anything."

### 6.2 本仓的实证：判据裸用不可靠

`notes/archived/2026-10-08-notes-stocktake.md` 记录了一次真实实验：同一批 72 篇、同一份
`archived/README.md` 进门条件，三轮独立判定得到**几乎不相交**的名单——宽口径留 72、
严格口径留 35 归档 23、对抗证伪在严格轮抽 8 篇上 **8/8 找出反例**（未兑现承诺 / 假承接 /
被现行面当正本引用 / 判据悬空）。结论是"归档判定这条判据，在本仓不可靠"，于是补了
`archived-note-pointer` 门禁与登记簿。

**但门禁补的是"被引用还想归档"的可见性，不是判据的校准。** 2026-10-08 之后，归档判断仍然
只靠人读；`reviewing-a-delivery` 里只有一条"旧 Note 一致性"（本次决定是否让旧 Note 的现在时
结论变假），不覆盖"该不该归档"。

### 6.3 本仓批量归档的实际判据（只活在 commit message）

2026-11-10 两批共 84 篇。提交原文（`8822e48d` / `2bfc17c7`）给出了判据，而且相当清楚：

> "Selection is evidence-based, not by age. Each entry met the archived/ gate — 完整交付 /
> 不再可能指导未来变更 / 历史价值保留 — checked by grepping every live surface (docs, _backlog,
> scripts, tests, pack) for real references."
>
> "Kept 55 in implemented/ on one test: does this note still own the reasoning for a mechanism we
> are actively maintaining or will change next."

这两句合起来，已经是一份可复用的校准问句 + 取证程序；但它住在 git 历史里，下一位 agent
不会读到。**这就是"校准载体"缺口的准确形态：不是没有判据，是判据没有家。**

而且报告本身也会漂：`8822e48d` 把 `schema-debt-clearance` 与 `quality-evidence-loop` 列进
"判断已机械化"的归档示例，但两篇今天仍在 `notes/implemented/`，且 `git show --name-status`
里没有它们的移动记录——报告与树面至少有两处对不上（前者 41 行、后者 39 行，都在活跃区）。
这不是大错，正是参考卷要求"报告要能对回 diff"的原因：**没有对账步骤，报告就是第二份会腐烂
的清单。** skill 里必须加一条：报告名单与 `git diff --name-status` 逐条对账，对不上就不算
完成。

### 6.4 建议：`.agents/skills/archiving-a-note/SKILL.md`

按参考卷 `dsh-archive-agent-notes` 的形态，做本仓版（一个文件，不新增门禁）：

- **触发**（description 以 "Use " 开头，符合 `dev-skill-format`）：归档、删除、合并、
  审计 notes 时加载；
- **反指标**：字数、年龄、配额一律不当判据；批量归档前先问"这条理由还会不会指导下一次
  变更"；
- **取证程序**（本仓已验证的那套）：读当前代码/配置/docs/门禁台账/后续 Note；grep 全部 live
  面（`docs/`、`_backlog/`、`scripts/`、`tests/`、pack）找真实引用；确认承接 owner 存在且
  完整；确认归档行与指针登记同 diff；
- **五类处置**（本仓现行，不改成 vendor 的四分法）：原地更新 / 历史注记 + 互链 / 合并到
  owner / 删 / archive；每类的判据与边界引 `notes/README.md` §主动清理，不复制全文；
- **校准样例**（用本仓的例子，见 §6.5）；
- **程序**：搬移只加 `> 归档：<日期>` 一行；活面入链重定向或登记；先看 `md-links` /
  `archived-note-pointer` 红，再修到绿（本仓两批归档都是"红→绿"推进的）；
- **报告格式**：保留 / 归档 / 删除各多少、每篇一行的理由、边界个案单列；报告与本轮
  `git diff --name-status` 逐条对账（本仓 2026-11-10 两批的报告已出现对不上的实例，见 §6.3；
  对不上就不算完成）。

### 6.5 校准样表（本仓实例；字数/行数与判定方向无关）

| 判定 | 实例 | 规模 | 理由（本仓证据） |
|---|---|---:|---|
| 留活跃 | [run-bundle-charter](../../../notes/implemented/2026-10-23-run-bundle-charter.md) | 425 行 | 有活测试解析其 §未决；**规模大不是留的理由** |
| 留活跃 | [project-navigability-phase1](../../../notes/implemented/2026-10-05-project-navigability-phase1.md) | 59 行 | evaluation 红证出处；**规模小不是删的理由** |
| 留活跃 | [release-versioning](../../../notes/implemented/2026-10-25-release-versioning.md) | 46 行 | docs/guides 以它为 owner，删了会断链 |
| 归档 | [notes-consistency-sweep](../../../notes/archived/2026-10-30-notes-consistency-sweep.md) | 110 行 | 规则已吸收进 notes/README + notes/AGENTS；历史价值保留 |
| 归档 | [vendor-pin-bump-020rc2](../../../notes/archived/2026-09-30-vendor-pin-bump-020rc2.md) | 131 行 | 被 rc.5 取代；机制已不在 |
| 归档 | [six-dim-hygiene-round](../../../notes/archived/2026-10-21-six-dim-hygiene-round.md) | 44 行 | 一轮已关闭的卫生轮；无独有决定理由 |
| 删 | （见 §6.2 的 8/8 反例） | — | 看起来完整、实际承接不完整：**"承接文件存在" ≠ "唯一理由已被承接"** |
| 边界 | hitl-docking-polish / node-topology-procedure | — | 先补可复核面再归档；"边界个案用判断并留档" |

**读法**：上表刻意让规模与判定方向错开（425 行留、59 行留、110/131 行归档），与参考卷的
校准表同构；但例子、理由与判据全部来自本仓，不搬 vendor 的仓库事实。

## 7. 专题五：命名与措辞——借形式，不借教条

| vendor 习惯 | 本仓实况 | 判断 |
|---|---|---|
| 文件名 = 首提日期 + 主题 | 全部一致；归档不改名，`> 归档：<日期>` 另存"何时冻结" | **已对齐**，且是参考卷"地址语义与状态语义不混"的正面样本 |
| 标题是 `## Problem` 的摘要，正文不重述 | 本仓多数 Note 没有 `## 问题`（82 篇里 8 篇），直接进 `## 决定` | **不借**：决策先行的骨架更短，正文没有重复问题陈述 |
| 动词开头命名 | 文件名是英文名词短语（`verdict-shape`、`data-plane-hardening`） | **不借**：中文正文承担上下文，slug 是检索键；重命名 = 全仓链接噪声 |
| 标题不带状态词（`v2`/`final`/`revisited`） | 有 `plugin-as-product-v2`、`layering-v2`、`reader-final` 与三个 `0.3.x` 发布 Note | **不借**：版本化发布 Note 是有意命名；`reader-final` 是 UI 概念不是 Note 状态。只把"新 Note 不带状态词"写成软规则 |
| 日期不承担"最后修改"语义 | 已对齐（git 承担） | — |
| 同一意义只用一个词 | 本仓中文术语由 `docs/terms.md` 承担 | 已有等价物 |
| 链接代替叙述 | `md-links` + `md-anchors` 强制；相对链接是规则 | **已对齐**；但归档出链要改为排除（§5.3） |
| `INDEX.md` 禁令 | 无 INDEX，但**没有门禁** | 并入 P0 树形门禁 |

## 8. 专题六：执行面与诚实缺口

### 8.1 六类执法者在本仓的对应

| 参考卷的执法者 | 本仓对应物 | 时机 | 备注 |
|---|---|---|---|
| 三个 leaf 门禁 | `note-format` / `note-status` / `note-graduation-rewrite`（c-notes 域） | `pnpm verify`（pre-commit 也跑） | 本仓 pre-commit 跑全量 verify，比 vendor 的 doc-sync 更硬 |
| 归档封印 + git 钩子 | **无**；`archived-note-pointer` 只查入链 | verify | 缺口 = §5 |
| 双语配对 | 不适用（单语仓） | — | 登记在 `discipline-map` 源 4 |
| 全仓门禁的归档排除谓词 | **无**：`md-links`/`md-anchors` 仍扫归档 | verify | 缺口 = §5.2 |
| 人读 skill | `reviewing-a-delivery` 一条；无归档 skill | 按需 | 缺口 = §6 |
| PR review | 本仓无 PR；`reviewing-a-delivery` 承担 | 交付前 | 等价物 |

### 8.2 时机表（编辑期仍然是空的）

| 时机 | 会响的 | 不会响的 |
|---|---|---|
| 写的时候 | 无 | 全部 |
| `git commit` 前 | `pnpm verify`（含 notes 门禁）+ `pnpm test` | 存在性、质量、归档判断 |
| `git commit` 时 | 同一套（pre-commit 钩子） | 同上 |
| 交付/审阅 | `reviewing-a-delivery` 的语义自审 | 机械性 |

与本仓既有事实一致：系统只在落盘之后知道发生了什么。**不要试图补"编辑期"检查**——那是
参考卷也说空的一格。

### 8.3 已知缺口登记（每条附一个能推翻它的观察）

| # | 缺口 | 现状证据 | 可证伪观察（哪份文件/行为改掉后此条变假） |
|---|---|---|---|
| G1 | 该写 Note 而没写，无门禁 | 与 vendor 同构；机械/局部编辑豁免 + 事后归档控制成本 | 出现能判"本次改动触及公开接口却没 Note"的机械检查 |
| G2 | 写了但理由质量差，无门禁 | 语义判断；靠校准 skill + 人读 | 出现可机械判的质量判据（目前没有） |
| G3 | 毕业改写只挡标题/标记，不查内容 | `note-graduation-rewrite` 头注自认；`## 证据待补` 可通过 | 增加任何形式的内容检查（例如证据节须含执行动词） |
| G4 | 归档判断不可靠，只有可见性门禁 | 2026-10-08 三轮实验；`archived-note-pointer` 只查引用关系 | 校准 skill 落地且下一批归档按它执行、报告可复核 |
| G5 | 冻结层无封印、且被链接门禁逼着改 | 28 篇修改记录；探针 F 全绿 | `archive-seal` 门禁 + 出链排除落地 |
| G6 | 树形无闭集/深度/文件名检查 | 探针 A–C 全绿 | `note-tree` 门禁落地 |

**这六条不是缺陷清单，是设计取舍的账。** 写下来的目的与参考卷 `06` 相同：让下一位 agent
知道哪一半是硬的、哪一半是软的，不要把软的当硬的引用。

## 9. 建议的落地顺序（切片）

每片都按本仓的"先红再绿"：先加断言看真实语料红/绿（基线应绿），再注入反证看红，再还原。
门禁登记与反证记录 = `docs/evaluation.md` §L0 + `scripts/verify/context.mjs` 的 gates 数组
（两处同步由 `gate-ledger-sync` 把守）。

### P0-1 · `note-tree`（树形闭集）

- **断言**：`notes/` 顶层目录 ∈ `{proposed, implemented, rejected, archived}`（README 除外）；
  生命周期目录内**只允许普通文件**（README 允许）；Note 文件名匹配 `^\d{4}-\d{2}-\d{2}-.+\.md$`；
  `notes/` 下任何 `INDEX.md` 报错；扫描集为空报错。
- **成本**：一处门禁（约五十行）+ `context.mjs` 名单 + `evaluation.md` 台账行 +
  `tests/checks/verify-gates.test.mjs` 静态对账 + `gates.e2e` 至少两案例（嵌套目录 / 无日期文件名）。
- **红证**：探针 A–C 已证现状全绿；加断言后同一注入应红，删注入复绿。
- **注意**：允许文件名含点（`0.3.x` 发布 Note），所以别照抄严格的 kebab 正则；日期前缀 + 非空
  主题即可（与 vendor 的格式门禁同款）。

### P0-2 · `note-format` 扩展（元数据）

- **断言**：状态行恰一条且在前七行（四态通用）；archived 篇另有 `> 状态：implemented` +
  `> 归档：<YYYY-MM-DD>`，日期是合法日历日且不早于文件名日期；rejected 篇有标题含
  复活/重启/重新引入的 h2。
- **成本**：约三十行；基线应全绿（实测 82+136 篇状态行合规、136 篇归档行合规、10 篇拒绝条
  有重启节）。
- **红证**：探针 D/E；另注入一篇无归档行的冻结件、一篇删掉重启节的拒绝条。
- **注意**：archived **不查骨架**（冻结件不追改），只查元数据；这是与 vendor 的
  `validateMetadata` 对齐、与 `note-format` 的活跃区骨架分离。

### P0-3 · 归档校准 skill

- **落点**：`.agents/skills/archiving-a-note/SKILL.md`；`notes/README.md` §主动清理加一行指针。
- **成本**：一个文件（约七十行，含 §6.5 样表）；`dev-skill-format` 会检查 frontmatter。
- **验收**：无机械红证（技能不是门禁）；验收面 = 下一次归档批按它执行并留下报告，
  且报告能逐条对上 `git diff`（保留/归档/删除计数与名单）。

### P1-1 · 封印 + 出链排除（同 diff）

- **断言**：`notes-archive-seal.json` 每条存在且哈希一致；每篇冻结 Note 都在清单里；
  空语料/空清单红；例外必须是具名前后哈希对 + 理由。
- **配套**：`md-links` / `md-anchors` 跳过 `notes/archived/**`；`archived/README.md` 的
  "已知限制"改写成明确规则（不声称出链有效）。
- **成本**：约一百五十行（含 `--write` / `--reseal`）+ 台账 + 两案例 + 一次全量封印提交。
- **红证**：探针 F（追加一行 → 加封印后应红）；改名一个被冻结件链接的活跃文件 → 排除后
  不应再红（与今天的 767674b1 形态对照）。
- **风险与边界**：清单可被同时改（可见性防护，不是密码学）；冻结出链腐烂只影响历史读者；
  真需要修档案时走具名例外，让"破例"留下两次编辑。

### P1-2 · 功能移除负向证明（散文）

- **落点**：`notes/README.md` §决定覆盖与取代检查；`reviewing-a-delivery` 的跨面自检加一项。
- **成本**：六行左右；无门禁。
- **验收**：下一次移除类 Note 的「输掉的方案」须含原动机、为何不再成立、完全移除的替代方案、
  放弃的能力、重新引入条件；review 勾选。

### P2 · 条件触发（现在不做）

- **class 层**：触发 = 机制名检索失败，或按类批量审阅成为常态；前置 = P0-1 已落地；
  硬约束 = 封印后不重组 `archived/`（§3.5）。
- **`> 类型：` 字段**：不借；分类没有消费者会腐烂。
- **提案期标题禁行**：不借（§4.5）。
- **动词命名 / 禁 `v2`**：不借（§7）。
- **存在性/质量门禁**：不借（G1/G2）。

## 10. 实测附录

### 10.1 探针 A–F（HEAD `8e935037`，跑完即删；清理后当时无残留）

```sh
# A 嵌套目录逃逸
mkdir -p notes/implemented/probe-depth
printf '# probe\n\nno status, no sections\n' > notes/implemented/probe-depth/bad.md
printf '# probe dir\n' > notes/implemented/probe-depth/README.md
node scripts/verify/verify.mjs --only=note-format,note-status,note-graduation-rewrite
# → PASS ×3（期望：深度错红）

# B 未知生命周期层
mkdir -p notes/probe-layer
printf '# probe\n\nno status\n' > notes/probe-layer/bad.md
printf '# probe\n' > notes/probe-layer/README.md
node scripts/verify/verify.mjs --only=note-format,note-status,note-graduation-rewrite
# → PASS ×3（期望：未知层红）

# C 无日期文件名
printf '# probe\n\n> 状态：implemented\n\n## 决定\nx\n\n## 输掉的方案\ny\n\n## 验证\nz\n' \
  > notes/implemented/notadate.md
node scripts/verify/verify.mjs --only=note-format,note-status
# → PASS（期望：文件名格式红）

# D 重复状态行
printf '# probe\n\n> 状态：implemented\n\n## 决定\nx\n\n## 输掉的方案\ny\n\n## 验证\nz\n\n> 状态：rejected\n' \
  > notes/implemented/2026-11-13-probe-dup.md
node scripts/verify/verify.mjs --only=note-format
# → PASS（期望：状态行唯一性红）

# E 无元数据的冻结件
printf '# probe archived\n\nno status, no date, no sections\n' > notes/archived/2099-01-01-probe.md
node scripts/verify/verify.mjs --only=note-format,note-status
# → PASS（期望：归档元数据红）

# F 修改冻结件
printf '\nappended after seal\n' >> notes/archived/2026-09-24-review-driven-hardening.md
node scripts/verify/verify.mjs
# → 全绿（期望：封印红）

# 清理（已执行；清理后当时 git status 无残留）
rm -rf notes/implemented/probe-depth notes/probe-layer \
  notes/implemented/notadate.md notes/implemented/2026-11-13-probe-dup.md \
  notes/archived/2099-01-01-probe.md
git checkout -- notes/archived/2026-09-24-review-driven-hardening.md
```

### 10.2 语料统计（口径）

- 篇数：`ls notes/<layer>/*.md | wc -l` 减 README；日期/理由：逐篇正则 `^> 归档：`；
- 家族：文件名去 `yyyy-mm-dd-` 后取首 token；
- 出链/入链：Markdown 链接解析 + 相对路径规范化（含 `#fragment` 剥离），外链与锚点单列；
- 登记簿：`scripts/archived-note-pointers.json` 的 `pointers` 数组逐条对账（187 对 / 89 个
  唯一冻结目标 / 94 个活面源）；
- 冻结件修改史：`git log --diff-filter=M --numstat -M0 -- notes/archived`（关掉 rename 检测，
  否则"移入归档"会被显示成 R099，读不出真实动作——参考卷的取证技巧）。

### 10.3 读取范围

- 参考卷八篇逐篇通读（`00-map` … `08-enforcement-sites`），只取"主张与判据"，不搬其仓库数字；
- 一手定义：`vendor/dsh/.agents/notes/{README,AGENTS}.md`、`implemented/AGENTS.md`、
  `archived/AGENTS.md`、`.agents/skills/dsh-archive-agent-notes/SKILL.md`（只读，未改）；
- 本仓：`notes/` 四层宪章与全部条目标题、`scripts/verify/gates/{c-notes,a-docs}.mjs`、
  `docs/evaluation.md` §L0、`docs/discipline-map.md` 源 4、`_backlog/triggers.md`、
  `2026-10-08` 体检与 `2026-10-10` 裁定 Note、`2026-11-10` 两批归档的提交原文。

## 11. 什么会改变这些结论

| 结论 | 会改变它的观察 |
|---|---|
| 不加 class 层 | 机制名检索实测失败（已知存在的条目搜不到）；或"按类通读"成为常态且有人接受迁移成本；或本仓开始从"吸收/审计为主"转为"feature/bug-fix 为主" |
| 不加 `> 类型：` 字段 | 出现一个真正消费分类的机械检查或 review 清单；否则只会腐烂 |
| 树形门禁该做 | 任何一次真实发生的"嵌套 Note 逃过门禁"（当前只是探针，尚未发生）；或有人提议加层 |
| 冻结封印该做 | 若真的出现"冻结件必须修"的高频需求（例如每月数次），封印会变成官僚——此时应改为软冻结 + 显式重定向记录，而不是继续声称"正文永不修改" |
| 归档 skill 有用 | 下一批归档仍然无法复述判据，或报告与 `git diff` 对不上；若归档停止发生，skill 休眠但无害 |
| 功能移除负向证明 | 下一次移除类 Note 已经自然写全了五项；或本仓不再移除功能 |
| 出链排除可接受 | 真实读者按归档出链找现行文件且频繁失败；此时应把高频目标改为"历史指针登记"而不是恢复全扫 |
