# discipline-map — DSH 纪律全量枚举（三态表）

> 层：合同（该遵守什么）。本表 = AGENTS.md §纪律首版枚举子集的**全量替换正本**（队列条目
> 「dsh-discipline 全量枚举」2026-09-24 毕业；AGENTS.md 只留指针）。枚举方法 = vendor 逐源
> 清点（"你无法继承你从没清点过的东西"），每行三态：**照搬**（原样继承，带本仓落点）/
> **带证据适配**（语义保留、载体改造，带证据）/ **不适用**（带理由——纯配置仓无该面）。
> 源头 = vendor/dsh submodule（tag dsh-v0.1.5-rc.2，只读铁律）。

## 源 1：vendor 根 AGENTS.md · Conventions

| DSH 做法 | 本仓落点 | 状态 |
|---|---|---|
| Model-visible ⟺ logged（进模型请求的输入必须可从会话日志重建） | 会话日志即真相：L4-lite/探针断言全走 zstd 日志逐事件；手册完成判据 = 文件事实 | 照搬 |
| Misconfiguration fails loud（配置错在最早可判定点炸，不静默跳过） | verify 17 门禁全 fail-loud；boot-run 漂移检测；design/10 记 ENOENT 静默空教训 | 照搬 |
| Files end with exactly one trailing newline | verify 门禁 md-utf8-newline（tracked 全量） | 照搬 |
| Non-trivial changes MUST include an Agent Note in the same PR（机械/局部编辑豁免） | AGENTS §notes 写入触发（同 diff）+ note-format 门禁（骨架/状态行） | 照搬 |
| Plugins, not loop changes（新行为走扩展点，不改 agent-loop） | 本包只经组合面贡献（preset/skill/bundle 行），循环属 DSH 侧 | 带证据适配（纯配置包天然满足；vendor 循环不在本仓改动面） |
| Prefer maintained dependencies over hand-rolling（真能删掉自 owned 代码与测试时） | 测试栈 node:test、zstd 解压 node:zlib、regex 断言——全部维护中的标准件；tsx/pnpm 构建链引入（vendor 落地）而非自造 | 照搬 |
| Tests describe behavior, not correctness（过时行为随测试一起改） | tests/ 契约测试（evaluation-contract 对手册谓词、dashboard 对文件形状）；行为变更同 diff 改锚 | 照搬 |
| No hardcoded tunables（部署可变量必须是 config 字段） | preset 工具行 config（tool-todo allowParallelInProgress、tool-web 超时）皆声明为 config；层版本钉在 pack 兼容矩阵 | 带证据适配（载体 = cordis 行 config 而非代码 Config 类型） |
| TODO 标记分级（FIXME/TODO/XXX 按紧急度） | 沿用（仓内出现时按此分级） | 照搬 |
| Source plane vs artifact plane, never mixed（静态测试走 src，吃构建产物的测试声明依赖） | L1 双通道：preset-smoke 源码域（overlay 指 src）+ 安装域（plugin add 正式路径）；根 tsconfig 门面 = 源码面解析 | 带证据适配（两平面在本仓 = 源码域/安装域两通道，D14） |
| Design each tool's UI presentation up front（呈现先于实现设计） | preset persona/skill 文本 = 工具的行为呈现面，R1 起逐角色先定稿再挂载；观察面 = 先 RFC 后实现（run-dashboard/debug-dashboard-plus 皆然） | 带证据适配 |
| Plan unit/e2e/snapshot coverage for seams | evaluation.md 五面合同（L0–L4）先于框架定案（D6） | 带证据适配 |
| Registrations are effects（一切贡献走 ctx.effect，register 返回 disposer） | 无自写 cordis 插件代码 | 不适用（纯配置包，无 ctx 调用面；DSH 侧机制由 vendor 享有） |
| Runtime invariants assert owned relationships（invariant 包规则） | 同上 | 不适用 |
| Typed events / declaration merging / assertNever / waterfall next() / branded ids / Trust TypeScript / explicit request-spec split / compiler faces | 无 TypeScript 源码 | 不适用（R3+ 若引入 TS 面则重估——vendor-submodule Note 已记 tsconfig 门面就位） |
| ESM everywhere / 包命名与 rescope / cordis peer 约定 | 不发布 npm 包（private pack 经 plugin add 分发） | 不适用 |
| Client UI copy is locale-owned | 无 client UI 代码（观察面 GUI 化条目立项时重估） | 不适用 |
| Choose PR history deliberately / GitHub stacks / Labels taxonomy | 无 GitHub PR 流（本地单仓窄切片提交） | 不适用（等价物 = 窄证据切片 commit 纪律 + pre-commit 门禁） |
| Both SDKs project the loop | 无 SDK 维护面 | 不适用 |

