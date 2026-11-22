---
status: 待落地
opened: 2026-11-22
---

# 观察面真实性修复程序：BUG-356…360 的次序、流程与系统修法

> 立卡：2026-11-22 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
> 去向：implemented — `notes/implemented/2026-11-22-observation-truthfulness.md`（批 Note，交付时写）
> 对象：5 张活跃 P2 卡（356–360），全部真浏览器已复现；现场 = `runtime/e2e/*-verdict.json` + `*.png`（gitignored）。
> 执行载体 = 后续 goal 按 §4 阶段推进；本卡 = 批索引 + 决定账 + 卡→用例映射。
> 方法 = [bug-to-fix §2 批模式](../methods/bug-to-fix.md)；状态机 = [bugs/README](../bugs/README.md)；证据主人 = [guides/60](../../docs/guides/60-dev-loop.md)；
> 上一批 = [2026-11-21 批 Note](../../notes/implemented/2026-11-21-bug-stack-repair.md) · [修复程序卡](../_archived/settled_issues/2026-11-21-bug-stack-repair-program.md)。

## 0. 结论

1. **5 张卡不是 5 个孤立字符串 bug，是同一层（观察面）的三种事实失真**：
   - **F1 读失败被折成良性态**（358/359/360）：`missing` / `unreadable` / `empty` / `progress` 在数据装配层被折成
     同一个 `null` / `0` / `false`，视图只能猜，于是「读不到」显示成「研究推进中」「✓ 审查」「证据 0 份」。
   - **F2 交付身份被重新计算**（356）：地址里带着交付目标（`final/v1.md`），终稿页签却用 `latestRunVersion`
     从版本账重算，于是已交付 v1 被未交付 v2 顶替；目标文件缺失时还拿 `final.md` 或更高版本冒充。
   - **F3 多轴状态没有优先级表**（357）：`reviewFail` 分支写的是**交付前**政策文案，它不知道 `delivered` 可以同时为真；
     同一页的「报告不交付」与「✅ 已交付」因此互相否定。
2. **修法不是五个局部补丁**：F1/F3 共用状态页事实模型与一张优先级表，一次设计、一处改；F2 是独立的纯身份函数。
   每类落真值表守卫 + 浏览器 seed 场景，避免下一轮再从另一个读取点漏出来。
3. **次序 = 证据/再就绪 → 356 → 358/359/360+357（同一事实模型）→ 收口**。356 先修是因为它与其余四卡无共享
   代码路径、风险独立、浏览器夹具最简单，可最早关掉一个「读错文档」风险并跑通守卫升格路径；不按 BUG 号逐张修。
4. **流程保障**：每卡仍走 `排查中 → 修复就绪 → 修复落地 → 已修`，红先绿后、`exit` 为 oracle、每卡一案；
   新增 G12–G16（事实清单、消费者边界、真值表、地址身份、旧测试显式取代），把「有界扫描靠记忆」改成「按显示事实登记」。
5. **预算**约 5–6 个会话；遇到主机负载/浏览器 NOT-RUN 不伪造绿：卡停 `修复落地` + trigger，不冒充 `已修`。

## 1. 事实基线（2026-11-22，HEAD `bdebdf8a`）

| 项 | 事实 |
|---|---|
| 活跃卡 | **5 张**：356/357/358/359/360，全 `排查中`、P2；卡片已有症状、现场 verdict、根因假设、判据 |
| 机械面 | 本计划落盘前实测：`pnpm verify` 全绿；`pnpm test` 全绿（266 checks，零 skip）；`pnpm typecheck` exit 0 |
| 现场 | 5 条真浏览器夹具在 `runtime/e2e/`：`final-version-e2e.mjs`、`review-fail-e2e.mjs`、`status-bundle-missing-e2e.mjs`、`review-read-error-e2e.mjs`、`evidence-read-error-e2e.mjs`；均有 verdict + PNG |
| 上一批 | 351–355 已修（`e103d333` / `6326a142`）；批 Note 的「读失败 ≠ 缺席」有界扫描结论认为 final tab / method-library / run-context 已区分 missing/unreadable |
| 关键反例 | 该扫描**按 reader 枚举**，没按「页面显示的事实」枚举：`useStatusFeed` 仍把 `openRun` / `read` / `list` 的 `Outcome` 折成 null/0；终稿页签仍无视地址版本 |
| 测试现状 | `tests/run/gates/final-target.spec.mjs` 有一条测试**把 bug 当契约**（「不论地址是 vN 还是 reader，都回到同一个 final.md」）；`brief-fold.spec` 只测交付前 review FAIL |
| 证据边界 | `runtime/e2e/*` 是 gitignored 的诊断现场，**不是永久守卫**；升格成提交物是 P0 的硬任务 |

