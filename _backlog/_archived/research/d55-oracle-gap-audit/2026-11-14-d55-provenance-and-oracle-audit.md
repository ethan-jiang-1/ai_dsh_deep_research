---
topic: d55-oracle-gap-audit
intent: 还原 D55（2026-11-14-verification-oracle）从 D51–D54 与探索批 A–D 演进的完整来龙去脉，用 HEAD=42b589e7 上的只读实测输出逐一定位五类落地缺口、架构可行边界与闭环方案
---

# D55 验证层 Oracle 落地复盘与缺口取证

> 取证基线：`master @ 42b589e7`（Node `v22.23.1`，`pnpm@11.7.0`）
> 关联前序：[已结卡 2026-11-14-verification-oracle](../../settled_issues/2026-11-14-verification-oracle.md) · [归档调研 verification-oracle](../verification-oracle/README.md) · [Note 2026-11-14-verification-oracle](../../../../notes/archived/2026-11-14-verification-oracle.md) · [失败类普查](../dsh-test-strategy/2026-11-13-failure-class-census.md)

---

## 1. 来龙去脉：为什么会有这张卡，以及为什么首轮落地「力度不够」

把时间线拉通，`2026-11-14-verification-oracle`（D55）并不是孤立任务，而是本仓测试与门禁制度五步演进的收官一环：

1. **D51（2026-11-11，探索性验证制度）**：立 [exploratory-test-strategy](../../../issues/2026-11-11-exploratory-test-strategy.md)，引入 E1–E6 探索环——因为回归全绿仍频繁漏掉真实边界缺陷。
2. **D52（2026-11-12，判据与流程防复发三件套）**：复盘「产品侧 readiness/HITL 反复靠正则词表打补丁」后，定下三条铁律：① 机器判据必须读权威结构化事实（[judgment-design](../../../methods/judgment-design.md)）；② 新契约/判据测试必须带可复核红配方（`guard-red-record`）；③ 成对变更靠 `staged-change-pairing` 机械把守。
3. **D53–D54（2026-11-13，命名即车道 + 三环/四账/五关）**：对历史 **159 张已修 BUG 卡**做全量[失败类普查](../dsh-test-strategy/2026-11-13-failure-class-census.md)，发现两大硬伤：
   - **17 条同类复发链（G1–G17）**——C4（边界/解析，26 张）、C3（双份事实，25 张）、C7（假绿，21 张）居前三；
   - **41 张沉淀缺口（25.8%）**——其中 **§D-1 的 24 张**没有任何永久 keyless 守卫，**§D-2 的 17 张**虽有测试或 gate 但未入 BUG 账或只停留在贵层 smoke。
4. **2026-11-14 探索第 6–9 轮（批 A–D，`BUG-160..190`，共 31 张卡）**：把探索火力转向**验证层自身**（`ci-workflow.mjs`、`note-scan.mjs`、`review-readiness.ts`、`fix-evidence.mjs`、`artifact-freshness.mjs`），结果连出四轮高度同构的「打地鼠」复发：
   - **CI YAML/shell 解析链**：160（提及当执行）→ 161（job id 下划线）→ 163（触发器黑名单）→ 172（`if: false` 仍算执行）→ 177（`${{ }}` 表达式归一）→ 182（`on:` 重复实现 + `{}` 空映射）→ 184（引号/注释内 `${{`）→ 187（`false && node ...` 短路仍算执行）→ 190（`on: { workflow_dispatch: {} }` 流式映射）；
   - **Markdown 遮罩链**：165（引用状态行）→ 169（fenced code 内 verdict）→ 170（加粗标签）→ 175（notes 不剥围栏）→ 178（blockquote/list 容器内围栏）→ 179（HTML 注释未遮罩）→ 183（4 空格缩进标题）→ 185（围栏前同行 HTML 注释吞围栏）→ 188（notes 加粗状态标签）；
   - **修复证据链**：186（散文红绿标记否定词与宽子串）→ 189（目录前缀冒充文件路径）。
