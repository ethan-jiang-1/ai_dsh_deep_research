# RFC：M2 铺垫 P1——run 启动通道与操作指南

> 状态：implemented

归宿：roadmap 队列行已销账（▶ 移交「M2 铺垫 P2」）；定案登记 00-index **D16**。依据：market 粗扫 §2/§4（agent-team-profile 候选基础）+ release-smoke 实证配方（pack → web 模板 profile → `plugin add file:`）+ design/10 §3（通道选型）+ m2-run-dashboard RFC L0（观察面）+ m2-run-mechanics RFC（HITL 两点流程出处）。以下正文为 proposed 原貌（定案依据），毕业记录在文末。

## 问题

M2 的完成定义 = 一次完整 run（L4 全量四判据），但 **run 的启动通道不存在**：

- M1 验证的都是验证通道：preset-smoke 源码域（web 出厂 profile + overlay 指向本仓
  presets 源码，迭代工具）、release-smoke 一次性干净 profile（先删后建，用完即弃）
  ——没有文档化、可反复使用的真入口 run 通道；
- 用户开 run 的操作面（开哪个会话 / 说什么 / HITL 两点会看到什么 / 往哪看）没有
  一页说明——事前设计定死，不在 run 中途发明（run-dashboard RFC 同款原则）。

## 现状盘点（2026-09-24 亲查）

- `dev/harness-home/profiles/research/` **已是安装域形状**（bundles = base + web-app +
  dsh-deep-research-pack，冒烟轮顺手所建）——通道的骨架已在，缺的是"转正"：文档化、
  幂等重建、开跑入口；
- `release-check` = release-smoke 的一次性验证 profile（同形状，每次重建）；
  `web` = 出厂 profile（源码域 overlay 的宿主）——三者不混用。

## 方案

### 1. run 通道 = 转正 research profile（安装域，真入口路径）

- **转正而非新建**：research profile 从"冒烟副产品"变成文档化的常设 run 通道
  （名字语义对、形状对、凭据走 home 级已配）；
- 开跑就绪脚本 **`dev/boot-run.sh`（幂等）**：source dev/env.sh → 校验 profile 组合
  在位（roster 四角色 + presets；缺则 pack → `plugin add file:` 补装）→
  `dsh web --profile research -- --port 3081 --no-open` → 打印入口步骤（与操作指南
  同源一句话版）；
- keyless：安装与 boot 零模型调用（release-smoke 已实证整条通道）。

### 2. 核心决策：agent-team-profile 复用 vs 自组（请用户定案）

实物对照（vendor patch + 本仓 bundle/presets 亲读）：

| | vendor agent-team-profile 层 | 本仓自组现状（bundle 团队三行） |
|---|---|---|
| team 行 | 带实战配置 insert（maxMembers 8 / freshProvider: spawn / forkProvider: fork…） | 裸 insert（零 config，默认值） |
| D18 边界 | **机械禁令**：禁用全局 continuable-child control（tool-subagent-control / -list-agents）+ 强制 one-shot（tool-subagent / -fork） | 纪律文本扛（"续驶语义归 team"）；lead/scout/analyst 三 preset 行 backgroundMode: continuable，D18 复现风险留到 run 中降级 |
| ui-agent-team | 无 | 有（观察面必需，任何方案都保留） |

- **A（推荐）复用 vendor 层**：profile 组合 = web 模板 + agent-team-profile + 本包；
  本包 bundle 撤 agent-team / tool-agent-team 两行（防同行 id 双 insert），留
  roster / present / ui-agent-team。收益 = 不发明 + D18 组合层机械拆雷 + 团队机制
  组合归 vendor（同 tag 钉住）；代价 = experimental 层依赖（本已依赖 experimental
  agent-team 包）+ 叠加语义实测 + 本包行变更触发 L1/L2 重验。
- **B 保持自组**：三行不动。收益 = 组合面最小；代价 = D18 靠纪律文本 + P2 预检兜底，
  team 行 config 用默认值。
- **A 的实测关卡（keyless 半边在本条目内做）**：vendor 层把 tool-subagent 替换为
  one-shot，而本仓三 preset 行声明 continuable——preset 行 × profile 层替换谁赢，
  组合 dump 可 keyless 判定；行为半边（真会话实际模式 + D18 复现与否）归 P2 真模型
  档预检。**若叠加实测翻车 → 回退 B + 抄 vendor 配置值进本仓行（语义自组），
  登记双家风险。**