## 2. 系统视角：一张事实表、三类失真、一条流程缺陷

### 2.1 页面显示的事实 × 当前来源 × 失败时被折成什么

| 页面事实 | 当前来源 | 当前失败语义 | 应有语义（本程序） | 卡 |
|---|---|---|---|---|
| 本场 run 是否可读 | `openRun` | `!ok` → `face=null`，业务摘要继续「研究推进中」 | `bundle: ok/absent/unreadable`；unreadable → 失败态 + 重试 | 358 |
| 审查结论 | `read('review.md')` + `hasFile` | 读失败 → `reviewText=null` → `absent`；步骤条仍 `hasFile` → ✓ 审查 | `review: pass/fail/absent/unreadable`；unreadable ≠ absent，步骤条 unknown | 359 |
| 证据份数 | `list('evidence')` | `!ok` → 0；步骤条仍线性全绿 | `evidence: ok(count)/absent/unreadable`；unreadable 不显示 0 | 360 |
| 终端页签读哪一版 | 地址 + `latestRunVersion` | 地址版本被版本账最高号覆盖；目标缺失时换文件冒充 | 地址目标优先；缺失即失败；通用地址才回退最新 | 356 |
| 交付 × 审查 | `brief-fold` if 链 | `reviewFail` 分支先于 `delivered`，文案是交付前政策 | `delivered × reviewFail` 矩阵；已交付版本仍可用 + 新审查问题 | 357 |

### 2.2 为什么上一轮的有界扫描漏了这五张

1. **扫描单位错了**：上一轮扫的是「哪些 reader 区分 missing/unreadable」；这五张的故障在**消费侧**——
   reader 明明返回了 `Outcome`，`useStatusFeed` 把它折平，`deriveBusinessBrief` 再用折平后的值出文案。
2. **没有事实模型**：`BundleFace | null`、`reviewFail: boolean | null`、`evidenceCount: number`、`versions: number`
   各自把多态压成单值；每个视图再各自猜一次，猜法必然分叉。
3. **没有真值表**：业务摘要是一条 if 链（挂起 > 预检 > 未绑定 > 审查 FAIL > 已交付 > 推进中），
   只表达单轴优先级；`delivered + reviewFail` 这种合法共存从未被枚举，所以文案可以互相否定。
4. **证据停在 runtime**：五条夹具都不进 git，修完只能靠人手复跑；下一个人无法从仓库里看到红/绿。
5. **测试把实现便利当契约**：`finalReadPlan` 的测试明确写「地址不决定读哪份正文」——它保护的是旧实现，
   不是用户合同。修 356 必须**显式取代**这条测试，并记录为什么不是放宽断言。

### 2.3 三类机制缺陷 + 一条流程缺陷

- **C1 有损事实模型**（F1）：数据装配层把 `Outcome` 折成 null/0；视图无法区分读失败与空/缺席。
- **C2 身份重算**（F2）：带目标的地址被当成「打开哪个页签」的提示，正文目标另从版本账重算。
- **C3 合成无优先级**（F3）：单轴文案被复用到多轴状态；没有「合法共存」的文案矩阵。
- **C4 流程**：类修的有界扫描按 reader 而非显示事实；守卫落在低边界（单测各自自洽）；证据不升格。