5. **D55 立项初衷 vs 实际交付落差**：
   - **立项初衷**（见[原卡](../../settled_issues/2026-11-14-verification-oracle.md)）：验证层自己违反了 D52——用「手写子集解析器 + 作者自写单测」守卫开放语法（CommonMark / GitHub Actions YAML+shell / 散文证据），自参考单测永远证不出作者没想到的语法组合；同时要把普查 §D 的历史沉淀债（S1）与全仓资产账（S3）一次性闭环。
   - **为什么首轮落地力度不够**：执行阶段（`a3c98989..42b589e7`）把「换权威机制 / 收窄写入契约 / 单一真源合并」偷换成了**静态小语料快照 + 局部正则修补 + 硬编码覆盖表**：
     - S2 没消除手写双解析器，只录了 36 条 Markdown 静态 JSON 和 21 条 bash 片段 JSON（且无新鲜度门）；
     - S2b 承诺的「写入侧规范 `run:` 门」直接漏做；
     - S2c 换了 JSON 外壳，但留出 4 条绕过口；
     - S3 造出 `guard-ledger` 与 `asset-ledger` 两本互相对立的台账；
     - S1 用「读源码文件做正则匹配」顶替行为守卫，丢掉了 §D-2 的 17 张卡与批 A–C 的 24 张卡对账。

---

## 2. 架构与工程约束实测（决定什么方案真能落地）

在设计返工方案前，先对本仓打包边界、Node 运行时与门禁规则做只读实测，避免写出违反门禁的纸面方案：

| 约束维度 | 实测命令 / 代码锚点 | 实测事实 | 对方案设计的硬含义 |
|---|---|---|---|
| **插件发布包零运行时依赖** | [packages/deep-research-pack/package.json](../../../../packages/deep-research-pack/package.json) + `pack.e2e.mjs` | 发布包只有 `peerDependencies`（`@deepseek-ai/cordis`、`react`），零 `dependencies`；客户端与服务端由 `tsdown` 打包到 `lib/` | `packages/deep-research-pack/src/lib/` **不能**运行时 import `mdast-util-from-markdown`；pack 内仍须是零依赖纯函数，但**全仓只能有一份源码** |
| **裸 `node` 原生直接 import `.ts`** | `node -e "import('./packages/deep-research-pack/src/lib/review-readiness.ts')"`（无 `--import tsx/esm`） | 在本仓 `Node v22.23.1`（`engines.node: "^22.19.0 \|\| >=24.0.0"`）下**原生通过**；且 `scripts/lib/node-gate-contracts.mjs:5`、`run-dashboard-core.mjs:18` 已直引 `.ts` | `packages/deep-research-pack/src/lib/markdown-mask.ts`（仅用可擦除 TS 类型语法）可同时被 `review-readiness.ts`（进 `tsdown` 产物）与 `scripts/lib/note-scan.mjs`（裸 `node scripts/verify/verify.mjs`）直接 import，实现**真正零副本同源** |
| **`layering` 对 `tests/` 的禁令边界** | [tests/checks/layering.test.mjs](../../../../tests/checks/layering.test.mjs)（第 1–95 行） | 禁 `node:child_process`、`playwright`、凭据字面量、`spawn/exec/fetch`、`http/net`、以及 import `scripts/(smoke\|probe\|dist\|verify)` 或 `probes/`；**允许纯函数 npm 解析库**（如 `typescript`） | ① `tests/` 内可直接跑 `mdast-util-from-markdown` 与 `yaml` AST 解析（零子进程）；② `bash -eo pipefail` 真进程对照不能放 `tests/`，应放 `scripts/smoke/gates.e2e.mjs` 或专用 `.e2e.mjs` |
| **本机 `/Users/bowhead/node_modules/yaml` 假绿陷阱** | `createRequire(import.meta.url).resolve('yaml')` vs `readdirSync('node_modules/.pnpm')` | 根 `package.json` 未直列 `yaml` 与 `mdast-util-from-markdown`：从根直接 `resolve('yaml')` 在作者本机会穿透到仓库外的 `/Users/bowhead/node_modules/yaml/dist/index.js`，到 CI `ubuntu-latest` 必挂！但仓内 `node_modules/.pnpm` **已锁定** `yaml@2.9.1` 与 `mdast-util-from-markdown@2.0.3`（且 [d-vendor.mjs](../../../../scripts/verify/gates/d-vendor.mjs) 第 408 行的 `vendor-links` 只管 `@deepseek-ai/*` devDeps） | 若在 `scripts/lib/` 或 `tests/` 使用 `yaml` / `mdast-util-from-markdown`，应在根 `package.json` `devDependencies` 显式声明锁定版本（或经锁定的仓内 workspace 包锚点解析并禁止越出 `ROOT`），绝不能裸调根 `createRequire` |
| **`guard-red-record` 的真实扫描规则** | [scripts/verify/gates/f-repo.mjs](../../../../scripts/verify/gates/f-repo.mjs)（第 152–186 行） | 只认 `test('...BUG-nnn...')` 标题串为正式守卫声明，注释里的 BUG 号不计；且第 164 行写死 `/conformance\.test\.mjs$/` | D53 把 `tests/contracts/` 改名为 `*.spec.mjs` 后，第 164 行正则**全仓零命中**（见 §3.3 实测） |

