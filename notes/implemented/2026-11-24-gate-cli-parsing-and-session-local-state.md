# 门禁 CLI 解析与会话本地瞬态（BUG-404…411）：位置参数、唯一正本、代次与「未知不冒充方向」

> 状态：implemented
>
> 批索引/证据 = 逐卡 `json fix-evidence`（归档池 `_backlog/_archived/fixed_bugs/`）；
> 本 Note 记决定理由、输掉的方案、实际验证与未证边界。
> 前置批 = [2026-11-23 读失败与异步收尾](../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)。

## 决定

1. **CLI 位置参数与带值选项必须由同一份解析器分离**（BUG-406）。`checks/lib/shared/cli-entry.mjs`
   新增 `cliArgsOf(argv, { valueFlags })`：`--sessions` 消费下一个 token 作值，值不进 positional；
   缺值/值被下一个选项顶掉 = 结构化错误（壳 exit 2），不再是未捕获 `TypeError`。node-gate /
   evidence-audit / verdict-audit 三壳统一接入——此前各写一份过滤，两个壳用
   `argv.find((a) => !a.startsWith('--') && a !== sessionsRoot)`，`sessionsRoot` 是 `resolve()` 后的
   绝对路径、raw argv 多为相对路径，比较永不相等 → 会话目录被当成 bundle 审，门 R 明明 RED 却
   exit 0 假绿。

2. **门禁消费结构字段时只认声明过的路径**（BUG-405）。`plan-gate` 的 BUG-328 快照事实比对读
   `node.budget`（`PlanNode` 上不存在，真路径是 `node.cells.budget.value`）——预算维度恒为空，
   只调 budget 的合法重写被判「无差异」RED。改后与同文件字段门（第 62 行）同源。

3. **frontmatter 解析只有一个正本**（BUG-407）。`acceptance-check` 的 `frontmatter_fields` 曾有
   自己的一份 LF-only 影子正则（`^---\n` + 逐字段 `^k:`），CRLF 证据卡被整卡判缺字段；改为复用
   `splitFrontmatter`（`\r?\n` 兼容），真缺字段仍 FAIL（负控在守卫里）。

4. **「重试」必须命中出问题的那个数据面**（BUG-408）。`useConfigFeed` 新增 `retryAdoption()`
   （`adoptionTick` 进 adoption effect 依赖）；`ResearchConfigTab` 的 question 读失败/空横幅改调它，
   不再错调整库 `reload()`——后者在 COMPACT 界面下刷的是用户看不见的方法库读。

5. **绘制 watcher 基线必须跟随用户正在看的视图**（BUG-404）。`ResearchFinalTab` 新增
   `viewRef`（渲染期同步 + 地址切换重置为 `reader`），`load()` 计算 `watchTargetOf` 时用它——
   硬编码 `view: 'reader'` 会让审计版/工作稿在重读一次后永久失去更新监测。

6. **会话本地瞬态绑 `sessionId`，在途请求按代次作废**（BUG-409）。`StartCard` 的
   `choosing`/`chooseError` 在 `[sessionId]` 变化时复位，目录选择请求带 token（切会话/重复点击后
   旧 promise 的 `.then/.catch/.finally` 一律不写状态）。

7. **失败详情按类型收窄，未知不冒充具体值**（BUG-410）。新增 `lib/shared/error-detail.ts` 的
   `errorDetailOf`：`Error → message(name 兜底)`、字符串原样、`{message}`/`{code}` 取可读项、
   其它非 null 值 `String()`、null/undefined → fallback。三处消费点（起步卡、方法库写队列、
   抓取回退编排）统一——`(error as Error).message` 曾把非 Error 拒绝值渲染成字面量 `undefined`。

8. **流式入参的「读不到」是三态，不是默认值**（BUG-411）。`tool-card.ts` 新增
   `stringFieldOfArgsRaw`（从截断前缀里提取已到达的字符串字段，按 JSON 转义解码）；工具卡的
   `defaultAction` 改成 `set | clear | null`，`null` 用新增中性键 `toolDefaultRunning`
   （zh/en）——运行窗口不再把 set 说成「正在清除默认偏好」。

