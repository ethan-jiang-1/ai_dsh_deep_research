# Note：harness / run bundle 分离（D17）——"题目出 RFC"的分层纠偏与 drt_ 目录契约

> 状态：implemented

> 2026-09-24 · 用户 steer（非队列条目，先例 d5a9113）· 互链：加固探针 Note 遗留 1（本 Note
> 销账）· 正本落点：design/10 §1 第一性分层 + 00-index D17 / 术语映射 + 研究手册 §分层铁律
> + 手册 §目录约定（drt_ 契约）

## 决定

1. **`研究报告 = harness(bundle)`**——harness（pack + 手册 + templates + docs/notes）只读、
   零 per-run 状态、run 期间零写入；演进只走开发环、只由 run 复盘证据驱动；harness 内
   可变值 = per-version 常量（随版本走，不随 run 走）。
2. **run bundle = `research-workspace/drt_<slug>/`**（drt = Deep Research Topic，目录名即
   方向；顶层无 runs/）：一调研一 bundle，持全部变量（判定式：**恢复这次研究所需 =
   bundle 变量**；会话/任务板/聊天记忆 = 执行基底，不是变量）；question.md（定稿/HITL1
   快照/Decisions append-only）跨 rerun 持久；final/ 版本化交付（v1 → 证据扩张 rerun 后
   v2，当前版 = 最大号，present 指当前版）；交付副本不可变，bundle 本身可显式 rerun/续跑——
   交付不是冻结（D28）。
3. **rerun 三分语义**（源头 DEEP_RESEARCH_HARNESS post-final-recovery 对齐，亲读
   instantiate/continue/post-final playbook + rb_templates 实物）：表述性修订 → 当前版
   原位改、版本号不变；证据扩张 → 同 bundle final/ 下一版 + Decisions/journal 追加血统；
   结构性另起 → 新 bundle（立项 sibling 预检：同名/前缀相关已在 → 问用户）。
4. **框架文档去题目化**：题目 = bundle 第一个变量（kickoff/HITL1 给定，落 question.md），
   RFC/roadmap/design/台账不出现具体题目——m2-run-mechanics 已去实例化（开放问题 4 改
   分层原则句、暂停点记录只留机制配方）。

**不搬**（源头有、本仓弃）：Engine/rb_status/rb_queue/rb_trace CLI 机制（D4 弃 CLI 引擎，
journal.md + 会话日志承担血统）；per-bundle BUNDLE_ENTRY/BUNDLE_MAP（十件套固定契约 +
手册 agent-instructions 注入使 per-bundle 地图冗余）；dpt_archived 归档区（bundle 本就不进
git，暂无归档需求）。

## 输掉的方案

- **往 RFC 加"换题注记"销加固探针遗留 1**（本修正的原计划）：否——题目决策与换题记录都
  是实例层记账，写进框架文档 = 分层错误上加错误；正解 = 删题目，不是注记题目。
- **runs/<slug>/ 顶层目录**（原契约）：否——"runs" 一词把"方向"与"一次执行"混写；同一
  调研会 rerun，slug 是方向不是 run。
- **方向容器 + 内部 run-NNN 多 bundle 两层结构**（用户初拍板后经源头比对自行推翻）：否——
  把同一次研究的证据血统拆散到多个目录；源头概念更优：bundle 本身就是方向身份，rerun 是
  bundle 内版本史，方向层/执行层的抽象纯属多余。
- **bundle 粒度 = 方向且 rerun 开新目录（<slug>-v2）**（原 plan-shape 语义）：否——v2 目录
  使 final/evidence 的版本对比跨目录；同 bundle final/ 版本化 + immutable 历史更干净
  （plan-shape 原行已加 D17 修订注记）。
- **术语 "run pack" / 裸 "bundle"**：否——pack 与 deep-research-pack 撞车；裸 bundle 与
  DSH"bundle 行"（cordis.patch.yml 配置行）撞车。定名 run bundle，两词连用禁缩写，
  消歧规则进术语映射。

## 实际跑过的验证

- `node scripts/verify.mjs`：13 门禁全绿（workspace-contract 契约改动：runs/ 静态目录检查
  移除——门禁登记表同 diff 更新；无新门禁，无新反证义务）。
- `node --test tests/*.test.mjs`：20 tests 全绿（run-dashboard fixture 直传 runDir 路径，
  不经 latestRunDir，扫描根改动无测试面影响）。evaluation-contract 的 owner 表锚随契约
  更新（final.md → final/（当前版））：锚先行撞新契约红一次（反证在案）→ 改锚 → 绿。
- 全仓残留扫描：`grep runs/<slug>` tracked 区零命中（plan-shape 的 D17 修订注记有意保留
  旧名作历史；dev/harness-home/AGENTS.md 为 gitignored 运行区副本不属合同——**此判断被
  同日事故推翻，见文末事故节**）。