---

## 3. 五大缺陷面逐项实证（含 `HEAD = 42b589e7` 实跑输出）

### 3.1 面 1（S2a）：Markdown 遮罩——双份手写状态机未合并 + 5 类相邻语法失真 + 录制器自身算错偏移

1. **违反自身 S3「合并重复解析器」目标**：
   - [scripts/lib/note-scan.mjs](../../../../scripts/lib/note-scan.mjs)（第 18–93 行 `maskFencedCode` + `stripComments`）与 [packages/deep-research-pack/src/lib/review-readiness.ts](../../../../packages/deep-research-pack/src/lib/review-readiness.ts)（第 57–148 行 `maskReadinessLines` + `stripHtmlComments`）各自维护了一套约 90 行的手写围栏/容器/HTML 注释状态机，逻辑几乎同构但变量与返回略异，继续保留 C3 双份事实漂移温床。
2. **手写遮罩与 `mdast-util-from-markdown` 在 5 类相邻 CommonMark 输入上实测分歧**：
   在 `HEAD = 42b589e7` 上将 `mdast`、`maskFencedCode`（`note-scan`）、`maskReadinessLines`（`review-readiness`）并排喂入语料表之外的相邻合法输入，实测结果如下：

   | 相邻输入场景 | 输入文本 | `mdast`（CommonMark 真值） | `note-scan` / `review-readiness` 实际输出 | 生产后果 |
   |---|---|---|---|---|
   | 行内反引号含 `<!--` | ``a `<!--` b\n## Real Heading`` | `["a \`<!--\` b", "## Real Heading"]` | `["a \`", ""]` | Note 或 `review.md` 行内写 `` `<!--` `` 后，**全文后续所有标题与 `终局判据：FAIL` 全部被静默吞空** |
   | 双反引号代码跨度含 `<!--` | ````a `` ` <!-- `` b\n## Real Heading```` | ``["a `` ` <!-- `` b", "## Real Heading"]`` | `["a \`\` \`", ""]` | 同上，未跟踪行内 code span 定界符 |
   | 引用块内未闭合围栏退出容器 | `> ```\n> inside\n## Real Heading` | `[">", "", "## Real Heading"]` | `["", "", ""]` | CommonMark 中块引用结束即自动闭合其内部围栏；手写状态机把 `inFence` 泄漏到全文末尾，吞掉后续正文 |
   | 列表项内未闭合围栏退出缩进 | `- ```\n  inside\n## Real Heading` | `["-", "", "## Real Heading"]` | `["", "", ""]` | 同上，列表项围栏泄漏到顶层标题 |
   | 跨行注释闭合行紧跟第二段注释 | `a <!-- x\ny --> <!-- hidden --> keep` | `["a", "keep"]` | `["a", "<!-- hidden --> keep"]` | `inComment` 闭合分支返回 `line.slice(end + 3)` 未递归剥除同行剩余注释，导致隐藏注释里的 `PASS` 泄漏为真值 |

3. **录制器 `dev/record-markdown-oracle.mjs` 自身含 UTF-16 偏移 bug 与静态死快照**：
   - `dev/record-markdown-oracle.mjs`（第 82–97 行）用 `const chars = [...src]`（按 Unicode 码点拆数组），却拿 `mdast` 的 `node.position.start.offset`（**UTF-16 code unit 索引**）去下标赋空串。实测输入 `'🎯 <!-- hidden --> visible'`（`norm.length = 26`，`[...norm].length = 25`）时，录制器产出 `"🎯 <visible"`（漏出 `<` 并吃掉 `visible` 前空格）！
   - 语料表第 46 行与第 62 行存在重复 `name: 'html block div'`；且 `oracle.json` 与录制器之间**没有任何新鲜度或同源测试校验**——测试阶段本可直接调 `mdast-util-from-markdown` 跑结构化组合生成器（容器 × 围栏字符/长度 × 行内反引号 × 单/多行注释 × BMP/astral 字符），根本不需要靠 36 条手写快照充当二道贩子。

---

### 3.2 面 2（S2b）：CI 工作流——写入侧门缺席、360 行手写 YAML 仍在、`BUG-190` 假 `external` 关闭

