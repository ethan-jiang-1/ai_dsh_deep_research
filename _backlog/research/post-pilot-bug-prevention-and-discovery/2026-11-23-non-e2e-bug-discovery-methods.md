---
topic: 非端到端（Non-E2E）高信号寻虫手段全景调研
intent: 回答“除了靠端到端，还有没有更好的手段再找代码里的 bug”，结合本仓技术栈（TypeScript / React / Node .mjs / Markdown parser / 异步状态流）系统盘点可落地的静态分析、高密度自动化测试与运行时不变量检查手段。
---

# 除了端到端，还有哪些更好的手段找代码里的 Bug

> 核心诊断：本仓之所以陷入「不断靠 Playwright 浏览器 E2E 或真模型 E2E 找 bug」，是因为在**静态分析层（Lint / CheckJs / AST）**与**高密度进程内测试层（Hook+jsdom / Property-Based / 状态机序列 / 变异 / 故障矩阵）**之间存在大片空白，导致简单逻辑缺陷、异步竞态、空值解引用、契约盲区全部逃逸到最慢、最昂贵的端到端层才被发现。

按**发现成本从低到高（毫秒 → 秒级）、信噪比与本仓契合度**排列，以下 14 种非端到端寻虫手段均可直接在本仓找到明确目标（不依赖 Playwright、不依赖真 LLM API）。

---

## 一、零运行成本：静态分析与编译器级寻虫（毫秒～数秒扫全仓）

### 1. 启用 Type-Aware Lint：`oxlint` + `oxlint-tsgolint`（以及 `sonarjs` 规则）

- **现状**：[discipline-map.md](../../../docs/discipline-map.md) 第 202 行显式记为「未引入」，而上游 `vendor/dsh/` 已有一整套实战检验过的 `vendor/dsh/.oxlintrc.json`（Rust 实现，全仓扫描秒级完成，并带 `oxlint-tsgolint` 类型感知规则）。
- **直接能抓到的本仓真实 bug 类型**：
  - `typescript/no-floating-promises` & `no-misused-promises`：抓出异步扫描/重命名/刷新中忘记 `await` 或吞掉拒绝的 Promise；
  - `typescript/no-unsafe-assignment` / `no-unsafe-member-access` / `no-explicit-any`：逼出 `JSON.parse` 后的未校验访问以及 `as never` / `as unknown as` 掩盖的类型漏洞（本仓 `src/` 目前有 14 处此类逃逸）；
  - `typescript/use-unknown-in-catch-callback-variable` & `no-base-to-string`：杜绝 `catch (e)` 里盲目读 `e.message` 或 `String(obj)` 打出 `[object Object]`；
  - React Hooks `exhaustive-deps`：立刻抓出 [useStatusFeed.ts](../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts) 第 176 行（`revealStatusTab` 未入依赖）等闭包陈旧问题；
  - 代码异味 / 认知复杂度与死分支（`eslint-plugin-sonarjs`）：抓出重复行（如 `useStatusFeed.ts:219-221` 连续三行 `setReviewDetail(null)`）、恒真/恒假条件、冗长 `if` 嵌套。

### 2. 把 `tsc --checkJs` 覆盖到全部 180 个 `.mjs` 脚本

- **现状**：[smoke-identifiers.test.mjs](../../../tests/checks/repo/smoke-identifiers.test.mjs) 仅用 `tsc` 扫 `checks/smoke/*.mjs` 的 `TS2304/TS2552`（未声明标识符）。`checks/run-gates/`、`checks/lib/`、`checks/verify/`、`tools/` 共约 180 个 `.mjs` 文件处于**类型无检查状态**——这正是 BUG-340（`protocol-audit.mjs` 漏 import `readdirSync`/`splitFrontmatter` 且解引用 `null`）能活到端到端的原因。
- **怎么做**：用一份只用于静态诊断的 `tsconfig.scripts.json`（`allowJs: true, checkJs: true, strictNullChecks: true, noEmit: true`）跑 `checks/**/*.mjs` 与 `tools/**/*.mjs`。即使不改写为 `.ts`，`checkJs + strictNullChecks` 也能直接找出：
  - 缺失/拼错的 import 与函数名；
  - 可能是 `null`/`undefined` 却直接解引用的路径（如 `protocol === null`）；
  - 参数个数/类型不匹配、返回对象缺字段（如 BUG-327 缓存键结构不一致）。

### 3. 定制领域 AST 不变量扫描（升级版静态门禁）

本仓已经用 TypeScript Compiler API 写了 [no-unused-code.test.mjs](../../../tests/checks/repo/no-unused-code.test.mjs) 和 `artifact-sites` 等局部扫面，非常适合把**代码级坏味道直接升级成 AST 规则**：

