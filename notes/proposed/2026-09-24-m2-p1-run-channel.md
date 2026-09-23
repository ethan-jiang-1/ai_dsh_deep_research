# RFC：M2 铺垫 P1——run 启动通道与操作指南

> 状态：**proposed（待用户打磨）** · 2026-09-24 · 归宿：roadmap ▶「M2 铺垫 P1」
> 依据：market 粗扫 §2/§4（agent-team-profile 候选基础）+ release-smoke 实证配方
> （pack → web 模板 profile → `plugin add file:`）+ design/10 §3（通道选型）+
> m2-run-dashboard RFC L0（观察面）+ m2-run-mechanics RFC（HITL 两点流程出处）。

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