1. **漏做原卡 S2b 明确承诺的「写入侧规范 `run:` 门」**：
   - 原卡 S2b 与验收标准 #5 明确要求：「收窄 `.github/workflows/*.yml` 的 `run` 形态（只许规范 `node <file>` 行，写入侧校验）」；实际未在任何 verify 门禁或 check 测试中落地。
   - 盘点本仓全部工作流文件（仅 [.github/workflows/ci.yml](../../../../.github/workflows/ci.yml) 与 [.github/workflows/model-smoke.yml](../../../../.github/workflows/model-smoke.yml) 两份）：所有执行 `scripts/smoke/*` 的步骤实际上都完全可收敛为规范单命令形态（每条执行 smoke 的命令独占一行或经 `&&` 串联，无花式内联子 shell 需求）。
2. **`scripts/lib/ci-workflow.mjs` 仍是 360 行手写缩进 YAML 状态机 + 残缺 shell 黑名单**：
   - `ci-workflow.mjs` 只被 `tests/checks/{ci-workflow,ci-workflow-oracle,smoke-registry,model-workflow}.test.mjs` 消费，**不进发布包**；完全可以直接用仓内锁定的 `yaml@2.9.1` 解析真实 YAML AST（彻底消灭缩进、流式 `{}`/`[]`、多行块标量 `|`/`>`、锚点、引号转义等全部手写 YAML 缺陷类）。
   - 第 346 行仍保留 `const isKnownFailure = (seg) => /^(?:false|!?\s*true|exit\s+[1-9])$/.test(seg.trim())`——`exit 10`、`test 1 = 2`、`[ -z "x" ]` 等照样漏判。
3. **录制器与真实 Actions 语义不一致，且 `BUG-190` 是假关闭**：
   - [dev/record-ci-oracle.mjs](../../../../dev/record-ci-oracle.mjs)（第 67 行）调 `spawnSync('bash', ['-c', ...])`，**未加 GitHub Actions 默认 shell 参数 `-eo pipefail`**！多行脚本 `false\nnode scripts/smoke/x.e2e.mjs` 在真实 Actions 中首行即退出不跑第二行，而 `bash -c` 会继续跑第二行。
   - **实证假 `external` 关闭（`BUG-190`）**：[tests/fixtures/guard-ledger/ledger.json](../../../../tests/fixtures/guard-ledger/ledger.json) 将 `BUG-190`（`on: { workflow_dispatch: {} }` 流式映射）标为 `oracleType: "external", status: "closed"`，指向 [tests/checks/ci-workflow-oracle.test.mjs](../../../../tests/checks/ci-workflow-oracle.test.mjs)；该测试头注声称「回退 `parseEvents` → 夹具红」，但测试体只调了 `executedSmokeFiles(c.yaml)`，**从头到尾没读 `workflow.events` / `eventKeys`**——把 `parseEvents` 改成 `return []`，`ci-workflow-oracle.test.mjs` 依然 100% 绿！

---

### 3.3 面 3（S2c）：`fix-evidence` / `staged-change-pairing` / `backlog-liveness` / `guard-red-record` 的四条绕过链与死正则

对照代码逐条核实，新的结构化 `json fix-evidence` 机制存在 5 个具体漏洞：

1. **绕过链 1（「借壳挂靠」零测试改动假修）**：
   - [scripts/lib/staged-change-pairing.mjs](../../../../scripts/lib/staged-change-pairing.mjs)（第 118–133 行）：只要 `red.command` 写 `"pnpm test"`（命中 `REPLAYABLE`），就不要求暂存区包含任何 `tests/` 或 `scripts/smoke/` 改动；而 `guard.path` 只查 `exists(ev.guard.path)`。因此新修任何 bug 时填 `"guard": { "path": "tests/checks/layering.test.mjs", "kind": "unit" }` 即可**零新增测试、零 BUG 登记直接过提交门**。
2. **绕过链 2（归档后删守卫测试文件无人拦）**：
   - [scripts/lib/backlog-liveness.mjs](../../../../scripts/lib/backlog-liveness.mjs)（第 183–185 行）只对活跃 `bugs/` 中 `status === '修复落地'` 的卡调 `fixEvidenceProblems(text)`，既不传盘侧 `exists` 校验 `guard.path`，也不检查 `_archived/fixed_bugs/` 中 `>= CUTOFF` 的已归档卡。提交归档后下一笔 commit 删掉 `guard.path` 指向的测试文件（只要不撞别的 `BUG-nnn` 标题），`pnpm verify` 全绿。