| 候选 AST 扫描规则 | 直接拦截的 bug 类 |
|---|---|
| 禁止 `src/client/` 除 `artifact-read.ts` 外调用 `view.hasFile()` / 裸 `view.read()` | 立即抓出当前仍留在 `useStatusFeed.ts`（×3）和 `useConfigFeed.ts`（×1）的 `hasFile` 残留，防止下一批 385+ |
| 封闭判别联合（`ArtifactState`、`ReviewVerdict`、`SourceRead`）必须走带 `never` 兜底的 `switch` 或穷举查找表 | 立即抓出 `useStatusFeed.ts:300` 漏处理 `'invalid'` 的静默 `null` 分支 |
| 禁止异步 `catch` 块只做 `console.error` 或空块而不改变错误状态 / rethrow | 拦截所有静默 fail-open 的读失败吞错 |
| `AbortController` 配对检查：创建了 `AbortController` 必须将 `.signal` 传入异步调用**且**在 cleanup/finally 中调用 `.abort()` | 立即抓出 `useStatusFeed.ts:211` 只建不 abort 的资源泄漏 |
| 禁止未登记的 `as never` / `as unknown as` / `@ts-ignore` | 防止开发者用类型强制转换绕过编译器 |

### 4. 重复代码检测（`jscpd`）与「未消费导出 / 死状态字段」扫描（`knip` / TS `findReferences`）

- **`jscpd`（`vendor/dsh` 已引入）**：过去已经证实过 `checks/verify/context.mjs` 等处存在 ~3% 重复代码，而诸如 BUG-333..336（四个入口各写一遍有缺陷的端口解析）、BUG-369/374（status 与 final 各写一遍 review 判定）、`ResearchStatusTab.tsx:172-219`（七段重复告警渲染）全源于逻辑复制。定期或按增量跑 `jscpd` 能直接找出「只修了一处、另一份拷贝还在出 bug」的孪生缺陷。
- **未消费导出与孤立状态字段扫描**：[no-unused-code.test.mjs](../../../tests/checks/repo/no-unused-code.test.mjs) 显式跳过了 `export` 声明；引入 `knip` 或基于 TS `LanguageService` 扫描「写进了状态对象但从未被组件读取的字段」「导出却只被测试调用而生产零调用的 dead helper」「定义了配置键/protocol 字段但零消费者」（直接针对 BUG-250, 265, 271, 273 一整类“有声明无消费”缺陷）。

### 5. 包导出与声明完整性扫描（`publint`）

- `vendor/dsh` 已使用 `publint`。对 `packages/deep-research-pack` 跑 `publint` + `tsc --declaration` 闭环检查，可在几百毫秒内捕获 `package.json` 的 `exports`、`.d.ts` 路径泄漏或缺失类型入口（预防 BUG-219, 229, 239 等发布面缺陷）。

---

## 二、进程内高密度自动化寻虫（毫秒～数秒，代替 80% 浏览器 E2E）

### 6. L0 填补最大空白：React Hook + 组件行为级测试（`@testing-library/react` + `jsdom` + Fake Timers）

- **为什么是最高优先级**：`tests/cockpit/client/` 目前全部用 `renderToStaticMarkup`（只测同步渲染 HTML 字符串），**`useStatusFeed`、`useGraphFeed`、`useConfigFeed`、`ResearchFinalTab`、`ResearchStatusTab` 的状态跃迁、定时器、异步竞态在 L0 覆盖率为 0%**——所以 351–384 几乎全靠慢速 Playwright 端到端抓出来！
- **怎么做**（`vendor/dsh` 已使用 `@testing-library/react` + `jsdom`）：
  - 在 `node:test` + `jsdom` 下直接挂载 `ResearchStatusTab` / `ResearchFinalTab` / `ResearchGraphTab` / `ResearchConfigTab`（使用受控假 `RunSource` 和假 `follow` 流，以及 `node:test` 自带的 `mock.timers` 控制 30s 轮询与延迟）；
  - 可以在 **<1 秒** 内穷举并断言：
    - 慢请求乱序返回（切会话 A → B 后 A 的异步结果才回来，不得覆盖 B）；
    - `ENOENT` / `EACCES` / `truncated: true` / 0 字节 / 仅标题 / 坏 JSON / 语义冲突的 UI 文本与 `?` / `retry` 按钮点击重扫；
    - 推进 `mock.timers` 30 分钟验证停摆横幅出现、收到用户/工具事件后消失、切英文 locale 动态切换等。
  - **效果**：原本需要起停 DSH Web 服务 + Chromium 跑 30–60 秒的 `cockpit-truth*.entry.mjs` 场景，90% 以上可在 L0 毫秒级复现并拦截回归。

