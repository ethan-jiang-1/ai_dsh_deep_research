# vendor wire 语义与日志尾帧（BUG-431…434）：未知不是失败、同一签名同判、尾部坏不是整份坏

> 状态：implemented
>
> 批索引/证据 = 逐卡 `json fix-evidence`（归档池 `_backlog/_archived/fixed_bugs/`）；
> 本 Note 记决定理由、输掉的方案、实际验证与未证边界。
> 前置批 = [2026-11-24 回执/判型/topics 单一正本](../../notes/implemented/2026-11-24-single-source-receipt-signature-topics.md)。

## 决定

1. **中断语义按 vendor 的真实 wire 码判**（BUG-431）。`cardStateOf` 认
   `TOOL_OUTCOME_UNKNOWN` / `TOOL_NOT_STARTED`（vendor `repair.ts` 的 `openTurnClosers` 合成
   `tool/result` 携带）→ `stopped`；`'interrupted'` 保留为历史兼容（那是 `turn/end.reason` 的
   cause 名，不是 error code）。两张工具卡据此渲染「结果未知（可重试）」而不是失败：调用可能
   已生效，写成失败会误导重试决策。
   常量在 pack 内写字面量（本件住 client 面，导入 host 侧 session 包会进浏览器 bundle），
   漂移锁 = 单测直接读 vendor 源码里的 `export const …` 行逐值比对。

2. **HITL 判型在所有门禁入口都走 `askKindOf`**（BUG-432）。门①（`hitlAskGate`）的 HITL1 签名
   从「arguments 含中文『研究类型』」改为 `askKindOf(args) === 'hitl1'`——结构化 id
   `research_type` 优先、语言无关，英文题面同样满足。这与同文件门③、观察面（BUG-427）此后
   完全同源：一个 wire 签名只有一个判型入口。

3. **终稿族路径词法在门禁侧复用 pack 正本**（BUG-433）。门② 的 `present` 见证不再用正则硬编码
   `final(?:/vN)?.md`，改调 pack `finalPathOf` + `bundleDirOf` + `finalVersionOf`/`readableVersionOf`：
   `readable.md` / `readable-vN.md` 与 `final.md` / `final-vN.md` 同族。只 present 读者版的交付
   （真实日志里读者版是列表首项）不再被判「present 缺席」。版本字段由文件名词法给出
   （`readable-vN` → N；`readable.md`/`final.md` → null），与驾驶舱 `familyRank` 的优先级一致。

4. **会话日志三态：完好 / 尾部截断 / 中间损坏**（BUG-434）。`decodeSessionLog` 逐帧解析：
   - 干净扫完 → 全解、`truncatedTail: false`；
   - 尾部半帧（崩溃形态，vendor `repair.ts` 就是为它设计的） → 保留已解前缀、`truncatedTail: true`；
   - 中间损坏（失败点之后仍有完整帧头，或损坏帧的声明边界停在缓冲中间） → `null`（整份不可读）。
   单帧还要过两道内容校验：帧头声明的 content-size 必须与实际解出长度一致；解出的载荷必须以
   换行收尾（vendor 一帧 = 若干完整 JSONL 行）。截断帧可能「吞掉」后续帧开头并凑巧解出声明长度，
   这两道校验把它判成损坏，再按「坏帧之后还有没有字节」区分尾坏/中间坏。
   `readSessionEvents` 暴露 `truncatedTail`（不改 `readable` 语义），`runStateOf` 把它外露；
   `hitl-answer`/门①②③ 因此在前缀事件上照常判 pending。

## 输掉的方案

- **在 pack 里 `import { TOOL_OUTCOME_UNKNOWN } from '@deepseek-ai/dsh-session'`**：本件是 client 面
  （faces.json），host 侧包的值进浏览器 bundle 有实打实的运行时风险；改为字面量 + 源码漂移锁，
  等价保护、零打包风险。
- **把 `stopped` 渲染成「已取消」**：取消是操作者主动动作，崩溃恢复是「不知道」——两者语义不同，
  文案不能互换；用「结果未知（可重试）」才与实际状态一致。
- **门① 只补英文正则 `/research type/i`**：结构化 id 卡（文档推荐形态）仍会漏；只有 `askKindOf`
  能同时覆盖 id 与文案。
- **门② 的正则扩成 `final(?:/vN|/readable(?:-vN)?)?.md`**：仍是第二套词法（会漏 `readable` 的
  未来形态）；复用 `finalPathOf` 才是单一正本。
- **`decompressSessionLog` 直接返回 `{ text, truncatedTail }`（按卡文原方案）**：现有调用方把它当
  Buffer 用；新增 `decodeSessionLog` 返回结构化结果、旧函数保留为兼容薄壳，避免一次性改所有消费方。
- **把「尾部截断」也算 `readable: false`、另加字段**：恢复工具（hitl-answer / 门①②③）都以
  `readable` 为总闸，那样等于没修；`readable` 表示「有可用事件」，完整性由 `truncatedTail` 表达。
- **只按 content-size 判损坏**：截断帧吞掉后续字节后可能刚好解出声明长度；补「载荷必须以换行收尾」
  这条 JSONL 契约才可靠。

## 实际跑过的验证

- **红→绿**（逐卡 `json fix-evidence`）：431 住 `tests/run/shared/tool-card.spec.mjs` + 工具卡渲染
  用例；432/433 住 `tests/run/gates/node-gate-session.spec.mjs`；434 住
  `tests/run/shared/run-state.spec.mjs`（读取器三态 + `runStateOf` 消费方）。每卡以「临时还原缺陷
  → 定向测试 exit 1」采集红证，还原后同命令 exit 0。
- **语义变更随同 diff 改断言**：`run-state.spec` 旧的「坏尾帧 → readable:false」改为
  「前缀可读 + truncatedTail:true」（这是本批要改的契约本身）；`run-dashboard.spec` 的 BUG-012
  用例把 `broken` 会话纳入挂起预期（前缀可读 = 崩溃现场的 HITL 可见，「不回退旧代」仍由日志选择
  保证）。
- **全套**：`pnpm lint` 0/0；`tsc -b packages/deep-research-pack` 与 `tsc -p tsconfig.scripts.json`
  零诊断；`pnpm test` spec 1611 + checks 273 全绿；`pnpm verify` 全绿（dist 已重建）；
  asset ledger 重算一致 / guard ledger 288 卡。

## 未证边界（留给触发）

- **浏览器真机未跑（NOT-RUN ≠ pass）**：431 触及 client（两张工具卡），证据是 JSDOM/静态渲染；
  观感仍在 `client-load.entry` 档（本环境阻塞 = 主机负载预检，非本批范围）。
- **中间损坏的判据是启发式**：只有「失败点之后仍有帧头」或「坏帧声明边界停在缓冲中间」才判中间坏。
  若一段字节恰好既解析成完整帧、又解出声明长度、又以换行收尾，仍会被当合法帧——这是无外部校验和
  时的信息论上限；vendor 日志默认不写 checksum，故未引入更强校验。
- **`readable` 语义变宽**：以前 `readable:false` 表示「一个事件都读不出」，现在尾部截断的日志
  `readable:true` + `truncatedTail:true`。未逐个审计所有消费方是否都该把 truncatedTail 展示给用户
  （run-state 已外露；GUI 文案待真机确认观感）。
- **`askKindOf` 的结构化 id 集合**固定为 `research_type` / `hitl2_delivery`；新增 HITL 卡型需同时
  扩该函数与本批三处消费点，不在各门禁里另写签名。