### 2.4 类级修法（一次设计，三类各落一个守卫）

1. **一个显式事实模型**（新纯件 `lib/run/status-facts.ts`，client 面；若最终体量不值得新文件，则并入
   `brief-fold.ts` + `run-fold.ts`，但必须有直测）：
   - `ReadState<T> = ok(value) | absent | unreadable(detail)`；由 `run-context` 的 `Outcome` 直接映射，禁止再折。
   - `StatusFacts`：`bundle`、`review`、`declaration`、`evidence`、`finalLedger`、`receipt`、`plan` 各自的 ReadState。
   - `statusIssuesOf(facts)`：按固定顺序产出「哪一源读不到」的显式 issue 列表（bundle 优先）。
2. **一张优先级表**：`deriveBusinessBrief` 输入面加 `readIssue`（bundle/review/evidence）与 `reviewState`；
   顺序 = 挂起 > 预检 > 未绑定 > **bundle 读失败** > 已交付×审查 FAIL > 已交付 > 审查 FAIL（交付前政策）> 推进中；
   非致命读失败（review/evidence）不抢阶段，只进 `unknownLine` 并让 ⑤ 行显示失败 + 重试。
3. **一个地址身份函数**：`finalTargetOf({ addressPath, versionNames })` → `{ target, readerTarget, shownVersion, fallback }`；
   地址目标优先，`final.md`/通用地址才回退最新；目标缺失返回 target + 失败，不返回替代文件。
4. **一组同边界守卫**：
   - 纯函数矩阵：facts × read states、address × ledger、delivered × reviewFail；
   - 无矛盾性质测试：同一 brief 不得同时出现「已交付」与「报告不交付」；读失败不得出现「0 份」「✓ 审查」；
   - 浏览器 seed 场景 S1–S5（提交物，见 §4 P0），每场景断言「该出现的出现 + 不该出现的不出现」；
   - 源级不变量：`useStatusFeed` 的 `openRun`/`read`/`list` 结果必须进入 facts，不得直接 `: 0` / `: null` 折平
     （以「读点清单 + 直测」钉住，新增读取点必须加 case）。

## 3. 卡 → 修点 → 守卫（一批表，P0 填满后才开工）

| 卡 | 机制 | 修点（落层） | 同边界守卫 | 浏览器场景 |
|---|---|---|---|---|
| 356 | 地址目标被版本账覆盖 | `lib/run/final-target.ts`（`finalTargetOf` / `finalReadPlan`）+ `client/ResearchFinalTab.tsx`（读目标、标签用 shownVersion、缺目标即失败态）+ `zh/en` 文案 | `tests/run/gates/final-target.spec.mjs` 地址矩阵（改写旧「不论地址」条）；`tests/cockpit/client/final-tab-patterns.spec.mjs` 源级接线 | S1：交付 v1 + 未交付 v2 → 显示 v1；删 v1 留 v2 → 失败态，不显示 v2 |
| 357 | 交付前政策文案复用到已交付 | `lib/run/brief-fold.ts`（`delivered × reviewFail` 矩阵）+ `locales/zh-fold.ts`、`en-fold.ts` | `tests/cockpit/lib/run/brief-fold.spec.mjs` 四组合 + 无矛盾性质 | S2：已交付 + review FAIL → 不出现「报告不交付」；未交付 + FAIL → 仍出现（负控） |
| 358 | bundle 读失败折成进度 | `client/research-status/useStatusFeed.ts`（bundle error 态 + retry）+ `lib/run/brief-fold.ts`（bundle 读失败分支）+ `ResearchStatusTab.tsx`（失败横幅/重试）+ `lib/run/binding-trust.ts`（face marker → error）+ 文案 | 新 `tests/cockpit/lib/run/status-facts.spec.mjs` bundle 三态；`tests/run/gates/binding-trust.spec.mjs` marker；`tests/cockpit/lib/events/status-feed.spec.mjs` 接线 | S3：移走绑定 bundle → 「研究状态读取失败」+ 重试，不出现「研究推进中」 |
| 359 | review 读失败折成 absent/✓ | `useStatusFeed.ts`（review ReadState）+ `lib/run/run-fold.ts`（步骤 unknown）+ `TrackRail.tsx`（unknown 符号）+ `brief-fold.ts`（审查读失败进 unknownLine）+ 文案 | `status-facts.spec` review 三态；`tests/run/shared/run-fold.spec.mjs` unknown 步；`brief-fold.spec` | S4：`chmod 000 review.md` → 「审查读取失败」+ 重试，不出现 ✓ 审查 |
| 360 | evidence list 失败折成 0 | `useStatusFeed.ts`（evidence ReadState）+ `run-fold.ts`（unknown 步）+ `ResearchStatusTab.tsx`（⑤ 行失败态 + retry）+ 文案 | 同上 evidence 三态；`run-fold.spec`；`brief-fold.spec` | S5：`chmod 000 evidence/` → 「证据读取失败」+ 重试，不显示「证据 0 份」 |