### 7. Property-Based Testing（基于性质的随机测试，`fast-check`）

- **现状**：`vendor/dsh` 已经在 `core/session` 和 `core/tools` 落地了 `fast-check`（如 `vendor/dsh/packages/core/session/tests/properties.spec.ts`），但本仓 `tests/` 还没有任何 `fast-check` 测试——而本仓恰恰拥有最适合 PBT 的**几十个纯折算与解析函数**！
- **在本仓能直接抓 bug 的具体性质**：
  1. **状态折叠无矛盾不变量（`brief-fold` / `final-target` / `review-readiness` / `run-fold`）**：
     - 对随机生成的任意合法组合 `(StatusReads, ReviewVerdict, delivery, hitl, question)`，断言：
       - 不可能同时输出「已交付」与「报告不交付」语义；
       - 任何读取态为 `'unreadable' | 'invalid' | 'empty'` 时，对应面板不得输出正向完成符号或 `0 份`；
       - `deriveSteps` 中凡是在 `unknown` 集合里的步，**无论后续哪些步为 true**，输出 `state` 永远只能是 `'unknown'`（直接自动抓出类似 BUG-381/382 的线性推断覆盖漏洞！）；
       - `finalViewOf` 无论在 `reader` / `audit` / `draft` 间怎么切换、或任一版本缺失，绝不跨版本展示错误版本正文（BUG-356 类）。
  2. **蜕变性质（Metamorphic Testing）**：
     - 给任意合法 `plan.md` / `review.md` / `question.md` 插入随机的 BOM、CRLF、尾随空格、Markdown 代码围栏内的伪表格/伪 `readiness: FAIL`、HTML 注释块——解析出的领域对象必须与原版完全相等；
     - 在 `evidence/` 随机增删 `_failed.md` 或 0 字节文件或 frontmatter-only 文件，有效 `evidenceCount` 必须保持不变（BUG-377/378 类）。
  3. **编解码 Round-Trip**：
     - `serializeDefaults(parseDefaults(x).value)` 再次 `parseDefaults` 必须幂等且不丢合法字段（BUG-376 同族）。

### 8. Stateful Model-Based Testing（基于状态机模型的随机序列测试，`fc.commands`）

- **针对对象**：`start-lock` / `method-library-io` 文件锁、`useStatusFeed` / `useGraphFeed` 异步数据流、`DefaultsStore`。
- **原理**：不要只测单次函数调用，而是定义一组原子命令（`SwitchSession`, `EmitJournal`, `SetDiskFile(state)`, `SlowReadDelay`, `TriggerTimer`, `ClickRetry`, `AcquireLock`, `KillOwner`, `ReleaseOldToken`），让 `fast-check` 生成 20～50 步随机交错序列，每一步执行后对比「真实实现状态」与「一个 30 行极简理想状态模型」的不变量。
- **优势**：自动 shrink 出导致状态撕裂或锁泄漏的最短 3～4 步并发交错序列（例如：刚打开会话 → 首扫未结束 → 收到 `retry` → 旧请求返回覆盖新请求），这是人工写 E2E 几乎不可能想全的竞态组合。

### 9. 差分测试（Differential Testing）

- **针对对象**：仓内所有手写 Markdown / Frontmatter / 表格 / 链接正则解析器（`plan-index.ts`、`artifact-content.ts`、`review-readiness.ts`、`findings-core.mjs`、`protocol-audit-core.mjs`、`doc-surface.mjs`）。
- **做法**：用标准解析器（如 `mdast-util-from-markdown` + `micromark-extension-gfm`，`vendor/dsh` 已引入）或独立参考实现，对批量随机生成的 Markdown 文本（含嵌套引用、代码块、表格、强调符、空小节、ATX/Setext 标题）同时解析并比对结构边界（如“哪些行是正文”“哪些行在代码围栏内”“表格有几列几行”）。凡是手写正则与 CommonMark AST 分歧的地方，就是潜在的下一张解析 bug（如 BUG-261, 262, 341, 383）。

### 10. 轻量边界 Fuzzing（Parser & CLI 输入模糊测试）

