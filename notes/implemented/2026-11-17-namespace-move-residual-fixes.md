# 命名空间搬家残差修复（批 G：BUG-209…218）

> 状态：implemented

## 决定

1. **文档可读面 = 一个枚举器 + 一张形态台账**（BUG-210/211/214）。`checks/lib/repo/doc-surface.mjs`
   是唯一正本：把「agent 能读到一条路径/命令」的写法折成 token 流（反引号 / 散文 / 表格 /
   shell 围栏纯路径行 / HTML href / 链接标签 / 围栏命令 / 四空格缩进 / CI `run:` 折叠块），
   命令归一（env 前缀、`./`、sudo·env·time、`&&`·`;` 链、`--require=` 赋值、heredoc body）也在此。
   消费门禁只消费 token，不再各写正则——旧实现的判据面一直窄于承诺面，同机制已复发六次
   （160/172/192/193/198/204/206 之后是 210/211）。`SHAPES` / `COMMAND_FORMS` / `ASSERTION_CASES`
   与 `gates.e2e` 案例**双向对账**（`tests/checks/doc-surface-shapes.test.mjs`）：形态被删、案例被删、
   或偷偷加案例不登记形态，都红。这是本轮唯一防止「补丁式复发」的机制。
2. **活/冻结按「是否被当当前步骤读」划分，不按目录**（BUG-212）。`_backlog/methods/*.md` 与
   `_backlog/triggers.md` 被技能、根 AGENTS 与 guides 当现行指令读，纳入 `doc-paths` /
   `call-surface` / `count-free` 的扫描面；`_archived/`、`issues/`、`bugs/`、`research/` 留作历史层。
   同变更把方法文档里的旧根命令改成现行根（`checks/smoke`、`checks/run-gates`、`tools/channel` …）。
3. **退役根判据收紧为「裸目录名可讨论，具体文件必红」**（BUG-211）。旧版用「同句含退役/旧根」放行，
   被 gates.e2e 的退役根注入当场绕过（注入行自己就写着「退役根探针」）。现在只有尾斜杠裸目录名、
   vendor/包内 shorthand 放行；链接文字同一口径。
4. **计数名词闭集收口**（BUG-214）。`checks/lib/repo/doc-counts.mjs` 的 `COUNT_NOUNS` 是唯一词表，
   「案例 / 注入案例」入表；词表窄于承诺 = 换个名词就静默逃检。活指令面同扫；`guides/67` 与
   `class-level-guards` 的「108 案例 / 248s / 86s」改为指 `CASES` 正本与实测命令。
5. **退出码契约有唯一出口**（BUG-213/217/218）。`checks/lib/shared/cli-exit.mjs` 提供 `EXIT`（0/1/2）、
   `usageError`（usage/前置 = 2）与 `verdictOf`（全 SKIP = 2；有 FAIL = 1；有 PASS 的混合 = 0）。
   `run-dashboard` / `run-kickoff` 的 usage 分支改走 `usageError`；`run-lane` 汇总改走 `verdictOf`，
   无匹配消息补 `--all` / `--list` 修正入口。真进程证据住 `checks/smoke/cli-exit.e2e.mjs`
   （默认回归禁子进程，layering ①/②；spawn 只能住 smoke 道）。
6. **CI 频率拆成两档**（BUG-215，用户 2026-11-17 拍板）。registry 的 `tier` = 频率：`ci` = push/required、
   `nightly` = 夜间承重、`dev-only` = 手动 + 理由。11 条原 `ci` 改 `nightly`，`cli-exit` 进 nightly；
   `smoke-registry` 分别对 `ci.yml` / `nightly.yml` 断言（双向：工作流执行面 ↔ 标记）；
   `smoke-cost-budget` 分列 required（≤3）/ required slow（≤3）/ nightly（≤12）/ slow 总数（≤15）。
   `run-lane` 默认跑自动挂载面（ci ∪ nightly），`--all` 才带 dev-only。
7. **身份表与扩展名闭集按角色判，不按手写枚举**（BUG-209/216）。asset-ledger 的分类/白名单表路径
   必须存在（死路径只会让命中资产静默掉档，同一张表重算永远自洽）；`tests/` 非测试模块闭集扩到
   `.ts/.tsx/.js` 且必须带 `-helpers.<ext>`，其它扩展名兜底红（闭集按文件角色，不按扩展名列表）。