**每卡都有自己的 case**；共享 `status-facts.spec` 不替代单卡用例。用例名统一带 `BUG-<NNN>`。

## 4. 修复次序（四个阶段；不按 BUG 号逐张修）

### P0 再就绪与证据升格（≈0.5 会话，不写生产代码）

1. 逐条复跑 §7 红命令，记录当前 verdict（确认 HEAD 上仍红；不是「读码即就绪」）。
2. 给 5 张卡补 `## 分诊与授权`（严重级/表面/边界/DSH 不变量/触及面/授权/批）与 `## 批`；
   加 `根因证据：` 行（夹具 verdict + 代码路径）；确认 `## 修复判据` 非空；翻 `修复就绪`。跑 `pnpm verify`（`backlog-liveness`）。
3. **守卫载体决策**（二选一，记录在卡内）：
   - 首选：新建 `checks/smoke/cockpit-truth.entry.mjs`（entry lane，keyless，`tier: dev-only`，复用
     `client-load-seed.support` + `web-harness` + `playwright`，自建 `client-load-team.overlay.yml`，5 场景 S1–S5，exit 0/1/2）；
     登记 `checks/smoke/registry.json` + `checks/README.md`。
   - 备选：在 `checks/smoke/client-load.entry.mjs` 追加 observation 相位；前提是不破坏既有 69 条断言。
   - 共同要求：seed 可 materialize；chmod/移走场景在运行时生成（提交物不依赖 chmod 位）；失败逐场景点名；
     运行前 `pnpm build`（`lib/client.js` 新鲜度自检会拦）。
4. 填 §7 批表；更新 [bugs/README](../bugs/README.md) 与 [issues/README](README.md) 的活跃清单；`pnpm verify`。
5. 退出：5 卡 `修复就绪`；守卫载体已定；`pnpm test` 基线绿；批表无空格。

### P1 356：交付目标优先（≈0.5–1 会话）

- **红先**：在 `final-target.spec` 写地址矩阵（v1 地址 + v2 账 → target v1；v1 缺失 → target v1 + 缺失；`final.md` 地址 → 最新），
  当前实现应红（它返回 `final.md`）。同时 S1 浏览器夹具应红（显示 v2）。
- **实现**：`finalTargetOf` + `finalReadPlan` 只保留「读面定表」职责；`ResearchFinalTab` 按 target 读正文/reader，
  目标缺失走 `finalUnreadable` + 重试，绝不换版本；`shownVersion` 单独出标签；reader 只认同版本。
- **旧测试取代**：删掉/改写「不论地址都回 `final.md`」那条，改成新矩阵；在卡与批 Note 记录「这是取代不是放宽」。
- **绿**：同一命令 exit 0；S1 两分支绿；`pnpm test` / `typecheck` / `build`；`fix-evidence`；卡 `修复落地`（不归档，留到 P3）。
- 退出：356 `修复落地`，地址矩阵 + S1 守卫在树内。

### P2 358/359/360 + 357：状态面事实模型（≈1.5–2 会话，一次设计、一个提交序列）