### 3. 操作指南一页（docs/guides/61-run-playbook.md，编号顺 60）

四件内容，全部有出处零发明：

1. **开哪个会话**：web GUI（research profile，boot 脚本起的 3081）→ lead 会话
   （roster default: lead，cwd = research-workspace/——run-mechanics §方案 1 约定；
   web 会话 cwd 设置面实施时核实，P2 真开会话时定稿）；
2. **说什么**：提出研究问题——research-brief skill 接住走 HITL1 三问（研究类型 /
   深度篇幅 / 时间口径，每问带推荐）；
3. **HITL 两点各会看到什么**：HITL1 三问 + 拍板；HITL2 审阅建议（证据充分性 +
   交付/补研究推荐 + composition 确认）——出处 m2-run-mechanics RFC 流程图
   （该 RFC 打磨定稿后同步对齐）；
4. **观察面看哪里（L0 三处）**：各角色会话实时流 / ui-agent-team 任务板 /
   deliverables 面板——出处 m2-run-dashboard RFC L0。

## 输掉的方案

- **源码域 overlay 当 run 通道**：迭代工具 ≠ 产品路径（真入口路径纪律：pack →
  干净 profile → plugin add → 真会话）；
- **复用 release-check 当通道**：验证形状（每次先删后建），非常设；
- **新建 research-run profile**：research 形状与语义已对，新建只添 profile 冢
  （若用户嫌"冒烟副产品"出身不洁再议，见开放问题 2）；
- **A' 借语义自组（抄配置进本仓行但不装层）**：团队组合语义双家（vendor 演进 vs
  本仓行漂移）——仅作 A 翻车时的回退线，不作首选；
- **自建 boot 编排（守护进程/compose）**：一个幂等 bash 脚本够用（不发明）。

## 验收判据

- 幂等开跑（keyless 实跑）：删 research profile 重建 → `dev/boot-run.sh` 一键到位
  （组合校验 + web 起 + 步骤打印）；重复执行不坏、不重复安装；
- 组合断言：profile 会话 roster 列出四研究角色（安装域通道：preset-smoke
  `--profile research --no-patch`）；
- （若 A）叠加语义 keyless 判定落 Note（组合 dump：tool-subagent 生效模式 = profile
  层 one-shot vs preset 行 continuable 谁赢）+ 本包行变更后 L1 安装域 + L2 重跑绿；
- 操作指南一页：四件内容全带出处链接；HITL 描述与 m2-run-mechanics RFC 核对一致；
- 收尾：本 RFC 毕业 implemented/ + 队列行删除 + A/B 定案登记 00-index（若 A：bundle
  行变更并 D3 载体行或新 D 号——实施时定）。

## 开放问题（请用户定）

1. **A / B 定案**（推荐 A，理由见 §2）；
2. research profile 转正 vs 新建（推荐转正；反方理由 = 它是冒烟副产品出身，无文档
   血统——若在意可新建并删旧）；
3. 操作指南位置：默认 docs/guides/61-run-playbook.md（研究发起人的用户侧入口，
   编号顺 dev-loop 60）；
4. boot 脚本预留仪表盘开关吗：仪表盘是 m2-run-dashboard 第 ③ 件未落地，先只 boot +
   打印；落地后加 `--dashboard`（其 RFC 开放问题 2 已挂此钩子）。

## 毕业记录（2026-09-24，A 定案执行）

用户批准实施计划 = **A 定案**（复用 vendor agent-team-profile 层）。开放问题按默认落地：
research profile 转正；指南 = guides/61；暂无仪表盘开关。

**Phase 0 可行性**（scratch profile `p1-scratch`，全 keyless）：

- `file:<vendor 目录>` 直装失败：`workspace:^` 协议出工作区不可解析
  （ERR_PNPM_WORKSPACE_PKG_NOT_FOUND）——fail-loud 如预期；
- `pnpm pack` 把 workspace:^ 改写为 ^0.1.5-rc.2；**registry 本会话可达且有 0.1.5-rc.2**
  （market 报告"沙箱挡 registry"是上一会话的条件，非恒定）；