## 输掉的方案

1. **按形态逐条补正则**（BUG-210 卡上的原始修法）：env 前缀、`./`、sudo、`&&`、heredoc、`>-` 各加一条
   分支。这正是同机制前六次的失败路径——补完仍没有「形态清单是否覆盖承诺」的机械事实。选台账 + 归一器。
2. **把退出码测试放进 `tests/checks` 并 spawn**：`layering` ①/② 明确禁回归层子进程，写了也会红；
   契约的**判定**放纯函数（`verdictOf` / `noMatchMessage`），**真 exit code** 放 smoke。
3. **保留「同句讨论退役即放行」**：该豁免让 gates.e2e 的退役根注入自我豁免（注入文案含「退役」），
   等于给门禁留了一个由作者措辞控制的旁路；改成裸目录名白名单。
4. **只把预算改名、不拆 tier**（BUG-215 方案 2）：成本单位仍不可区分 required 与夜间，「required 只留
   最小集」继续失真。用户拍板拆两档，接受 registry 与两份工作流各一条对账。
5. **从 helper 头注自动推导分类表**（BUG-209 follow-up）：先把「双份事实」收口为存在性守卫；
   自动推导是更大的设计变更，不在本轮。

## 实际跑过的验证

- `pnpm verify` 全绿（含新增的 doc-surface / doc-counts / cli-exit 资产；`gate-ledger-sync` /
  `backlog-liveness` / `guard-red-record` / `staged-change-pairing` 同绿）。
- `pnpm test` 全绿（新增 `doc-surface-shapes` / `doc-counts` / `cli-exit-contract` 三件门禁自测；
  `asset-ledger` / `test-placement` / `smoke-registry` / `smoke-cost-budget` / `smoke-lane` /
  `ci-workflow` / `guard-ledger` 同更新）。
- `node checks/smoke/gates.e2e.mjs` 全量：对照组零注入全 PASS + 全部注入案例点名红；本轮新增
  14 条注入（doc-paths 形态 4、call-surface 命令形态 8、count-free 名词 1、test-placement `.ts` 1）；
  全量 156 个注入案例 + 零注入对照组全绿。
- `node checks/smoke/cli-exit.e2e.mjs` 绿：usage/前置 = 2、真失败 = 1、全 SKIP = 2、消息含修正入口。
- 逐卡红证回放（临时还原旧行为 → 同一命令红 → 还原 → 绿）：209 死路径进分类表；210 命令归一退回
  行首；211 根集合去掉退役根；212 `_backlog/` 整树豁免；213 usage exit 回到 1；214 词表退回四名词；
  215 一条 nightly 件误标 ci；216 扩展名退回 `.mjs/.cjs` 且删兜底；217 消息删 `--all`；218 `verdictOf`
  退回「只按 FAIL 数退出」。红证命令与输出逐卡记在 `fix-evidence.red`。
- 门禁自身的形态覆盖由 `tests/checks/doc-surface-shapes.test.mjs` 双向对账（台账 ↔ 枚举器 ↔ 案例）。

## 残余风险

- **nightly 侧未真跑**：tier 拆分与 `cli-exit` 进 nightly 只在本机由 `smoke-registry` 的静态对账证明；
  `nightly.yml` 的真实执行要等下一次夜间/手动触发（「跑了但不在门里」与「声明」是两件事）。
- **围栏语言边界**：非 shell 围栏（`json` / `text` / `yaml`）里的裸路径行仍按示例处理，不判存在性；
  无扩展名散文路径（`checks/dev`）也不判——两者是显式边界，写在 `doc-surface` 头注与 evaluation 行。
- **`--require=` 的路径只在命令上下文抓**：单独写在散文里的 require 目标不在此判据面。
- **required 档当前为 0**：预算的 required cap（≤3）是给未来的 push 面留的口，第一条 required 资产
  出现时需重估该上限。
- 本轮未改产品代码（pack 源 / client / preset），L1/L2/L4 未重跑；证据面 = L0 门禁与 keyless 回归。