## 输掉的方案

- **给两个壳补 `argv[i - 1] !== '--sessions'`（verdict-audit 的旧写法）**：仍无法处理
  「`--sessions` 值恰好是另一个 flag」「缺值」「值带空格」；三份手写filter 会继续漂移。
- **`--sessions` 值缺失时退回默认 sessions 根**：会让一条本该参数报错的命令悄悄审错 home，
  正是 BUG-406 那类「假 PASS」的近亲；宁可 exit 2。
- **让 `acceptance-check` 的正则加 `\r?`**：仍是第二份 frontmatter 语法（字段名规则、重复键、
  值裁剪都会再漂）；复用正本没有额外成本。
- **把 question 重试也接到 `reload()` 再顺带重读 adoption**：reload 会推进 epoch、abort 在途读，
  且语义是「方法库」，两条数据面耦合；独立 `retryAdoption` 最小且可解释。
- **终稿 watcher 每次 `load()` 后干脆按当前渲染的 `displayed` 路径重算**：要求 load 先完成渲染
  决策，而基线必须在 load 内落定；`viewRef` 是同一事实的更早读取点。
- **`errorDetailOf` 对未知值返回空串**：模板会渲染成「失败：」，仍丢失原因且无法区分
  「没有原因」与「原因为空」；显式 fallback（默认 `unknown`）更诚实。
- **工具卡未知 action 时默认 `set`**：只是把 BUG-411 的方向反过来，仍是冒充；中性文案是唯一
  不撒谎的选项。

## 实际跑过的验证

- **红→绿**（逐卡 `json fix-evidence` 记实跑命令与退出码）：404/408/409/410/411 住
  `tests/cockpit/client/{tabs-fault-matrix,start-card,method-library/method-library-tool-card}.spec.mjs`；
  405/406/407 住 `tests/run/gates/{plan-gate,gate-cli-args,acceptance-check}.spec.mjs`。
  每卡均以「临时还原缺陷 → 定向测试 exit 1」采集红证，还原后同命令 exit 0。
- **真入口（CLI）**：BUG-406 复现脚本——`--sessions` 在 bundle 前/后两种顺序都 exit 1（真红
  bundle）；缺值 exit 2 且无 `TypeError`；evidence-audit 在 sessions-first 下仍数到 bundle 里的
  1 份证据（证明审的是真 bundle）。
- **全套**：`pnpm lint` 0/0；`tsc -b packages/deep-research-pack` 与 `tsc -p tsconfig.scripts.json`
  零诊断；`pnpm build`（pack 双半构建）通过；`pnpm test` spec 1582 + checks 270 全绿；
  `pnpm verify` 全绿（dist 已按新 pack 源重建）；asset ledger 262 资产 / guard ledger 265 卡重算一致。

## 未证边界（留给触发）

- **浏览器真机未跑**：本批 404/408/409/410/411 的行为证据是 JSDOM + RTL；观感与真实目录选择器
  仍在 `client-load.entry` 档。本环境上次尝试的阻塞（主机负载预检 + `node-addon-require-builtin`
  原生 build 缺席）属于机器前置，未在本批修复范围内；触发 = 下一次发布前收尾或在能起 dev web
  的环境补跑 `client-load.entry --seed tests/fixtures/client-load-home`。
- **`cliArgsOf` 只支持「带值选项」一种形态**：`--flag=value` 写法暂不识别（全仓 CLI 目前都用
  空格形式）；新增写法时先扩解析器并补负控，不要在壳里再写第三份过滤。
- **工具卡的容错字段提取只取字符串字段**：数组/对象字段（如 `queries`）仍走 `parseArgsObject`；
  若将来有卡片需要在流式期展示数组首项，需另加带类型的提取器。