**P2a 读失败三态（358 → 359/360）**

1. 设计并落 `StatusFacts` / `ReadState`（或并入现有纯件的等价类型）；`useStatusFeed` 不再折平；加 `retry()`。
2. 358：bundle `openRun` 的 `missing/unreadable` 分别置态；`face===null && bound` 优先失败态；`statusFaceMarker` → `error`；
   brief 的 bundle 读失败分支；文案 zh/en；红 → 绿 → S3。
3. 359：`review` 三态；`hasFile` 不再单独决定步骤 ✓；`RunStep.state` 增 `'unknown'`（`?` 琥珀），`deriveSteps` 接
   `unknown` 输入且不让线性推断把它抹成 done；brief 的审查读失败进 `unknownLine`；红 → 绿 → S4。
4. 360：`evidence` 三态；`evidenceCount` 只在此态为 ok 时用；⑤ 行显示「证据读取失败」+ 重试；unknown 步；红 → 绿 → S5。
5. 每个子步各自 `fix-evidence` + `修复落地`；共享守卫不得替代单卡 case。

**P2b 交付 × 审查矩阵（357）**

6. 在**同一** `brief-fold` 设计里落 `delivered × reviewFail` 四组合（不要把 brief-fold 再改一遍）：
   - 未交付 + FAIL：保留交付前政策（负控）；
   - 已交付 + FAIL：新文案「已交付版本仍可用；新审查发现问题，补研究/复审后再出新版本」+ 指向 review.md；
   - 已交付 + PASS / 未交付 + PASS：既有文案不回退；
   - 无矛盾性质测试 + S2。
7. 红先（当前「报告不交付」出现）→ 绿 → `fix-evidence` → 357 `修复落地`。

**退出**：四卡 `修复落地`；`pnpm verify/test/typecheck/build` 全绿；S2–S5 绿；共享守卫与单卡 case 都在。

### P3 收口（≈0.5 会话）

1. 全量/定向复跑：`pnpm verify`、`pnpm test`、`pnpm typecheck`、`pnpm build`、新浏览器入口 5 场景；
   `reviewing-a-delivery` 技能做跨面语义自审（**机械门禁不跳**）。
2. 写批 Note（`notes/implemented/2026-11-22-observation-truthfulness.md`）：决定、输掉的方案、实际验证、判据形状、未证边界。
3. 同一次变更：5 卡 `fix-evidence` + `git mv` 到 `_archived/fixed_bugs/`；`bugs/README` 活跃/最近归档；
   批 Note；本卡 `已结` + `git mv` 到 `_archived/settled_issues/` + `issues/README`；`triggers.md` 的未证边界。
4. `pnpm verify` 复跑（`staged-change-pairing` 要求卡与代码/测试同暂存集）；结束。

### 为什么是这个次序（不是 BUG 号顺序）

| 选择 | 理由 | 代价/边界 |
|---|---|---|
| P0 先做 | 五卡已有现场但无「根因证据/可重放命令」的完整翻转；不先做就是「读码即就绪」 | 0.5 会话，不写生产代码 |
| 356 先于状态面四卡 | 独立纯路径、无共享代码、内容完整性风险最高、浏览器场景最简单；先跑通 seed 升格路径 | 0.5–1 会话 |
| 358 先于 359/360 | bundle 级失败先建立 ReadState/retry/失败横幅；359/360 是同一模型的按源变体 | 事实模型必须先有形状 |
| 357 与 358–360 同批 | 357 的交付×审查矩阵与读失败共用 `brief-fold`/状态页；分开修会二次改同一函数（G5 反模式） | 设计一次、提交序列内分步；每卡仍有独立 case |
| 不按 BUG 号逐张修 | 356 与四卡无共享路径；357 与 358–360 共享 fold；按号修会先撞共享路径两次 | — |

## 5. 流程保障：沿本仓流程，不靠自觉

### 5.1 继承上一批 G1–G11