## 源 2：vendor docs/testing.md

| DSH 做法 | 本仓落点 | 状态 |
|---|---|---|
| Tiers：keyless（无凭据可跑）与 with-key 分层 | 档位词汇（AGENTS §密钥）：verify/tests/smokes keyless；l4-lite/team-preflight/entry-chain-probe 真模型档 | 照搬 |
| Verify the world, not the self-report | evaluation L4 判据 + 手册完成判据 + 探针留档人工复核 | 照搬 |
| Test the real entry path（发布产物路径） | release-smoke L2：pack → 干净 profile → plugin add → 安装域冒烟 | 照搬 |
| Prefer the real implementation over a mock | L1 真挂载档（真会话断言工具/skill 面——dump/roster 可见不算） | 照搬 |
| The with-key policy: inference is cheap（语义面用真模型证） | 真模型档三脚本；入口链探针 = 语义漂移的真模型检测 | 照搬 |
| Test resolution: source plane only | keyless 回归断言 tracked 源文件（md-utf8-newline 改 git ls-files 驱动即为此则——运行区不扫，live run 实证） | 带证据适配 |
| Snapshot tests（关键用户可见变更更新录制快照） | 无 client/UI 面；等价物 = tests/fixtures（keyless 形状回归）+ 真模型档会话日志断言（zstd 逐事件） | 带证据适配 |
| Test subprocess launch modes（构建产物/源码启动模式分立） | 无构建产物测试面（vendor lib/ 仅机制基线消费） | 不适用 |

## 源 3：vendor docs/AGENTS.md（文档标准）

| DSH 做法 | 本仓落点 | 状态 |
|---|---|---|
| Tier 分类法：一处事实一个家（docs 只写 now） | 00-index 组织原则；docs/notes/roadmap 三层分工 | 照搬 |
| Wordcount budgets（入口文件行数顶） | verify 门禁 entry-budget（AGENTS ≤145 / README ≤30——vendor verify-doc-budgets 裁剪版；超顶处置序 = 下放>压缩>升顶须 D 号，本表自身即"下放"实证） | 带证据适配 |
| Cross-reference with machine-checkable links, never free prose | md-links 门禁（方括号+圆括号语法全 tracked md）+ entry-chain 门禁（反引号指针盲区补齐） | 带证据适配（反引号裸路径不检 = 已知盲区，entry-chain 探针语义面兜底） |
| Slop checklist（文档废话清单） | 行文规范沿袭（定性吸收，未机械化） | 带证据适配 |

## 源 4：vendor .agents/notes/（Note 生命周期规则）

| DSH 做法 | 本仓落点 | 状态 |
|---|---|---|
| Agent Note 生命周期（proposed/implemented/rejected + archived 冻结） | notes/ 六目录；archived/ 暂不设（差异表：无低价值存量；引入条件已写 notes/README） | 带证据适配（archived 延后，条件在案） |
| Every new Note triggers a supersession check（同决定搜树：更新/互链/吸收后删） | AGENTS §notes 取代检查 bullet + notes/README §决定覆盖与取代检查（SDLC reference 01 吸纳） | 照搬 |
| Alternatives considered mandatory（没记击败了什么 = 会重开讼） | guides/60 §4 骨架 + note-format 门禁（## 输掉的方案在场断言） | 照搬 |
| Implemented Note 保持 current（路径/默认值随实现同 diff；逆转写新 Note 互链） | AGENTS §notes implemented bullet；毕业 = 正文改写（guides/60 §4） | 照搬 |
| Note 格式机械化（verify-agent-note-format） | verify 门禁 note-format（regex 版 + grandfather 条款——本仓轻量适配） | 带证据适配 |
| 归档树 append-only hash manifest | archived/ 未设 | 不适用（随 archived 引入重估） |

## 源 5：postmortem

vendor 与本仓的 postmortem/ 均为空目录（事故复盘的唯一合法层，两侧同构；本仓首个事故按
notes/postmortem/README 落档）。无枚举行。

## 维护规则

- 本表随 vendor 换 tag 重校（roadmap 触发型条目「升 pin 重校」）；新增三态行同 diff 落
  本表，不在 AGENTS.md 复制（一处事实一个家）；
- 首版枚举子集表（三个来源、11 行）已被本表**完整覆盖并扩展**——历史原文见 git（本条目
  毕业时的 AGENTS.md 版本）。