3. **绕过链 3（`CUTOFF = '2026-11-15'` 造成新旧两头真空）**：
   - [scripts/lib/fix-evidence.mjs](../../../../scripts/lib/fix-evidence.mjs)（第 8–55 行）：当 `opened < '2026-11-15'` 时直接 `return []`，同时删除了原有的散文红绿段落校验！结果任何 `opened <= 2026-11-14` 的卡（含 2026-11-14 当天立的所有卡，或此前立卡、日后才归档的遗留卡）**既不查 JSON 块、也不查旧散文红绿证据**。豁免应当钉死在已归档历史卡集合（或归档提交时点），活跃区 `bugs/` 任何新归档动作都必须交结构化 `fix-evidence`。
4. **绕过链 4（解析器自身未用遮罩与 JSON 键解码）**：
   - `fix-evidence.mjs:12` 的 `fixSectionOf` 直接在原始全文搜 `^##\s+`（未剥离代码围栏），一旦 `red.output` 字符串或代码块里含 `\n## ` 行即提前截断报假红；
   - `fix-evidence.mjs:42` 的 `duplicateKeyOf` 只比较原始字面量 `rawKey`，`{"\u0063hanges": [], "changes": ["packages/a.ts"]}` 可绕过重复键拦截。
5. **附带发现：`f-repo.mjs` 第 164 行 `conformance` 守卫死正则**：
   - [scripts/verify/gates/f-repo.mjs](../../../../scripts/verify/gates/f-repo.mjs)（第 164 行）写的是 `if (/conformance\.test\.mjs$/.test(f))`。
   - 实测扫描 `tests/contracts/` 下全部 7 个文件（含 `markdown-mask-conformance.spec.mjs`、`present-version-conformance.spec.mjs`、`verdict-conformance.spec.mjs`）：`matchesTestMjsRegex` 全部为 `false`，且 `hasBugClaim` 全部为 `false`！D53 将契约测试统一改后缀为 `.spec.mjs` 后，这条 D52 门禁分支已退化为**全仓零命中的死代码**——删掉任何 `*conformance.spec.mjs` 的 `// 负例留证`，`pnpm verify` 根本不红。

---

### 3.4 面 4（S3）：双台账自相矛盾 + 契约字段残缺 + 文档失步

1. **`guard-ledger` 与 `asset-ledger` 在 10 个测试文件 / 11 条 BUG 上 `oracleType` 直接打架**：
   对 [tests/fixtures/guard-ledger/ledger.json](../../../../tests/fixtures/guard-ledger/ledger.json)（31 条 BUG）与 [tests/fixtures/asset-ledger/ledger.json](../../../../tests/fixtures/asset-ledger/ledger.json)（208 条测试资产）做程序化交叉对账，实测有 **10 个文件（11 条 BUG）** 两边给出截然相反的分类：

   | 测试文件路径 | 关联 BUG | `guard-ledger` 声称 | `asset-ledger` 声称 | 真实情况核查 |
   |---|---|---|---|---|
   | `tests/checks/note-scan.test.mjs` | `BUG-188` | `external` | `self-referential` | **虚假 `external`**：文件内零外部真值读取，纯手写字符串断言 |
   | `tests/checks/docs-consistency.test.mjs` | `BUG-009` | `canonical` | `self-referential` | 读真实 `docs/guides/60` 与 `AGENTS.md` 对账，属盘侧契约但未进 `asset-ledger` 硬编码 14 条 `OVERRIDES` |
   | `tests/checks/layering.test.mjs` | `BUG-010` | `structured` | `self-referential` | 扫真实 `tests/` 与 `package.json`，因不在 14 条硬编码名单被默认打成 `self-referential` |
   | `tests/run/run-dashboard.spec.mjs` | `BUG-012` | `structured` | `self-referential` | 同上，`asset-ledger.mjs` 除 14 条硬编码外一律标 `self-referential`（208 条中占 194 条 = 93.3%） |
   | `tests/run/replay-fixtures.spec.mjs` | `BUG-013`, `BUG-080` | `smoke-only` | `self-referential` | 两本账连枚举值集合都不一致（`asset-ledger` 无 `smoke-only`） |
   | `tests/run/provider-errors.spec.mjs` | `BUG-022` | `structured` | `self-referential` | 硬编码漏标 |
   | `tests/cockpit/workspace-files.spec.mjs` | `BUG-026` | `structured` | `self-referential` | 硬编码漏标 |
   | `tests/cockpit/brief-fold.spec.mjs` | `BUG-033` | `canonical` | `self-referential` | 硬编码漏标 |
   | `tests/run/review-readiness.spec.mjs` | `BUG-036` | `structured` | `self-referential` | 硬编码漏标 |
   | `tests/run/web-ui-nav.spec.mjs` | `BUG-063` | `canonical` | `self-referential` | 硬编码漏标 |