G1 批表填满才开工 · G2 `修复就绪` 必须带可重放命令/未复现协议（`backlog-liveness`）· G3 每卡一案（共享守卫不替代）·
G4 红先绿后、`exit` 为 oracle · G5 一簇一提交序列、WIP=1 · G6 技术决定自定、阶段边界报告 · G7 验收阶梯
（verify → test → typecheck/build → 目标入口 → 浏览器）· G8 审查分层 · G9 真实产物夹具 · G10 同一事实同一输入集 ·
G11 时间谓词必须有推进面。

### 5.2 本批新增 G12–G16

| # | 保障 | 落点 | 防的是什么 |
|---|---|---|---|
| **G12** | **按显示事实登记**：先填 §3「页面事实 × 来源 × 状态 × 卡」表，再写代码；新读取点必须加行加 case | 本卡 §3 + `status-facts.spec` | 上一轮按 reader 扫描漏掉消费侧 |
| **G13** | **消费者边界守卫**：类修必须在消费面/浏览器证明；runtime 夹具只作诊断，不作 guard；guard 必须提交 | 新浏览器入口 / 既有 entry 相位 | 「单测各自自洽、产品仍坏」 |
| **G14** | **真值表**：多轴文案必须枚举全组合 + 无矛盾性质；单分支测试不算合成守卫 | `brief-fold.spec` 四组合 + 性质测试 | 357 的两句互斥 |
| **G15** | **地址身份**：带目标的地址是权威；禁止从版本账重算目标；通用地址才回退 | `final-target.spec` 矩阵 | 356 及同类「重算身份」 |
| **G16** | **旧测试显式取代**：修复与既有测试冲突时，必须改写为更强合同并记录理由；禁止只删/放宽 | 卡内「修复关联」+ 批 Note | 旧测试保护实现便利（356 现场） |

### 5.3 每卡 DoD（逐卡打勾，缺一不翻）

1. `修复就绪`：根因证据 + 修法 + 非空 `## 修复判据` + 可重放命令 + `## 分诊与授权`/`## 批`。
2. 红：同边界新用例在旧实现上 `exit≠0`，红因正确；记录命令与输出。
3. 绿：同一命令 `exit 0`；邻接/负控同跑。
4. 守卫：提交物在树内、同边界、能在回归上红；`guard` 路径或 `notMechanizable` + trigger。
5. `fix-evidence`：`changes` 含代码 + 测试/门禁资产；`red.exit≠0`；`green.exit=0`；`guard` 非空。
6. 卡 `修复落地`：`pnpm verify` 过 `backlog-liveness`；卡与代码/测试同暂存集（`staged-change-pairing`）。
7. 语义自审：跨面 diff（pack client + locales + tests + backlog + notes）跑 `reviewing-a-delivery`；跳过记理由。
8. 归档：`已修` + `git mv` + README + Note + trigger 同变更；`可关闭：是`。

### 5.4 机械命令（按阶段）

```sh
pnpm verify
pnpm test
pnpm typecheck
pnpm build
# 定向纯件（示例；文件名按实际落点）
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm --test tests/run/gates/final-target.spec.mjs tests/cockpit/lib/run/brief-fold.spec.mjs
# 浏览器（P0 定载体后；先 build）
node --import tsx/esm checks/smoke/cockpit-truth.entry.mjs
# 或既有入口
node --import tsx/esm checks/smoke/client-load.entry.mjs --seed tests/fixtures/client-load-home --port <free>
```

### 5.5 技能与登记（改到哪一面就加载哪一面）

- 用户可见文案：`changing-ui-copy`（zh/en 同 diff；fold 文案住 `zh-fold/en-fold`，chrome 住 `zh/en`；locale/i18n/cjk 守卫）。
- 新增/改造门禁：`writing-a-gate`（先看红、登记 guard-ledger / asset-ledger / evaluation ledger）。
- 交付前：`reviewing-a-delivery`（语义自审，不替代机械门禁）。
- 新增 `src/lib` 纯件：`faces.json` + 直测（`pack src/lib 每个纯件被直接 import` 检查会红）。

