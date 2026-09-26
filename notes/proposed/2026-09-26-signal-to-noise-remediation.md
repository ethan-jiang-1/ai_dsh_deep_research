# RFC：信噪比整治（fresh-agent 双链清晰化 + 活文档腐烂清扫）

> 状态：proposed

归宿：roadmap §队列「信噪比整治」（卫生/长期，用户 2026-09-26 指令"是到了还技术债务的
时候了……我们需要高的信噪比"）。§问题 的腐烂清单 = 三支探针 2026-09-26 实跑取证（零上下文
fresh-agent 双链走读 ×2 + 机械扫描 ×1），非推测。

## 问题

三个独立病灶，共同点是**让 fresh agent 读到"现在不为真"的东西**。①③ 机械可查，② 是结构。

### ① 活文档腐烂（自指事实说错）

"自指事实" = 文档对**本仓自身状态**的断言（版本、计数、决策生死、生成物形态、路径契约、
交付状态）。这类断言没有 owner，也不受任何门禁保护——本仓门禁保护的是**产物与结构**
（镜像新鲜度、链接、格式、预算），保护不到"散文里说的系统状态"。

| # | 位置 | 现在说的 | 事实 |
|---|---|---|---|
| 1 | [00-index](../..//docs/00-index.md) D10 行 | vendor submodule **延后**、机制权威**暂借** company 仓、vendor-pin 门禁"随队列条目启用" | 已落地并销账：`vendor/dsh` 是钉 tag 权威（[AGENTS.md](../../AGENTS.md) §DSH 源码表、[evaluation.md](../../docs/evaluation.md) §L0、[design/10](../../docs/design/10-architecture.md) §6） |
| 2 | [00-index](../../docs/00-index.md) D7 行 | "pack 内零自写 JS、零构建、**无 client 面**"，行内还挂着"2026-09-25 修订 → D18" | D18 已开单点例外：pack 有 `src/client/` 与 `lib/client.js` 构建产物 |
| 3 | [00-index](../../docs/00-index.md) 待定表 | 4 条划掉的已销账 Q + 追记段（活台账里的历史） | 决策台账该只写 now；历史归 notes/ 与 git |
| 4 | [guides/62](../../docs/guides/62-plugin-authoring.md) 词汇表 | "本仓是**纯配置包**，暂无自写 TS 插件" | `src/index.ts` + `src/client/index.ts` 都是导出 `apply(ctx)` 的插件（D18）——**插件作者入口页**说错自家形态 |
| 5 | [discipline-map](../../docs/discipline-map.md) 形态表 | "生成 + freshness 门禁：本仓实例 = **无 tracked 生成物**" | `dev/research.overlay.yml`（`overlay-fresh` 把守）与 pack 工作区种子（`pack-workspace-fresh` 把守）都是 tracked 生成物；evaluation.md 自称"本仓首个 tracked 生成物"——**两份合同互相打脸** |
| 6 | [discipline-map](../../docs/discipline-map.md) 形态表 | "混合形态：本仓实例 = `agent.cordis.yml`（手写）↔ overlay" | 0.1.7 形态 = `presets/<role>.patch.yml`；`agent.cordis.yml` 已不在盘上 |
| 7 | [design/10](../../docs/design/10-architecture.md) §2 通道表 | profile 装 `@…-agent-team-profile@0.1.5-rc.2` | `dev/boot-run.sh` 从 pack 兼容矩阵派生 = **0.1.7-rc.2** |
| 8 | [dev/env.sh](../../dev/env.sh) 头注 | "机制基线 = 本仓 vendor/dsh（pinned tag `dsh-v0.1.5-rc.2`…）" | 钉 tag = `dsh-v0.1.7-rc.2` @ `477b4f4205` |
| 9 | [README.md](../../README.md) Rules | "Node >= 20" | `engines.node` = `^22.19.0 \|\| >=24.0.0`（`repo-conventions` 门禁强制等于 vendor） |
| 10 | [AGENTS.md](../../AGENTS.md) 偏离登记簿 + [design/10](../../docs/design/10-architecture.md) §6 | "23 tests 绿即证据" | 现为 **53 tests** |
| 11 | [notes/README](../README.md) §时态表后 | "`implemented/` 有 26 篇而队列只有 2 条" | 现为 **40 篇 / 1 条**——手抄计数住在一张"时态地图"里 |
| 12 | [roadmap.md](../../roadmap.md) 队列节尾 | "（已毕业离队 2026-09-26：…）"12 行历史块 | 与同文件头注"完成即离队（历史归 notes/ + git，**队列里看不见它**）"及 D13 自相矛盾；且随毕业无限增长，把唯一"当前"指针埋掉 |
| 13 | [ui-skin RFC](2026-09-24-ui-skin.md) · [research-type-coverage RFC](2026-09-25-research-type-coverage.md) | 把"▶ 观察面 GUI 化"当作当前指针引用 | 该条目已毕业，▶ 已移交 |
| 14 | [discipline-map](../../docs/discipline-map.md) 图例 · [alignment-ledger](../../docs/alignment-ledger.json) ×4 | "纯配置仓/纯配置 deep-research-pack" | 同 #4 |
| 15 | 非 `.md` tracked 文件里的 RFC 指针（**13 处**，机械复算）：`presets/{lead,analyst,critic,scout}.patch.yml:5`、`dev/boot-run.sh:3`、`dev/vendor-build.sh:7`、`dev/vendor-typert-emit.mjs:3`、`scripts/entry-chain-probe.mjs:3`、`scripts/run-dashboard.mjs:2-3`、`tests/run-dashboard.test.mjs:1,92`、`docs/alignment-ledger.json:722` | 指 `notes/proposed/<某 RFC>.md` | 该 RFC 已毕业迁 `implemented/`——指针 404。**门禁盲区**：`md-links`/`md-anchors` 只扫 tracked `.md` 的链接语法，yml/sh/mjs/json 注释逃检。preset 头注尤其要紧——它是**模型可见**文本 |
| 16 | [research-type-coverage RFC](2026-09-25-research-type-coverage.md) §验收 | 13 行里有孤儿子项（无父项）、游离右括号、`（原验收如下）` 把一节劈成两份互相竞争的清单；且无 `实施记录` 节 | 该 RFC 是 ▶ 条目的**唯一验收正本**，而 guides/60 §7 的中断恢复又要求读"文末实施记录"——fresh agent 必须满足的那一节恰好不可用 |
| 17 | `dev/harness-home/runs/cn-ai-chip-adoption/`（旧 `runs/` 契约残留）与 `research-workspace/drt_*` | 两个 run 根并存，`run-dashboard` 两处都扫 | D17 已把 run bundle 定为 `research-workspace/drt_<slug>/`；旧根是 A→B 变迁残留，让"哪个才是这次的 run"需要猜 |
| 18 | [README.md](../../README.md) Rules | "测试用 `node:test` + `node:assert`，**零 npm 依赖**" | `package.json` 有 25 个 devDependencies；[AGENTS.md](../../AGENTS.md) 偏离登记簿自己记着"首版零 npm 依赖原则……已重估维持"——README 在复述一条已被放弃的原则 |
| 19 | [00-index](../../docs/00-index.md) D9 行 · [design/10](../../docs/design/10-architecture.md) §4 | web 工具行"`fetch: true` + **60s 超时**" | 盘上只有 `fetch: true`（布尔启用）+ `searchTimeoutMs: 60000`（**搜索**预算）；**`fetchTimeoutMs` 全仓未设**，实际取 vendor 默认 30s。文档把搜索预算说成抓取超时——照文档改会**改错字段且全部门禁仍绿**（探针实测：任务"把抓取超时 60s 改 90s"在字面读法下改的是搜索预算） |
| 20 | [guides/62](../../docs/guides/62-plugin-authoring.md) 影响面矩阵 | "改 profile 镜像｜不手改——`dev/boot-run.sh` **幂等重建**" | boot-run 只在组合不全时重建；**漂移时 exit 1** 并要求手动 `rm -rf` 重跑（见 §③） |

> **撤回一行**：初版把 [agent-friendly-polish Note](../implemented/2026-09-24-agent-friendly-polish.md) 里的旧路径列为腐烂——复核确认那是**过去时记录**（该 Note 记的正是那次漂移的修复），按层规则合法，已撤下。第二遍只读深扫另找出 32 行，见 §实施记录 S0 深扫补充。

**同一命令两种写法**（7 处）：`node --import tsx/esm --test tests/*.test.mjs`（[AGENTS.md](../../AGENTS.md) §命令表、`package.json`、pre-commit）vs 裸 `node --test tests/*.test.mjs`（[guides/60](../../docs/guides/60-dev-loop.md) §2/§4、[evaluation.md](../../docs/evaluation.md) §L0、[tests/AGENTS.md](../../tests/AGENTS.md)、[discipline-map](../../docs/discipline-map.md)、graduating skill）。两者在 engines 地板上都能跑，但**同一事实两个家**就是漂移面。

### ② 双链的清晰度缺口（结构）

两条链各自成立、指针全活（`entry-chain` / `queue-pointer-live` / `md-links` 全绿），但**没有把
"给多少、什么时候给"写成契约**。零上下文探针实测（同口径 2026-09-24 那次评分 4.5/5）：

| 链步 | 载入 | 实测 |
|---|---|---|
| 1 [AGENTS.md](../../AGENTS.md) | 139 行 | 稠密且必要，但**命令表约 70 行是"还不知道条目就用不上"的细节**——略多 |
| 2 [00-index](../../docs/00-index.md) | 104 行 | **过载**：只需"有哪些文档"+"▶ 是唯一当前指针"两件事，拿到的是 D1–D18 全台账 + 术语映射 + 外部材料登记 |
| 3 [roadmap.md](../../roadmap.md) | 40 行 | **本链最佳一步**：一屏、一个 ▶、次序依据如实交代"为什么静默期推不动" |
| 4 该条目 RFC | 38 行 | 尺寸对、**内容坏**（§问题① 第 17 行）——唯一必须满足的那一节不可用 |
| 5 [guides/60](../../docs/guides/60-dev-loop.md) | 115 行 | 对**代码型**条目对；对研究型条目是**错的那一半**（见下） |

链上总载入 ≈436 行；答全四问实际需 ≈815 行 + 十余次 grep。四个具体缺口：

- **不标注可执行性**：▶ 是"用户带题驱动"、静默期做不了——这条只写在 roadmap 次序依据里，
  入口链（AGENTS.md §入口链）与 guides/60 §0/§1 都不承认"条目可能卡在等人"。实测：fresh
  agent 沿链走到第 4 步才发现卡住，白走一趟。
- **链是代码形状的**：研究型条目真正的程序住在 [guides/61](../../docs/guides/61-run-playbook.md)
  与 [running-a-research-run](../../.agents/skills/running-a-research-run/SKILL.md)——**两者都不在链上**；
  且链从不点名 `.agents/skills/`，也不说哪类条目归哪个技能（探针靠会话自带技能目录才找到）。
  研究型条目还有一条**硬前置**（把 `research-workspace` 注册进 DSH，否则手册不进上下文）
  只住在 guides/61 §1。
- **执行链跨三页分权**："必改什么"住 [guides/62](../../docs/guides/62-plugin-authoring.md) 影响面矩阵，
  "必跑哪些面"住 guides/60 §2，"done 判据"住 [evaluation.md](../../docs/evaluation.md) §1——
  没有单一"我在哪、下一步是什么"的路由表，fresh agent 必须自己把三页拼起来。
- **用户直派任务没有入口**：入口链第 3 步写的是"该 ▶ 条目"，执行链 §0 的生命周期也从"索引行
  已在队列"起步——**不在队列里的用户直派任务没有成文路径**。逃生口只写在子文档里
  （[proposed/README](README.md) 规则 5、[implemented/README](../implemented/README.md) 进门行）。
  本 RFC 自身就是这样一个任务（用户 2026-09-26 直派），路径是事后补的。
- **生成物与检查的次序没有单一出处**：改 preset 后必须**先** `node dev/render-overlay.mjs`
  再跑 L1——L1 挂的是 `dev/research.overlay.yml`（不是 pack 源），跳过渲染会让 L1 **拿旧值挂载
  并打 ALL PASS**。这条次序散在四处文档里，没有一处写明。
- **值级改动不可证**：没有任何验收判据引用配置**值**（门禁只证结构、L1 只证"还能挂载"）。
  于是"把某超时改成 90s"这类改动的 done 只能证到"仍挂载 + 文档改了"——本仓没有可证伪的
  值级断言。
- **根 AGENTS.md 139/140 行**（预算顶格）：命令表 + 布局树约占一半。任何新增常驻指令都得先做
  下放决策——**渐进式披露没有结构余量**，这才是"每次给不多不少"的制度性障碍。

### ③ 投影说谎与静默漂移（工具层，非文档）

- **[run-dashboard.mjs](../../scripts/run-dashboard.mjs) 的 review 折算取首个匹配**：正则
  `/readiness:\s*(PASS|FAIL)/` 命中**第一处**。实测 run bundle 的 `review.md` 是两相结构
  （首审 `readiness: FAIL` 在前，lead 改稿后的复核终审 `readiness: PASS` 在后），于是**已交付
  的 run 在仪表盘上显示 `readiness: FAIL`、交付 6/7**。夹具
  （`tests/fixtures/run-dashboard/run/review.md`）只有单相单标记，故测试绿而真实形态错——
  违反本仓自己的"测边界形态"纪律（[scripts/AGENTS.md](../../scripts/AGENTS.md)）。
- **[guides/62](../../docs/guides/62-plugin-authoring.md) 影响面矩阵把 profile 镜像说成
  "`boot-run.sh` 幂等重建"**：实际只在组合不全时重建，**漂移时 exit 1** 并要求手动
  `rm -rf <profile>` 重跑；绕过 boot-run 直接 `dsh --profile research` 会静默用旧值。
- **preset 行 key 无 schema 校验**：schemastery 对象解析非严格（未知键静默合并后忽略），
  拼错的键（如 `fetchTimeoutsMs`）**不报错、L1 仍绿**——没有门禁把 preset 行键对回 vendor schema。

## 判据（什么算"干净"）

1. **腐烂清单清零**：§问题① 每行都在同一变更里改掉；`entry-chain-probe` 的答案不再命中旧事实。
2. **一个事实一个家**：枚举的自指事实各有唯一 owner（pin/版本 · 计数 · 决策生死 · 生成物形态 ·
   路径与命令契约），其余位置只留链接。
3. **入口链能回答"现在能不能开工"**：▶ 的可执行性在链上可见（等人 / 可自主推进），不需要
   读到 RFC 才发现；研究型条目在链上就能拿到 guides/61 + 对应技能 + 硬前置。
4. **执行链有单一路由表**：给定一个任务型（代码 / preset / 研究 run / 门禁 / **用户直派非队列
   任务**），能**在一处**查到"必改什么 + 生成物与检查的次序 + 必跑哪些面 + 必写什么 + done
   判据"，其余页作为细节被链接而非复述；值级改动有可证伪断言或显式"不可证"声明。
5. **根 AGENTS.md 留出余量**：落到预算内并留 headroom（目标 ≤ 上限 −10 行）。
6. **投影与真实一致**：run-dashboard 对多相 `review.md` 取**终局**判定；夹具含两相形态；
   两个 run 根只剩一个正本。
7. **防复发**：每条新门禁带反证记录（注入回归 → 红 → 还原 → 绿）并登记 evaluation.md §L0 台账；
   `ref-paths` 上线后，第 15 行那类指针不可能再静默 404。
8. **零上下文复验**：fresh-agent 走读零盲找、零猜测、无"读多了/读少了"抱怨；链上载入显著
   低于当前 ≈436 行，且**答全四问不再需要离开链**；同口径不低于 2026-09-24 那次审计的 4.5/5。

## 方案（五阶段，按序）

**S0 · 基线与判据固化**——三支探针在现状上各跑一次并留档（`entry-chain-probe` 真模型档 +
零上下文 fresh-agent 双链走读 + 机械腐烂扫描）；基线表（fresh agent 现在会答错什么）入本
RFC 附录或独立 Note。**为什么先**：没有基线，"更清楚"不可验证；探针即验收工具。

**S1 · 活文档腐烂清扫**——逐行修 §问题① 全部 20 行：pin/版本（1–3、7–9）、计数（10–11）、
决策生死（4–6）、生成物形态（5–6）、路径与命令契约（13–15）、计划层历史（12）、工具面字段
误标（19）、镜像重建语义（20）、**▶ 条目 RFC 的 §验收 修复 + 补 `实施记录` 节**（16）、旧 run
根残留判定（17）、README 原则复述（18）；命令双写法收敛；顺带修 ③（readiness 终局判定 +
两相夹具）。**注意**：第 15 行含 `presets/*.patch.yml` 头注——那是模型可见文本且属 preset
内容，**触发 L1 preset-smoke 面**，按 [guides/60](../../docs/guides/60-dev-loop.md) §2 单独跑、
单独提交窄切片。**为什么第二**：最便宜、立刻提 SNR，且 S2/S3 的编辑要以"哪些是错的"为前提。
机械、低风险、可分批提交。

**S2 · 单一归属与预算余量**——每个自指事实指定唯一 owner（pin 的正本 = `.gitmodules` +
pack 兼容矩阵；门禁/测试计数**不写进文档**，只留查询入口；决策生死归 00-index 台账的 now 态；
生成物形态归 discipline-map 一处）；根 AGENTS.md 下放/压缩到预算内并留余量。**为什么在 S3
之前**：双链重构的本质就是"把内容放到它的 owner 层"，先定归属再改链。

**S3 · 双链显性化**（用户核心诉求）——probe chain：显式契约表（每步：读什么 → 现在应知道
什么 → 卡住怎么办），**并按条目类型分支**（代码型 → guides/60；研究型 → guides/61 +
running-a-research-run 技能），点名 `.agents/skills/` 与"哪类条目归哪个技能"的对应；
▶ 可执行性上浮（等人 / 可自主推进，含研究型的硬前置：工作区注册）。task execution chain：
单一路由表（任务型 → 同 diff 必改 → **生成物与检查的次序** → 必跑面 → 必写 → done），owner
唯一，62 与 evaluation 降为被链接的细节；路由表须对"值级改动"给出可证伪断言（或显式声明
该改动不可证、只能证到"仍挂载 + 文档同步"——**不许留白**）。另补**用户直派任务入口**（不在
队列里的任务走哪条路：何时直接 `implemented/`、何时先立 RFC——把子文档里的逃生口提到链上）。
**为什么第三**：依赖 S2 定好的归属，否则重构会再造双家。

**S4 · 机械防复发**——把 S1–S3 的结论钉成门禁（每条带反证、窄范围、防空语料）：
(a) `pin-agreement`：live 文档/脚本里的 pin（tag/commit/层版本）与 `.gitmodules` + submodule
HEAD + pack 兼容矩阵一致（现状已有 3 处不一致，红证现成）；
(b) 计数自由：live 文档禁硬编码门禁数/tests 数/note 数（或与真值机械对账）；
(c) `doc-now-only`（窄版）：live 文档禁"已销账 / 修订→ / 曾 / 不再"等变更史措辞（机制表白名单）；
(d) 投影终局判定：run-dashboard 多相折算的回归断言；
(e) `ref-paths`：tracked **非 `.md`** 文件（yml/sh/mjs/json）里的仓内路径引用必须可解析——
补 `md-links`/`md-anchors` 的盲区（第 16 行那 17 处正是从这里逃掉的）。
**为什么最后**：门禁要编码**已定型**的形状，否则会把过渡态钉死。

**S5 · 记忆层复查**（收尾，可延后）——notes/ 40 篇按机制名可检索性抽查；复核
[notes/README](../README.md) 自定的 `implemented/` 分类/归档触发条件（阈值 ≈50 篇，现 40）；
对已无指导价值的存量执行删除或完整取代。**为什么最后**：收益最低、风险最高（删证据链）。

## 输掉的方案

- **大扫除式重写文档树**：淹没审阅、抹掉证据链，且与"垂直轮 + 窄证据切片"纪律冲突；
  2026-09-24 那次审计已否决过一次同型方案。
- **把腐烂清单只留在会话里、不入库**：违反 D12 与用户 2026-09-25"显性化所有内容"指令；
  会话日志不是给人读的规划面。
- **为每类自指事实立刻加门禁（跳过 S1/S2）**：门禁会编码**当前**的（错误的）形状；且新门禁
  必须带反证 + 窄范围，先清扫再定形成本更低。
- **整体归档/删除 `notes/implemented/` 的 40 篇**：它是**活的决策记忆**（[implemented/README](../implemented/README.md)），
  删除须先完整取代；本 RFC 只做可检索性抽查。
- **把根 AGENTS.md 预算升顶到 ~180 行**：上限过低才是预算 bug，但此处不是——命令表与布局树
  本来就有更低的家；先下放，升顶须单独举证。
- **引入"整治进度状态文件"**：guides/60 §7 已否决控制文件那套（第二份"状态的家"必然漂移）；
  进度 = 本 RFC 的实施记录 + git。

## 验收

- S1 后：§问题① 清单清零；`node scripts/verify.mjs` + `node --test tests/*.test.mjs` 全绿；
  run-dashboard 对两相 `review.md` 报 PASS（真 run bundle 上复验，非仅夹具）。
- S2 后：枚举的自指事实"同一事实两个家"审计返回零；根 AGENTS.md ≤ 上限 −10 行。
- S3 后：`entry-chain-probe` 四问全中且答案不含猜测；零上下文 fresh-agent 走读**零盲找**，
  并能在链上一眼看出"当前条目等人 / 可自主推进"。
- S4 后：每条新门禁有反证记录并登记 [evaluation.md](../../docs/evaluation.md) §L0 台账；
  注入回归 → 红 → 还原 → 绿逐条实跑。
- 全程：涉及面按 [guides/60](../../docs/guides/60-dev-loop.md) §2 加跑（本 RFC 以文档/脚本为主，
  触发 L1/L2 时按表加跑）；每阶段同 diff 更新文档并提交窄证据切片。

## 实施记录

### S0 · 基线（2026-09-26，三支探针实跑）

| 探针 | 形态 | 结论 |
|---|---|---|
| probe chain 走读 | 零上下文 subagent，只读，任务 = "继续这个项目" | 五步指针全活、四问全部答出；但**走到第 4 步才发现条目卡在等人**（白走一趟）；链是代码形状的，研究型条目的真程序在链外；链上 ≈436 行 / 答全四问实际 ≈815 行 + grep |
| task execution chain 走读 | 零上下文 subagent，只读，任务 = 改 scout web 行的抓取超时 | 判 **NO**：文档把 `searchTimeoutMs` 说成 fetch 超时，照文档改会**改错字段且全门禁仍绿**；无值级验收判据；用户直派任务无成文路径 |
| 机械腐烂扫描 | 本仓脚本 + git grep + 路径解析 | §问题① 共 20 行；另机械复算出**13 处**非 `.md` 死指针（探针初报 17，本仓复算修正为 13——**取证数字必须复算**，这条本身即是本轮纪律的样本） |

**基线状态**：`verify` 27 门禁全绿、`pnpm test` 53/53 绿——**腐烂全部活在门禁的盲区里**（散文
里的自指断言、非 `.md` 注释、投影工具）。这正是"高信噪比"要补的那一类：门禁保护产物与结构，
保护不到"文档说的系统状态"。

### S0 · 深扫补充（第二遍独立只读扫描，2026-09-26）

第一遍是"沿链走读 + 定向 grep"；第二遍换方法（全仓逐文件对照真值源 + 表列数校验 + 门禁集合
比对），去重后另找出 **40 行**。两行 HIGH 是主表漏掉的：

- [guides/61](../../docs/guides/61-run-playbook.md) 白屏判别序 ③ 让操作员跑 `pnpm run build:web`
  ——**仓根 `package.json` 没有这个 script**（只有 verify/test/dsh），它只存在于 `vendor/dsh`；
  同句引的 `AGENTS.md §命令表` 条目其实是 `bash dev/vendor-build.sh`。**事故中跑不存在的命令。**
- [discipline-map](../../docs/discipline-map.md) 形态表 :27 仍写"无 TypeScript 源码"（TS 面自 D18 起
  存在）——该行自己的重估触发条件已命中。

其余按类：**计数/枚举残值**（`80 条`→101、`17+ 门禁`→27、`四份子树 AGENTS.md`→五份、`132 行`→139、
`三断言`→13+、真模型档列 2 或 3 个→4、roadmap `7/7`→13）；**已废命名**（门禁 `entry-budget` 已更名
`doc-budgets` 且上限 145→140；preset 载体 `presets/<role>/agent.cordis.yml` 不存在；postmortem 形状
`NNNN-` 实为日期 slug；`review-critic.md` 化石名；钉 hash `477b4f420505`）；**已闭问题的"待定"表述**
（design/20 的 Q4/Q5、design/30 的 Q6 都写着"待首个 run 实测"，而 run 已于 2026-09-25 关闭它们）；
**已交付功能的"未接通"表述**（roadmap 历史块与 observability-completion Note 都说 workspaceFiles
未接通，实际 2026-09-26 已接通并有硬断言）；**形态表失真的"不适用"理由**（无 client UI 代码 /
无构建产物测试面 / 无 TS 面 / "纯配置仓"图例）；**表结构畸形**（00-index 外部材料表 4 格对 3 列表头、
research/README 行 3 格对 4 列表头）；**门禁盲区同类**（fixture 里的 `runs/` 旧约定、`verify.mjs`
注释编号与 gates 数组错位、`.agents/skills` 的"三处同步"漏 package.json 与 l4-lite 步骤）。

**方法教训两条（进 S4 门禁设计）**：① 探针初报 17 处死指针，机械复算 = 13——**外部报数一律复算**；
② 主表把一条**过去时记录**误判为腐烂（[agent-friendly-polish Note](../implemented/2026-09-24-agent-friendly-polish.md)
记的正是那次漂移的修复）——**判腐烂必须先判层**，层规则优先于"看起来旧"。

### S1 · 清扫完成（2026-09-26）

主清单 20 行 + 深扫补充 40 行**全部处置**（四支只读→修复代理按文件严格分区并行，主线只做判断类
与跨文件收口）。处置手法三类：**改成现在时的事实**（D7/D9/D10 行、形态表两行、guides/62 三处）、
**去数字化**（门禁数/tests 数/断言数/note 数/行数一律不再写进散文，改指正本）、**下沉历史**
（roadmap 的"已毕业离队"块删除；discipline-map 的 0.1.7 重审表整体迁进
[升 pin 毕业 Note](../implemented/2026-09-25-vendor-pin-bump-017rc2.md)，原地只留维护规则与指针）。

**S1 追加发现（本轮最重的一条，性质 = 假称的防复发）**：commit `e152961` 的 message 声称
"vendor-build.sh 固化 ⑦ host 半补建 ⑧ 前端壳重建 两步（防下次升 pin 重蹈）"，但
`git show --stat e152961` 显示该 commit **根本没碰 `dev/vendor-build.sh`**，HEAD 版脚本只有 ①–⑥——
即**声称的防线从未落地**（与 [毕业漂移复盘](../postmortem/2026-09-26-roadmap-graduation-drift.md)
同一失效类：message 凭意图写、不凭 diff 写）。后果是真实的：升 pin 后 `apps/web/dist` 会留上一代
平台壳，Web UI 静默报 `settingsNumberField is not a function`（该 message 自己记了这次事故）。
**已补齐并实测**：⑦ 判据 = "有 `lib/types/index.js` 而无 `lib/index.js`"（实测**当场命中
`apps/desktop-host` 一个真缺件**，补建后 313/313 齐全）；⑧ = `pnpm --filter
@deepseek-ai/dsh-web-frontend run build`（vite build 2s；`apps/web/dist` 在 vendor `.gitignore`
内，重建不污染只读面——实测 `vendor-clean` 仍绿）。

**S1 验证（全部实跑）**：`node scripts/verify.mjs` **27 门禁全绿**；`pnpm test` **54/54**；
**L1 真挂载 `DSH_SMOKE_REAL=1 node scripts/preset-smoke.mjs` ALL PASS**（preset 头注改动触发该面——
四角色 roster + 逐个 session/create + skills 硬隔离全绿）；`bash -n dev/vendor-build.sh` 通过；
根 AGENTS.md **138/140**（净 −1，余量 +2）。

### S2 前置 · 自指事实归属表（深扫产出，S2 据此收敛）

一个事实一个家；下表"唯一 owner"列即 S2 的执行目标，其余位置一律改链接或删除（**不复制**）。

| 自指事实 | 现有多家 | 唯一 owner（S2 目标） |
|---|---|---|
| vendor pin（tag + commit） | 14 处（AGENTS ×2 · design/10 ×2 · discipline-map ×2 · evaluation · pack README ×2 · pack package.json · presets.test · release-smoke · verify · notes/README；其中 env.sh、design/10:60、alignment-ledger、roadmap 曾错） | `.gitmodules` + submodule HEAD + pack 兼容矩阵（`vendor-pin` 门禁已把守其一）；散文只链接 |
| 门禁数 / tests 数 | AGENTS:126 · design/10:87 · discipline-map:124 · 00-index:28 · notes/README:20 · roadmap:32 | `verify.mjs` gates 数组 ↔ [evaluation.md](../../docs/evaluation.md) §L0 表（`gate-ledger-sync` 对账）；**散文不写计数** |
| 真模型档成员 | AGENTS §密钥（对，4 个）· guides/60:91（2 个）· discipline-map ×3 + scripts/AGENTS（3 个） | AGENTS.md §密钥；其余链接 |
| L0 测试命令写法 | `--import tsx/esm` 形（AGENTS 命令表 · package.json · pre-commit）vs 裸形（guides/60 ×2 · evaluation · tests/AGENTS · discipline-map · 四个 skills 之一） | `package.json` 的 `test` script；全仓一律写 `pnpm test` |
| workspaceFiles 接通状态 | 代码 + client-load-smoke + bundle-face-wiring Note（= 已接通）vs roadmap 历史块 + observability-completion Note（= 未接通） | [bundle-face-wiring Note](../implemented/2026-09-26-bundle-face-wiring.md) |
| client-load-smoke 断言数 | AGENTS:73 · evaluation:26 · 脚本头注（"三断言"）vs 脚本实体（13+） | 脚本自身；**散文不写断言数** |
| pack 形态（D7 vs D18） | 00-index D18 + pack AGENTS/README（= 配置为主 + 单点 client 面）vs guides/62:19 + discipline-map 图例/形态表 + alignment-ledger na 理由 | 00-index D18 + pack AGENTS/README |
| preset 载体文件名 | design/10:51 · discipline-map:97（`agent.cordis.yml`）vs 盘上 + pack README（`presets/<role>.patch.yml`） | 盘上 + pack README |
| client 面注册证据 | discipline-map:25（"四处 effect / 工具卡全部经 effect"）vs `src/client/index.ts`（3 effect + 1 裸 inject） | 源文件自身 |
| 外部研究材料表形状 | 00-index 表头 3 列 vs 数据行 4 格 | 00-index 表头 |
