# 回执、判型与 topics 值解析的单一正本（BUG-424…430）：声称 ≠ 事实、同一签名同判、文法等价

> 状态：implemented
>
> 批索引/证据 = 逐卡 `json fix-evidence`（归档池 `_backlog/_archived/fixed_bugs/`）；
> 本 Note 记决定理由、输掉的方案、实际验证与未证边界。
> 前置批 = [2026-11-24 编码等价与门禁判据前提](../../notes/implemented/2026-11-24-encoding-equivalence-and-gate-prerequisites.md)。

## 决定

1. **回执 schema 只有一份判据**（BUG-425）。`checks/lib/shared/run-receipt.receiptProblems` 不再
   自带一套哈希校验，而是先调 pack `decodeDeliveredReceipt`（`version=1` / 非空 `slug` /
   `acceptedAt` / `gate.status=PASS`），再做 bundle 目录 slug 对账，最后跑哈希对账。
   门禁不得比驾驶舱更宽松——旧实现里 `version:2`、`gate.status:FAIL`、slug 不符都能「交付件齐」。

2. **回执声明的版本必须由盘上事实核对**（BUG-424）。`useStatusFeed` 用
   `receiptDeclaredVersionOf(receipt)` 与 `finalFileNames` 对账：声明 `final/vN` 而该版本不在场 →
   `receiptDelivery = null` + `receiptDangling` 状态 + `statusReceiptDangling` 告警。回执只能自证
   「曾这样写」，不能自证「文件还在」；「已交付」必须由在场事实支撑。

3. **HITL 判型只有一个入口**（BUG-426/427）。`isDeliveryReviewCard`（交付代答闸入口）与
   `isKickoffCall`（立项窗口抑制信号）都改调 pack `hitl-fold.askKindOf`：结构化 id
   （`hitl2_delivery` / `research_type`）优先、语言无关，文案签名只作历史兜底且补齐英文。
   旧实现各自认中文字面（「定稿」「研究类型」），英文卡/结构化 id 卡在两个消费点上判型相反。

4. **topics 值文法单一正本**（BUG-428/429）。
   - `lensDeclarationOf(line)`：bullet `-`/`*`/`+` 等价、键大小写不敏感、括号必须成对、
     `[]` 是合法零 lens、无括号空值 = 读不出。`lensScanOf`（文件级）与 `parseTopicsReport`
     （topic 级）都只调它——换一个列表符不再静默丢 lens 义务，坏括号在两条路径上同判「读不出」。
   - `dependsOnValueOf(raw)`：剥括注/强调后切分；`无`/`none`/`—` = 空依赖。真实 run 的
     `无（下游以此为准）` 不再变成「topic 不存在」的假悬空。

5. **findings / topics / plan 三门接入契约纪元**（BUG-430）。新增
   `FINDINGS_CONTRACT_DATE` / `TOPICS_CONTRACT_DATE` / `PLAN_CONTRACT_DATE = '2026-11-18'`
   （三门落地日，commit b0021fe0 / f2100ff1），三门在**违约时**按 `isPreContract` 判
   `PRE-CONTRACT`（如实报告不计红、带 `PRE_CONTRACT_NOTE`），与 leads/version/heading/delivery/
   reader 五门同口径。门禁对历史 bundle 恢复区分度（此前 54/56 findings 全红 = 无信号）。

## 输掉的方案

- **给 `receiptProblems` 再写一份 schema 校验**：正是本批要消灭的「第二份手抄件」；pack 的
  `decodeDeliveredReceipt` 已是驾驶舱与交付门共用的合同，复用它才能保证两侧同判。
- **状态页只把「回执声明版本缺席」当成 `reads.receipt = invalid`**：会复用「回执不合法」的
  措辞，而这份回执在 schema 上是合法的；拆出 `statusReceiptDangling` 才能让修正提示指向
  「检查 final/ 版本账」，不是「重写回执」。
- **让 `deliveryFromReceipt` 自己探测盘上**：它是纯函数（无 IO），加文件系统依赖会把驾驶舱的
  纯折算层拖进 IO；在场性由调用方（feed）注入事实。
- **`isDeliveryReviewCard` 只补英文正则**：仍会与 `askKindOf` 分叉（结构化 id 卡、未来新增
  语言）；判型入口只能有一个正本。
- **`lensScanOf` 与 `parseTopicsReport` 各自保留文法、只把两边改成一样**：两份实现迟早再漂；
  共享 `lensDeclarationOf` 才是「同语义同实现」。
- **`depends_on` 用「token 形如 T\d+ 才算 id」筛**：会把未来非 `T\d+` 的合法依赖 id 静默丢掉；
  正确做法是剥注记（语法层）而不是猜 id 形状。
- **三门只加日期、不区分违约**：那样历史 bundle 仍会因新判据红（只是换成别的红）；必须
  复用 `isPreContract` 的三态（N/A / PRE-CONTRACT / RED）。

## 实际跑过的验证

- **红→绿**（逐卡 `json fix-evidence`）：424 住状态页故障矩阵、425 住 `run-receipt.spec`、
  426 住 `ask-drive.spec`、427 住 `bundle-bind.spec`、428/429 住新文件
  `tests/run/gates/topics-parsing.spec.mjs`（把文法判据与 topics 结构判据分文件，避免把
  `topics-contract.spec` 的 oracle 类型从 structured 拖成 canonical）、430 住
  `node-gate-contracts.spec`。每卡以「临时还原缺陷 → 定向测试 exit 1」采集红证，还原后同命令 exit 0。
- **语义变更随同 diff 改断言**：`ask-drive.spec` 的旧断言「仅按选项标签识别不到」改为
  「判型正本认得」（该卡的 wire 文本含 hitl2 签名，属判型正本的职责）；`run-receipt.spec`
  的哈希夹具补上 `acceptedAt`/`gate`（schema 是合同的一部分）。
- **全套**：`pnpm lint` 0/0；两份 `tsc` 零诊断；`pnpm test` spec 1605 + checks 273 全绿；
  `pnpm verify` 全绿（dist 已按新 pack 源重建）；asset ledger 重算一致 / guard ledger 284 卡。

## 未证边界（留给触发）

- **浏览器真机未跑（NOT-RUN ≠ pass）**：424 触及 client（状态页交付横幅），证据是 JSDOM + RTL；
  观感仍在 `client-load.entry` 档。本批复跑记录：`pnpm build` 通过后仍被主机健康预检拒绝
  （load/cpu 1.97 > 1.5，负载来自本批之外）。触发 = 下一次发布前收尾或换环境补跑
  `client-load.entry --seed tests/fixtures/client-load-home`。
- **契约日按提交日取（2026-11-18）**：若某场 run 在该日当天交付、且写的是旧形态，
  会被判 PRE-CONTRACT 豁免一次；这与同族五门的「日粒度」口径一致，未做时分精度。
- **`lensDeclarationOf` 的括号闭集 = `[...]`**：其他括号（`【】`/`（）`）不认，按「读不出」
  处理；若真实 run 出现这类书写，先扩文法并补矩阵，不在消费方特判。
- **回执 slug 对账取 `basename(bundleDir)`**：`--sessions` 之外的非标准 bundle 目录名（无
  `drt_` 前缀）仍按 bare slug 比；若将来支持嵌套 bundle 目录，需扩这一处。