## 判据形状

本程序引入/修改的判据：

- **权威事实**：bundle/文件读取只认 `run-context` 的 `Outcome`（missing/unreadable/ok）；审查终局只认
  `terminalReadiness`；交付只认 `present` 事件 ∨ 工具回执；终稿目标只认地址；不做第二份手写事实。
- **读取方**：状态页数据装配（`useStatusFeed`）、业务摘要（`brief-fold`）、步骤条（`run-fold`/`TrackRail`）、
  终稿页签（`ResearchFinalTab`）、浏览器守卫、纯函数矩阵测试。
- **坏输入**：
  - bundle `missing` 与 `unreadable` 分开；unreadable → 失败态 + 重试，**不得**显示「研究推进中」；
  - review `absent`（真没有）≠ `unreadable`（在而读不到）≠ `FAIL`（读到但不过）；unreadable 不得给 ✓ 审查；
  - evidence `absent` / `unreadable` / `ok(0)` 三态分开；unreadable 不得显示「0 份」；
  - 地址目标缺失 → 失败态；**不得**用 `final.md` 或更高版本替代；
  - 已交付 + review FAIL 是合法共存：不得出现「报告不交付」；未交付 + FAIL 仍是交付前政策（负控）。
- **旧形态退场**：`finalReadPlan` 的「地址不影响正文」旧合同退场；`reviewFail: boolean|null` 不再作为状态页唯一审查态；
  `face: null` 不再兼任读失败。旧 bundle 数据不迁移、不兼容（沿用上一批 P1）。
- **反证**：每个分支做「回退到旧实现 → 对应 case 红」；`brief` 做无矛盾性质；地址矩阵做 4 方向；
  浏览器 S1–S5 做「该出现/不该出现」双断言。

## 7. 批表（P0 开工前填满；空格 = 不开工）

| 卡 | 边界 / 红命令（同边界） | 共享 owner | guard | 处置 |
|---|---|---|---|---|
| 356 | `node --import tsx/esm runtime/e2e/final-version-e2e.mjs` → `showsUndeliveredV2:true` | `final-target` / `ResearchFinalTab` | `final-target.spec` 地址矩阵 + S1 | 修 |
| 357 | `node --import tsx/esm runtime/e2e/review-fail-e2e.mjs` → 两句同页 | `brief-fold` | `brief-fold.spec` 四组合 + S2 | 修 |
| 358 | `node --import tsx/esm runtime/e2e/status-bundle-missing-e2e.mjs` → `failureShown:false` | `useStatusFeed` / `brief-fold` | `status-facts.spec` + `binding-trust.spec` + S3 | 修 |
| 359 | `node --import tsx/esm runtime/e2e/review-read-error-e2e.mjs` → `reviewFailShown:false` + ✓ 审查 | `useStatusFeed` / `run-fold` | `status-facts.spec` + `run-fold.spec` + S4 | 修 |
| 360 | `node --import tsx/esm runtime/e2e/evidence-read-error-e2e.mjs` → `evidenceReadFailureShown:false` + 「0 份」 | `useStatusFeed` / `run-fold` | `status-facts.spec` + `run-fold.spec` + S5 | 修 |

> 五条 runtime 命令是**诊断现场**，不是最终 guard；P0 升格为提交物后，卡内 `fix-evidence.red` 用升格后的同边界命令
> （或运行时命令 + `changes` 含测试/门禁资产，并按方法 §7 记录读法协议）。

## 验收标准

1. **5 张卡全部 `已修` 归档**，每卡 `json fix-evidence` 的 `changes` 含代码 + 提交的守卫资产，`red.exit≠0`、`green.exit=0`、
   `guard` 与缺陷同边界；每卡用例名带 BUG 号。
2. **F1**：bundle/review/evidence 的 `ok/absent/unreadable` 三态在纯函数矩阵与浏览器 S3–S5 都成立；
   读失败显示明确失败态 + 重试，不出现「研究推进中」「✓ 审查」「证据 0 份」。