2. **AC #6 字段残缺与四账未收口**：
   - 原卡 AC #6 要求 `path / class / cost / uniqueClaim / oracle / sunset` 六字段（与 [scripts/smoke/registry.json](../../../../scripts/smoke/registry.json) 同构）；实际 [scripts/lib/asset-ledger.mjs](../../../../scripts/lib/asset-ledger.mjs) 漏了 `class`（失败类 C1–C12）与 `cost`，`claim` 只截文件首行注释且无去重校验，`sunset` 全部写死 `'随被测模块删除'`。
   - [docs/guides/67-test-strategy.md](../../../../docs/guides/67-test-strategy.md)（第 102–110 行 §4「四账」）至今只链了 `scripts/smoke/registry.json`，完全不知道 `asset-ledger` 与 `guard-ledger` 的存在；同时 `f-repo.mjs`（`guard-red-record`）、`guard-ledger.json`、`asset-ledger.json` 形成三套彼此脱钩的扫描逻辑。

---

### 3.5 面 5（S1）：源码 grep 伪行为守卫、五角色快照 B 层 keyless 缺位与历史账本蒸发

1. **4 处用「源码字面正则匹配」冒充 `canonical` 行为守卫**：
   - [tests/checks/boot-timer.test.mjs](../../../../tests/checks/boot-timer.test.mjs)（`BUG-095`）：用 5 条 `assert.match(src, /const settle = .../)` 搜 `web-harness.mjs` 的局部变量名！重构变量名即假红，而在回调外另开一个未清理的 `setTimeout` 则假绿。完全可以用假子进程 / EventEmitter 直接调用真实 `bootWeb` 跑「成功横幅 / 进程早退 / 超时」三条路径并断言退出后无残留活跃 `Timeout`（`process.getActiveResourcesInfo()`）。
   - [tests/checks/probe-port-policy.test.mjs](../../../../tests/checks/probe-port-policy.test.mjs)（`BUG-136`）：只读了 `probes/behavior/defaults-probe.mjs` 一个文件做正则匹配！实测扫描 `probes/behavior/` 下全部 6 个调用 `bootWeb` 的探针：其余 5 个（`discipline-probe` `3104`、`entry-chain-probe` `3114`、`method-library-probe` `3116`、`rerun-triage-probe` `3118`、`wave-execution-probe` `3120`）**全部没有默认端口冲突自动退避逻辑**（部分甚至无 `reclaimPort`）。应抽出共享端口分配/收割辅助函数并由全量 `probes/behavior/*.mjs` 统一接入。
   - [tests/checks/smoke-imports.test.mjs](../../../../tests/checks/smoke-imports.test.mjs)（`BUG-079`）：按行匹配 `/^\s*(?:import|export)\b/`，漏掉所有跨行 `import {\n  foo,\n} from '...'` 语句、动态 `import('...')` 字面量与 `scripts/lib/` 传递依赖！本仓 `smoke-identifiers.test.mjs` 已在使用 `typescript` AST，直接用 `ts.createSourceFile` 解析静态/动态模块说明符并递归检查本地闭包即可零漏扫。
   - [tests/checks/web-ui-nav-bilingual.test.mjs](../../../../tests/checks/web-ui-nav-bilingual.test.mjs)（`BUG-059/061`）：只扫 `client-load.entry.mjs` 单个文件的单行 `/getByRole\([^)]*name:\s*\/([^/]+)\//g`，漏掉 `client-load-*.support.mjs`、跨行调用、字符串字面量 `name: 'Settings'` 以及 `getByText` / `getByLabel`。同样应改用 `typescript` AST 扫描全部浏览器 smoke/support 文件的 Playwright 定位器调用。