- 官方装法成立：`plugin add @deepseek-ai/dsh-experimental-agent-team-profile@0.1.5-rc.2`
  → reconcile 进 bundles；组合断言全中（tool-subagent-control / -list-agents disabled、
  agent-team 带 maxMembers 8 等实战 config、tool-subagent 替换为 one-shot）；组合 patch
  读自**锚**（vendor 树本体——resolveBundleDir 锚优先契约；profile 本地副本仅入场用）；
- **双 insert 实证**：本包与层同行 id = 重复行（无 fail-loud 无合并）——撤行必要性实证；
- `tool-subagent disabled: true` 是 web 模板基线（init 对照），非层所为。

**Phase 1 撤行**：bundle 撤 agent-team / tool-agent-team（注释注明归层）；overlay 镜像
同步（源码域 boot 无团队面，preset 迭代不需要）；两个团队 peer 下岗；tests 断言红证
（`insert 行缺失: agent-team`）→ 新形状 + 新守卫"团队行禁入 bundle"，反证 = 注回违规行
被守卫 + row-deps 双测试咬红 → 还原绿。

**Phase 2 通道与叠加判定**：

- `dev/boot-run.sh`：删 profile 从头重建全绿（web 模板 → .npmrc 钉 repo → pack →
  plugin add ×2 → 组合校验）；幂等复跑跳过安装 + web 横幅（3081 + token）确认；
- **叠加判定（差分实验，keyless）**：scout preset 临时改 bogus backgroundMode →
  session/create 炸在 `expected "one-shot" | "continuable" but got "bogus-differential-probe"`
  ——报错持有 **preset 行的值** = preset 行覆盖 profile 行。处置 = 三 preset 改声明
  one-shot（D18 对齐；D3 台账原文"单点快捷查证走 one-shot subagent"——preset 旧
  continuable 声明实为与 D3 的潜在漂移，本轮顺带修复）；
- L1 双通道全绿（源码域含 overlay 改动；安装域 research = pack + 层）；L2 release-smoke
  ALL PASS（pack 孤立形状——组合通道的验收归 boot-run + research profile，两面各司其职）。

**顺带修的真 bug**：env.sh 两处 `$VAR（全角标点` 写法（nounset 下 bash 把全角字符当变量
名一部分——boot-run 的 set -u 首曝第 40 行，扫描又抓出第 33 行错误分支同款）；boot-run.sh
采用"先 source 再 strict"防御序。

**Phase 3 指南与入口链**：docs/guides/61-run-playbook.md（研究发起人入口：boot/会话/
HITL 两点/观察面/中断恢复/完成判据，全带出处）；AGENTS 布局两行、00-index 地图 + D16 +
术语映射、60 §3 run 通道行、README dev 行同步。

**给 run-mechanics RFC 打磨的钩子**：其 Q2 验收措辞"成员的 tool-subagent
（backgroundMode: continuable）是否可用"应随 one-shot 定案同步——成员 preset 已 one-shot
（D16），P2 与 run 验证的 = one-shot worker 在 team 语境的真实可用性 + spawn_teammate
组合行为。

**实际跑过的验证**：`verify` 9 门禁全绿；`node --test` 10 pass；preset-smoke 源码域 ALL
PASS（12 会话断言）+ 安装域（research）ALL PASS ×2（撤行后 continuable 包、one-shot
对齐后包各一次）；release-smoke ALL PASS；boot-run 重建 + 幂等两档实测；差分实验红证在案；
fresh-agent 入口链探针（改动面含入口链 → 必跑）：**6/6 PASS、零盲找零脱链、14 文件**——
run 通道启动与档位 / 团队行归属与版本钉法 / one-shot 值与定案证据链 / ▶ 指针（已移交
P2）/ L2 分工 / 发起研究入口；链健康度：D16 台账、patch、三 preset、毕业 Note 四处口径
一致，无自相矛盾。

**环境状态**：registry 本会话可达（层经 registry 钉版本安装；不可达环境的回退线 = 锚挂载
manual bundles 登记，未启用）；scratch profile p1-scratch 已清理；research profile = 正式
run 通道组合；boot web 验收后已停。

<!-- grandfather: note-format 门禁生效（2026-09-24）前的遗留形态——内容有效不追改，新篇一律按 guides/60 §4 骨架 -->