- **针对对象**：所有文本/JSON/参数解析器（`parsePort`、`parseDefaults`、`finalVersionOf`、`readinessOfSources`、`planIndex`、`checks/run-gates/*.mjs`）。
- **做法**：构造结构化变异语料生成器（空串、`\0`、超长行 100KB 检测 ReDoS 正则回溯、深度嵌套 Markdown 符号、原型污染键 `__proto__`/`constructor`/`toString`、非法 UTF-16 代理对、科学计数法/NaN/Infinity/-0、极端时间戳），在 L0 跑数万次输入：
  - 断言核心纯函数**永不 throw 未捕获异常、单次耗时不超过阈值（防 ReDoS）**；
  - 断言 CLI 入口遇到任意坏参数/坏文件一律给出结构化错误并 `exit !== 0`（绝不 `ReferenceError`/`TypeError` 崩溃，预防 BUG-340）。

### 11. 系统化故障注入测试矩阵（Systematic Fault-Injection Matrix）

- **为什么有效**：11-22～23 的观察面 bug（355, 358–368, 370, 372–375, 377–378, 381–384）几乎全部是「某个文件/目录处在某种坏状态时，某个消费者没处理好」。
- **做法**：不再等 E2E 每次手写一个夹具（`status-fixture-e2e.mjs`、`review-empty-e2e.mjs`…），而是写一个**标准恶意 `RunSource` 矩阵工厂**，自动遍历：
  - **目录维度**：`bundle`、`evidence/`、`final/`、`plan/`、`review/`；
  - **文件维度**：`question.md`、`topics.md`、`plan.md`、`leads.md`、`findings.md`、`review.md`、`review/readiness.json`、`delivered.json`、`final.md`、`final/v1.md`、`final/readable.md`、`evidence/e1.md`、`evidence/_failed.md`；
  - **故障维度**：`missing` / `unreadable(EACCES)` / `truncated: true` / `0 字节` / `纯空白` / `仅 frontmatter` / `仅标题` / `坏 JSON` / `缺字段 JSON` / `语义冲突` / `RPC throw` / `永不 resolve（挂起后 abort）`。
  - 对所有消费 `RunSource` 的 hook、纯折叠器与门禁脚本自动跑完整个 `工件 × 故障` 笛卡尔积矩阵，一次性把所有读取盲区全照出来（而非分四批每次挤出 8 个）。

---

## 三、评估「测试本身有没有盲区」的元测试与运行时哨兵

### 12. 变异测试（Mutation Testing，StrykerJS 或针对纯核的定向 AST 变异）

- **解决什么痛点**：「1400+ spec 全绿，但其实某条 `if` 分支删掉测试也全绿！」（例如 `useStatusFeed.ts` 漏处理 `'invalid'`、`hasFile('final.md')` 没被任何测试抓到）。
- **做法**：
  - 在 `packages/deep-research-pack/src/lib/` 与 `checks/lib/gates/` 上运行变异测试（StrykerJS 对 `node:test` 或自定义基于 TS AST 的轻量变异 runner）：系统性地把 `===` 变 `!==`、`&&` 变 `||`、数值边界 `+1/-1`、`nonEmpty: true` 变 `false`、删除 `else` 分支、`return null` 变 `return undefined`；
  - 统计**存活变异体（Surviving Mutants）**：每一个存活的变异体，都精确指出了一行「代码改错了但所有测试依然绿」的真盲区。这比人工写“负控注入（mutate-once）”系统得多、彻底得多。

### 13. 分支覆盖率盲区热力图（`node --experimental-test-coverage` 聚焦未覆盖分支）

- **现状**：[package.json](../../../package.json) 已有 `test:coverage` 脚本，但仅作为一个可选命令行存在，未进入日常巡检或分支审计。
- **怎么用来找 bug**：
  - 跑一遍 `pnpm test:coverage`，**按文件与未覆盖分支排序**（不追表面 100% 数字，只看「0% 或低覆盖的逻辑文件」与「从未命中的 `catch`/`else` 分支」）：
    - 目前 `src/client/research-status/useStatusFeed.ts`、`useGraphFeed.ts`、`useConfigFeed.ts`、`ResearchFinalTab.tsx`、`checks/run-gates/*.mjs` 的大量异常/边界分支在 L0 中覆盖率接近 0%——**低覆盖热点几乎精准重合于 BUG-340..384 的高发区**；
    - 特别适合抓出「没人跑过的错误处理路径」（比如 `catch` 块、`truncated` 分支、重试路径）。

### 14. 运行态结构不变量断言（Runtime Invariants / Self-Checking Contracts）