2. **`BUG-013 / BUG-080` 快照金标准漂移——缺真正的五角色 B 层 keyless 内容对账**：
   - [tests/run/replay-fixtures.spec.mjs](../../../../tests/run/replay-fixtures.spec.mjs)（第 74–84 行）只检查了 `codeAnchor` / `vendor` 是 40 位 hex（甚至没核对 `vendor` 是否等于当前 `vendor/dsh` submodule 钉住的 SHA `b830ec950f...`！），且 `roleFace.includes(c.preset)` 只查了 `cases ⊆ roleFace` 而漏查反向包含（其实 [scripts/lib/replay-scene.mjs](../../../../scripts/lib/replay-scene.mjs) 第 103–115 行的 `loadReplayScene` 早已完整校验了双向集合相等，测试却手抄了一份更弱的断言）。
   - 更关键的是：今天提交 `42b589e7` 前，`snapshot-baseline.out` 里五角色的 `B·runtime-context` 早就因 `content/manual.md` 变更而全部漂移变红，但 `pnpm test` 完全看不见！
   - **实测可行性**：五角色的 `snapshots/replay/research-face/**/session.v4.jsonl` 均已在盘上记录了完整的 `system-prompt`、`skill-catalog` 与 `runtime-context`（即 [packages/deep-research-pack/src/content/index.ts](../../../../packages/deep-research-pack/src/content/index.ts) 注入并插值 `{{research_pack_root}}` 后的 `content/manual.md`）。在 `replay-fixtures.spec.mjs` 中直接用纯文件读取把五角色录制事件与当前盘上的 `presets/<role>.patch.yml`（persona）、`presets/<role>/skills/*/SKILL.md`（目录名与描述）、`content/manual.md`（runtime-context）以及 `vendor/dsh` 钉 SHA 对账，**耗时 < 50ms、零子进程、零浏览器、零 API key**，任何角色提示词/技能/手册/vendor 改动都会在 `pnpm test` 秒级显红！
3. **范围蒸发全账（Census §D-2 17 卡 + 探索批 A–C 24 卡 + 批 D 2 卡）**：
   - 普查 §D 共 **41 张沉淀缺口卡**（D-1 24 张 + D-2 17 张 `001/011/016/023/025/031/032/037/042/047/055/072/106/108/112/113/152`）：D55 只把 D-1 24 + 批 D 7 = 31 张放进 `guard-ledger`，**D-2 的 17 张完全蒸发**。
   - 探索批 A–C（`BUG-160..183`，24 张）中 **23 张**（除 `BUG-171` 外）及批 D 的 **`BUG-186`、`BUG-189`** 均未在测试 `test('...BUG-nnn...')` 标题中声明守卫（只写在文件头注释里），导致 `guard-red-record` 对这 25 张探索卡完全失明。

---

## 4. 方案对比、Decision Table、Pilot 验证与边界条件

### 4.1 备选方案与否决理由