- 化石镜像反门禁红→绿实证：化石复活 → `FAIL workspace-contract`（精确点名）；删除 →
  全绿。20 tests 全绿。
- pack-contract-sync 门禁（D17 事故 2 新增）：真实红（7 文件 13 处 runs/ 逐文件点名）→
  同 commit 修复 → 绿；终态 14 门禁 + 20 tests 全绿。

## 环境状态

- run 通道已重启：web 3081 + 仪表盘（--root research-workspace 扫描 drt_*/）；CPU 题面已
  kickoff（session-d29822ed），HITL1 三问挂起待用户答——lead 会话创建于 persona 修复前，
  但其推理已显式"AGENTS.md supersedes"按 drt_ 行动（会话日志实证：glob drt_*/**）；
- research profile 安装镜像已手术同步 D17 文本（7 文件；web 运行中不能重建，sanctioned
  刷新 = rm profile + boot-run 重建）；release-check 镜像为 L2 throwaway（release-smoke
  每次先删后建，自愈，不动）；boot-run 的 pack 内容漂移检测现已接线（当时为已知债，已销账）。
- 手册 final/ 版本化契约生效：首个 run 的交付 = final/v1.md + present 声明。

## 事故与补丁（同日，用户实测抓到——"实实验了一下，好像不对"）

**现象**：重启后的 lead 会话收到 CPU 中美差距题面，行为仍走旧契约——glob `runs/**/final.md`、
读 ad-hoc 旧 run 材料、按 runs/<slug> 形状准备立项。

**根因**：本 Note 落库时把 `dev/harness-home/AGENTS.md` 误判为"gitignored 运行区副本不属
合同"，实际它是 DSH 全局注入第二通道（$DSH_HOME/AGENTS.md）——一份史前旧契约化石
（runs/<slug>/、review-critic.md、五件套），随每个会话注入，压过了 cwd projectRoot 通道
注入的新手册。preset 的 agent-instructions 行设计上只走 cwd projectRoot（注入
research-workspace/AGENTS.md；projectRootMarkers: [] 防灌开发仓根 AGENTS.md），全局通道
是多余的第二家，必然漂移。

**修复**：① 删除化石镜像（手册唯一定居点 = research-workspace/AGENTS.md；旧文件内容复核
无独有信息——"交付红线"三条被手册证据契约/口径契约/analyst skill 交叉 ≥2 纪律覆盖）；
② workspace-contract 门禁加存在性反禁（$DSH_HOME/AGENTS.md 在场即红，防复发；红→绿实证
在案）；③ research-workspace/runs/.gitkeep 移除（runs/ 契约退场残留）。

**教训（防复犯）**：gitignored ≠ 非合同——**注入源必须在落库牵连面清单里**；凡被 DSH
注入/消费的运行区文件都是合同的活镜像，改合同必须同步清点它们，否则落库只落在纸面。
落库清单的新检查问句：这个文件被谁读？（不只"谁写它"）。

### 事故 2（同日续，会话日志核查抓到）：pack persona/skill 文本携带旧契约（13 处/7 文件）

**现象**：化石清除后 kickoff 的 CPU 题会话（session-d29822ed）行为正确——lead 推理
"manual says drt_<slug>/，AGENTS.md supersedes"，glob drt_*/**、HITL1 三问挂起待答；但
会话系统提示里的 persona 与 skill 文本仍写 runs/<slug>/——HITL1 拍板后 spawn 的
teammates 会带旧路径开工（scout persona："先读 runs/<slug>/question.md" → 路径不存在）。

**根因（双盲）**：① 首轮残留扫描的路径清单漏了 packages/（pack = harness 主体：persona
经系统提示注入、skill 经加载注入）；② 扫 dev/ 时 `grep -v node_modules` 把 profile 安装
镜像（会话实际读取的副本）一并滤掉。本轮 lead 靠"手册优先"自行化解了矛盾，teammates
无此保障。

**修复**：① 7 文件 13 处改 drt_ 契约（lead/scout/analyst/critic 四 persona +
evidence-extraction/synthesis/adversarial-review 三 skill；final.md → final/ 版本化交付
语义同步）；② 新门禁 pack-contract-sync（pack tracked yml/md 零 runs/）——真实红 7 文件
逐一点名在案 → 修复 → 绿；③ research profile 镜像手术同步 7 文件（HITL1 挂起中 web 不能
重启重建，sanctioned 刷新 = rm profile + boot-run）；④ release-check 镜像 = L2 throwaway
（release-smoke 每次先删后建，自愈，不动）。

**教训追加**：sweep 清单必须覆盖**全部注入通道**——persona（系统提示）/ skill（加载）/
手册（agent-instructions）/ $DSH_HOME 全局，四通道一个不漏；`-v node_modules` 要区分
"别人的依赖"与"自家 pack 的安装镜像"。