- **原理**：在纯折算输出端与状态机出口挂「永远必须成立的语义契约检查」（可在测试态 + dev 模式开启 fail-loud 抛出，在生产观察面降级打 `console.error` 告警并附显式错误标志）：
  - 例如在 `deriveBusinessBrief` / `selectStatusView` 出口断言：
    1. `delivered === true` 时，`stageLine/actionLine` 不得出现未交付拒发文案；
    2. `reviewVerdict === 'unconfirmed' || 'conflict'` 时，`steps` 中 `review` 不得为 `'done'`；
    3. `reads.bundle !== 'ok'` 时，`face` 必须为 `null`；
    4. `finalViewOf` 当 `requested !== 'draft'` 且地址锁定 `vN` 时，返回的显示文件路径不得指向其他版本号；
  - **结合上述第 6、7、8、11 项测试**：一旦随机测试或状态机测试触发了任何一条不变量违例，测试当场精准报错，无需人眼去浏览器截图里逐行找「这两句话互相矛盾」。

---

## 四、落地收益对照：如果早有这些手段，BUG-340…384 分别在哪一层被提前抓出

| 历史 BUG 簇 | 实际被抓到的层 | 若采用本文手段，**最早**可在哪一层被自动抓出 |
|---|---|---|
| **340**（`protocol-audit.mjs` 缺 import + `null` 崩溃） | 真 run 端到端 | **第 2 项 `tsc --checkJs`**（提交前毫秒级静态报错，零运行） |
| **341–343, 350**（生产者↔门禁格式分叉） | 真模型 run 端到端 | **第 7 项 PBT + 第 9 项差分测试 + 统一 Schema 解码器**（构造变形语料即暴露） |
| **344, 348, 351, 353, 354**（异步流/停摆/生命周期） | 真会话日志 + Playwright | **第 6 项 Hook+jsdom + Fake Timers + 第 8 项状态机序列测试**（L0 毫秒级） |
| **347, 356–360**（读失败折成良性态、地址版本覆盖、互斥文案） | Playwright E2E（第 2–3 轮） | **第 11 项恶意 `RunSource` 故障矩阵 + 第 14 项不变量 + 第 6 项 Hook+jsdom** |
| **361–375**（0 字节、未闭合读点清单、跨页派生不一致、watcher 盯错） | Playwright E2E（第 4–5 轮） | **第 3 项 AST 禁用裸 `view.read`/`hasFile` + 第 4 项 `jscpd`/死导出 + 第 11 项故障矩阵** |
| **377–378, 381–384**（`_failed.md`、空卡、headings-only、`deriveSteps` 线性覆盖） | Playwright E2E（第 6 轮） | **第 7 项 PBT（`unknown` 单调性 + sentinel 蜕变性质）+ 第 11 项内容形态故障矩阵** |
| **379–380**（英文单复数与容器宽度截断） | Playwright E2E（第 6 轮） | **第 6 项 `jsdom` 多 locale 渲染单测**（计数 `[0, 1, 2]` 矩阵；仅真像素截断仍需浏览器布局检查） |
| **327, 333–336**（缓存 key 不一致、端口 NaN） | 探索回归 | **第 2 项 `checkJs` + 第 10 项 CLI/边界 Fuzzing** |

## 五、推荐的增量引入顺序（不做一次性大工程）

若后续决定把研究结论落地为 issue / 实施任务，建议按**投入产出比（ROI）**分三步推进，每步都可独立验证是否降低 E2E 逃逸率：

1. **第一步（最快止血，1–2 天）**：
   - 给 `checks/` 与 `tools/` 挂 `checkJs` + 引入 `oxlint` / `oxlint-tsgolint`（复用 `vendor/dsh/.oxlintrc.json`）；
   - 跑通 `test:coverage` 找出 `src/client/` 与 `checks/run-gates/` 的 0% 覆盖盲区，补齐 `jsdom` + `@testing-library/react` + `mock.timers` 的 Hook 行为测试基础设施，先把 `useStatusFeed`/`useConfigFeed`/`useGraphFeed` 残留的 `hasFile` 与裸 `view.read` 收口。
2. **第二步（消除「挤牙膏式发现」，2–3 天）**：
   - 建立共享「**恶意 `RunSource` 故障注入矩阵**」（`工件 × 故障态` 一次扫全）；
   - 引入 `fast-check` 对 `src/lib/` 纯折算与 parser 建首批 PBT + 蜕变性质测试，并建立 `mdast` 差分测试对账手写 Markdown 解析器。
3. **第三步（架构治本与防退化，按模块演进）**：
   - 逐步把 `useStatusFeed` / `useGraphFeed` / `useConfigFeed` 重构为「纯 Reducer 状态机 + 薄 Hook 绑定」，在边界贯彻 `Parse, Don't Validate` 与 `assertNever` 穷举；
   - 对核心纯函数与门禁引入定期/按模块变异测试（Mutation Testing），用「存活变异体」校准测试质量。