| 议题 | 方案 A（采纳） | 方案 B（否决） | 否决理由 |
|---|---|---|---|
| **Markdown 遮罩单一真源 + 外部真值** | 抽单一零依赖纯模块 `packages/deep-research-pack/src/lib/markdown-mask.ts`（对齐 CommonMark 行内反引号、容器退出闭合围栏、同行多段 HTML 注释）；`review-readiness.ts` 与 `scripts/lib/note-scan.mjs` 同源 import；契约测试直调 `mdast-util-from-markdown` 跑确定性组合矩阵 + 边界语料（修妥 UTF-16 offset），退役手工快照脚本 `dev/record-markdown-oracle.mjs` | 在 `review-readiness.ts` 直接运行时依赖 `mdast-util-from-markdown`；或继续保留两份手写状态机 + 静态 `oracle.json` | 运行时依赖会打穿发布包零 `dependencies` 铁律（膨胀 tarball）；保留双份手写 + 静态 JSON 则无法消灭 C3 双份漂移与静态快照陈旧漏洞 |
| **CI 工作流解析与规范 `run:` 门** | ① 根 `devDependencies` 显式声明仓内已锁定的 `yaml@2.9.1` 与 `mdast-util-from-markdown@2.0.3`（不引入新包版本）；`scripts/lib/ci-workflow.mjs` 改用 `yaml` AST 解析工作流结构（删 360 行手写缩进解析器）；② 新增写入侧契约门 `ci-run-shape`：`.github/workflows/*.yml` 中凡含 `scripts/smoke/` 的 `run:` 步骤必须符合规范可执行命令白名单（禁短路否定/死分支/注释伪装）；③ `gates.e2e.mjs` 用 `bash -eo pipefail` 对真实工作流 `run:` 块做真 shell 对照，并为 `BUG-190` 补真实 `eventKeys` 断言 | 继续修补 `ci-workflow.mjs` 的手写缩进解析与 `isKnownFailure` 正则词表 | YAML 2 + Bash 是开放图灵完备语法，靠手写缩进 + 失败命令黑名单永远可构造第 10 轮绕过（如 `exit 10`、here-doc、流式嵌套） |
| **`fix-evidence` 与守卫生命周期闭环** | ① `fix-evidence` 解析先经 `markdown-mask` 剥围栏、用 AST/词法解码 JSON `\uXXXX` 键防重复键；② `guard.path` 要求：当 `kind` 为 `unit`/`smoke` 时目标文件必须真实存在且含对应 `BUG-nnn` 守卫声明（或 `gates.e2e` 用例名），`staged-change-pairing` 禁止借无关旧测试零改动挂靠；③ `backlog-liveness` 对活跃 `bugs/` 强制要求新式 `json fix-evidence`（不再用 `opened < 2026-11-15` 放走活跃卡，仅豁免盘上既有已归档历史卡），并对所有携带 `json fix-evidence` 的已归档卡持续校验 `guard.path` 在盘存活；④ 修 `f-repo.mjs:164` 正则为 `/conformance\.(?:spec\|test)\.mjs$/` | 每次 `pnpm verify` 在 pre-commit 里重跑 `red.command` 与 `green.command` | `red.command` 在已修复工作树上本就该返回绿（除非 checkout 父提交，而 pre-commit 切树既破坏工作区又违背秒级门禁预算）；锁死「守卫声明真实入场 + 归档后存活 + 反证留证」才是盘侧可重验的静态不变量 |
| **测试台账与历史 BUG 账收口** | 废除硬编码 14 条 `OVERRIDES` 的平行账：以单一生成器 + 盘侧 AST/import 推导合并 `guard-red-record`、`guard-ledger` 与 `asset-ledger`（识别真实 import 的生产/契约模块、外部解析器、夹具与 `BUG-nnn` 守卫声明），补齐 `class` / `cost` / `uniqueClaim` / `oracleType` / `sunset`，同步 `docs/guides/67-test-strategy.md` §4，并将普查 D-2（17 卡）与批 A–D（31 卡）全部逐卡核销入账 | 手工把 10 个冲突文件加进 `asset-ledger.mjs` 的 `OVERRIDES` 字典 | 手工字典在下一次新增测试文件时立即再次漂移成 95% `self-referential`，违反 C2/C3 防漂移原则 |
| **S1 行为守卫与五角色快照 keyless 对账** | ① `BUG-095` 改为真调 `bootWeb`（假子进程三路径）验活跃 `Timeout` 清零；② `BUG-136` 抽共享端口退避/收割逻辑覆盖全部 6 个 `probes/behavior/*.mjs` 并单测冲突回落；③ `BUG-079` 与 `BUG-059/061` 改用 `typescript` AST 扫描全量 smoke/support 文件；④ `BUG-013/080` 在 `replay-fixtures.spec.mjs` 调 `loadReplayScene` 并对五角色 `session.v4.jsonl` 做 `persona` + `skill-catalog` + `runtime-context`（`manual.md`）+ `vendor` SHA 的 keyless 全等对账 | 保持源码正则断言，仅依赖 CI 跑 `snapshot-replay.entry` 抓快照漂移 | 源码正则绑定实现细节而非契约行为；`snapshot-replay.entry` 需要完整构建与子进程，本地日常 `pnpm test` 看不见手册/角色漂移正是 `BUG-013/080` 反复发作的根因 |

### 4.2 Pilot 实测摘要（本轮只读验证已完成）

1. **Node 22 原生 `.ts` 跨层共享实测**：在无 `tsx` 预加载的裸 `node v22.23.1` 进程中直接 `await import('./packages/deep-research-pack/src/lib/review-readiness.ts')`，退出码 `0`、导出表完整，证明 `scripts/verify/verify.mjs` 经 `note-scan.mjs` 直引 `packages/deep-research-pack/src/lib/markdown-mask.ts` 零障碍。
2. **`mdast` UTF-16 偏移修复验证**：将 `[...norm]` 改为基于 UTF-16 索引的 `Uint8Array(norm.length)` 字节/码元遮罩后，`'🎯 prefix <!-- hidden --> tail'` 输出精确对齐，不再吞字符或漏 `<`。
3. **仓内 `.pnpm` 锁包核查**：确认 `node_modules/.pnpm` 已存在 `yaml@2.9.1` 与 `mdast-util-from-markdown@2.0.3`；声明进根 `package.json` `devDependencies` 只需同步 workspace 元数据，不引入任何仓外新第三方包，且消除本机 `/Users/bowhead/node_modules` 幽灵依赖。

### 4.3 什么会改变结论

- 若未来本仓最低 Node 版本降回 `< 22.6`（不支持原生 `.ts` 类型擦除），则共享模块 `markdown-mask` 改为 `.js` + `.d.ts` 放在 `packages/deep-research-pack/src/lib/`，同源结论不变，仅文件后缀调整。
- 若未来 `.github/workflows/*.yml` 需要复杂多行 shell 脚本驱动 smoke，则将该逻辑下沉为具名 `scripts/ci/*.mjs` 入口并纳入门禁测试，保持工作流 YAML 层面的 `run:` 步仍为扁平规范调用，不回退到手写 bash 解析器。
