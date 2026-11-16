# 2026-11-16 · Model Experience：Lead/Scout 首请求计价

> 状态：implemented

## 决定

- 包 README 的 Model Experience 账本此前只计 Method Editor 场景；研究角色（Lead/Scout）的首请求——尤其 D40 常驻注入的 `content/manual.md`——没有计价。新增 `scripts/smoke/model-experience.e2e.mjs`：真 headless Loader 组合（叠 pack 全 preset roster + workers + research-content 手册注入 + 确定性 mock LLM），捕获 Lead/Scout **真实组装的首请求**（`GenerateOptions.messages` + `tools`），用 `@deepseek-ai/dsh-token-meter/estimate` 计价。夹具 = `tests/fixtures/model-experience/{driver,mock-llm}.ts` + `cordis.patch.yml`。
- 计价区分**稳定面**与**易漂面**：工具 schema token（Lead 6,634 / Scout 4,999）与手册 token（2,506）由包版本决定、确定可复跑；首请求**绝对总数**（Lead ≈11.6k / Scout ≈8.7k）含 time-context 每步时钟注入，运行期可变。README 写稳定面 + 近似总数，并把绝对总数的生成命令指向冒烟，不写死易漂的精确总数（同 dim 12「计数写死当天即过期 → 指生成命令」）。
- 手册占比是本次量化的关键事实：`manual.md` 2,506 token ≈ Lead **消息** token 的 50.6%（消息 ≈4.9k，工具 6.6k 另计）。常驻手册占研究角色消息上下文约一半——这是 T0  always-injected 设计的真实成本，供 design/70 内容组织与后续瘦身复议引用。
- Method Editor 节同步把写死的 6,778 改为「+246 schema delta（断言）+ 近似总数 ≈6.8k（随时钟变）+ 生成命令」，消除已观测到的漂移（实跑 6,811 ≠ 文档 6,778）。

## 输掉的方案

- **从 snapshot 录制事件重组首请求再计价**：snapshot B 层录的是事件流，重组「模型实际看到的首请求」需复刻 Loader 装配逻辑，易失真（dim 11 夹具失真红旗）。放弃；改用 mock LLM 在真 Loader 里捕获 `GenerateOptions`（与 method-library-tool 同 gold standard）。
- **手叠 persona+manual+skill+tool 文本估价（不 boot Loader）**：hand-assembled 夹具不等于真实组装（工具 schema 由 preset mount 解析、手册经 runtime context 注入），会给出失真数字。放弃。
- **整叠 cordis.patch.yml 进 headless**：该文件含 web-app 行（ui-trajectory/locale/web），headless=base bundle 无这些行 → entry-not-found。放弃；fixture patch 只 insert research-content + mock + registry，preset 行单独叠。
- **把绝对首请求总数写成门禁断言**：时钟注入使绝对总数运行期可变，钉死它 = 每次跑都假红。放弃；断言稳定关系（正整数、工具 token 与 request/header 一致、手册占比 ∈(0,1]），绝对数指生成命令。
- **新增独立 keyless oracle spec**：计价判据核就是真 Loader 捕获本身，token-meter 估价为 vendor 上游已测，无独立纯函数核可直测；registry oracle 如实写 `none: 理由`，避免为凑核造失真 spec。放弃硬造 oracle。

## 实际跑过的验证

- **红（真实组合缺陷）**：首跑只叠 lead/scout/workers → `RemoteError: Unknown agent preset: analyst`（tool-subagent 校验 allowedAgentPresets，available 仅 lead/scout/research-worker/research-wave）→ exit 1。补全 preset roster（+analyst/critic/method-editor）→ 绿。这是冒烟会咬人的负例。
- `node scripts/smoke/model-experience.e2e.mjs` → PASS：Lead 首请求 11,589 token（工具 6,634）；Scout 8,657（工具 4,999）；manual.md 2,506 token ≈ 50.6% Lead 消息 token。
- `node scripts/smoke/method-library-tool.e2e.mjs` → PASS：+246（6,811 total）——证实 README 旧值 6,778 已漂（时钟变量），改为指生成命令。
- `node scripts/verify/verify.mjs` → 全绿（含 smoke-registry / smoke-oracle-surface / smoke-contract / count-free / readme-shape）。
- `pnpm test:checks` → 绿（registry 键集合 == scripts/smoke/*.mjs；oracle/sunset/cost 形状）。
- **未跑**：CI keyless job 不含本冒烟（dev-only，需 native system.node，同 method-library-tool）；真模型档行为不在本冒烟范围（计价只证组装面，不证模型遵守）。记 U，不写成绿。