3. **F2**：地址矩阵 + S1 成立；已交付 v1 + 未交付 v2 显示 v1；目标缺失即失败，不换文件/换版本。
4. **F3**：`delivered × reviewFail` 四组合 + 无矛盾性质 + S2 成立；未交付 + FAIL 的旧政策作为负控保留。
5. **步骤条**：unknown 步不再被线性推成 ✓；全流程不再「读失败但全绿」。
6. **机械面**：`pnpm verify` / `pnpm test` / `pnpm typecheck` / `pnpm build` 全绿；新浏览器入口 5 场景绿；
   locale/i18n/cjk 守卫绿；`backlog-liveness` / `staged-change-pairing` 过。
7. **文档与去向**：批 Note（决定/输掉的方案/实际验证/未证边界）+ 5 卡归档 + `bugs/README` + 本卡 `已结` 归档 +
   `issues/README` + `triggers.md` 同一变更。
8. **范围**：不改 vendor；不做旧 bundle 兼容；不吸收表外新缺陷（新发现 = 新卡）；不伪造浏览器 NOT-RUN 为绿。

## 9. 预算、停止条件与升级路径

- **预算**：P0 0.5、P1 0.5–1、P2 1.5–2、P3 0.5 会话；合计约 3–4，按 5–6 会话给足余量（含浏览器重跑/主机负载）。
- **停止并记录**（不自行扩面）：
  1. 某卡在同边界建不出红（翻回 `排查中`，留撤回记录）；
  2. 浏览器被主机负载/环境阻断（`NOT-RUN` + trigger；卡停 `修复落地`，不冒充 `已修`）；
  3. 修复与既有测试冲突且无法给出更强合同（先写清取代理由，不静默删/放宽）；
  4. 新证据推翻根因（回退 `排查中`，留撤回）；
  5. 事实模型需要重画整条轨道/全站状态机（本程序只做状态页 + 终稿页签的有界事实模型；超界另立卡）。
- **升级路径**：仅当触及 D 号/入口链/门禁与验收合同/文档合同/pack 公共行为时转 `等人拍板`；本批均为 P2 观察面修理型，
  自授权。静默自主执行，阶段边界汇报；不把技术选择推给用户。

## 10. 显式不做

- 不 patch `vendor/dsh/`；不改 agent loop。
- 不为旧 `delivery.json` / 旧 bundle 写兼容分支或迁移脚本（沿用上一批「不做兼容」裁定）。
- 不重写驾驶舱布局/样式；只补事实态、失败态、重试、unknown 步与文案。
- 不把「读失败」写成「研究失败」；不把「审查读不到」写成「审查 FAIL」；不把「证据读不到」写成「0 份」。
- 不把「已交付 + review FAIL」写成「已交付失效」或「审查通过」。
- 不删测试凑绿；不把 runtime 夹具当永久 guard；不把 `NOT-RUN` 记成 PASS。

## 11. 未证边界（收口时进批 Note / triggers）

- 英文 locale 的浏览器装配面（J16 旧缺口）：本批文案有 en 单测，浏览器仍以 zh-CN 为主；若未跑 en 面，登记 trigger。
- 真模型对观察面文案无影响（本批不碰模型可见内容），但「下一次自然 run 的 canonical 遵守」仍是上一批的未证边界，不并入本批。
- 浏览器 S1–S5 若因主机负载 NOT-RUN：卡停 `修复落地`；trigger = 「下一次 client-load/dev-home 可用时复跑五场景」。
- 终稿 reader 版的历史形态（旧 bundle 只有 readable.md、无 readable-vN）保持既有回退；不在本批扩兼容。

## 12. 执行入口（goal 用）

- 每轮先读本卡 §4；只推进当前阶段，阶段结束把「实际红/绿/未跑 + 卡状态」回填本卡，再进下一阶段。
- 每卡翻状态前对照 §5.3 DoD；任何一步缺证据就停在该状态，不跳。
- 收口按 §4 P3 与 §验收标准；完成条件 = §验收标准 全部成立，而不是「代码改完」。
