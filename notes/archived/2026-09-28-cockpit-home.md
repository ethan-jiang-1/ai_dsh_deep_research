# cockpit-home：驾驶舱当前事实单一正本（design/40）+ 入口重定向 + 历史清场——已交付

> 状态：implemented
> 归档：2026-10-24

归宿：roadmap §队列「cockpit-home」（2026-09-28 用户取题并当日交付，已离队）。

## 问题

用户定调（2026-09-28）："Agent first——他一进来就快速能找到，那我们就做对了；历史上的演变
我压根儿不在乎。"立项前的反面实证（同 session 消化复盘）：回答"驾驶舱怎么回事"需穿约
10 份文档拼图。根因三条：驾驶舱（全仓唯一自写代码，D18 单点例外）在 design/ 没有自己的页；
中间层是指针链不是摘要链（D18 → cockpit-naming → observability-gui → 琢磨稿，每层不承载
内容，"每层可停"不成立）；"现在为真"散在 pack README / guides/60/62 / 代码头注四处。

## 决定

三步同 diff 交付（全部循现有机制——docs 只写 now、一个事实一个家、notes 已有 archived
生命周期——补课而非改弦更张）：

1. **`docs/design/40-research-cockpit.md` = 驾驶舱当前事实的单一正本**：定位与命名分层表
   （从 cockpit-naming 上移，正本身份转移）/ 构成表（件 + 折算 → 文件 → 职责 → 指针）/
   数据通道与接线 / 分层纪律 / 验证面与改动路由 / 已知边界 / 历史指针节。**只写形状、
   不写细节**——细节正本 = 代码头注 + pack README（驾驶舱是最频改层，钉在形状层防腐烂）；
2. **全入口一跳重定向**（10 处）：00-index（文档地图新行 + D18 行瘦身只留决定 + 术语映射
   行 + §外部研究材料行）、design/10 布局行（含 `design/10-30` → `10-40` 两个散文提法）、
   guides/60 路由行、guides/61 根因链路径、guides/62 参与方表、根 AGENTS 布局行（预算内
   加路径）、pack AGENTS、pack README（首段 + 构成表）、`src/client/index.ts` 入口头注
   （前门身份）；entry-chain 门禁 members 清单同步（它自称入口链存在性投影）；
3. **演进链 Note 归档**（按 archived/README 进门三条件逐篇判定，不为凑数）：

| Note | 进门判定（完整交付 / 不再指导未来变更 / 值得保留） |
|---|---|
| ui-observability-surfaces（琢磨稿） | 选项推敲全部落地 ✓；负知识现行承载 = guides/62 + 代码头注 + client-keys 门禁 ✓；推敲史值得保留 ✓ |
| bundle-face-wiring | 根因链四条全部修复 ✓；现行结论已进 guides/61 §1 + README 已知限制 ✓；排查史保留 ✓ |
| right-pane-ux-debt | 两条欠账当日闭环 ✓；决定（会话绑定纪律 / 显性化行为）上移 design/40 §4 ✓；输掉的方案（左侧固定 panel / corner 槽遮蔽 / 自动 dock）保留 ✓ |
| cockpit-naming | 定名并钉面完成 ✓；命名分层表上移 design/40 §1（正本身份转移）✓；输掉的备选（研究面板 / 观察台 / 目录改名）保留防再讼 ✓ |

留活跃：**observability-gui**——进门条件 2 明文豁免（client-keys 红证证据链 +
evaluation.md §L0 台账引用者一律留活跃）。冻结纪律零违反（四篇仅加 `> 归档：2026-09-28`
行）；搬移产生的出链相对路径重定向在归档边界条款内（archived 五篇 + signal-to-noise ×2 +
client-load-smoke 注释 + guides/61 + 00-index 两行）。

**代码注释最小改动原则**：只动 `src/client/index.ts` 头注；其余代码/测试/脚本注释里的
RFC 名字引用（"RFC right-pane-ux-debt"等）保留——名字语义仍真，循名可检索到 archived。

## 输掉的方案

- 全貌进 pack README、不建新页：README 是随包发布的安装合同，不是仓内设计正本——拒；
- 扩 design/10 而非新页：全仓架构页与子系统页层级错位——拒；
- 写一篇"总览 Note"：Note = 时间维度，当前事实的家在 docs（分层铁律）——拒；
- observability-gui 一并归档：进门条件明文豁免（红证 + 台账引用）——不为凑数，拒；
- 演进链 Note 直接删：archived 是冻结不是垃圾桶，负知识保留防线——拒；
- entry-chain-probe 加驾驶舱一问：真模型档成本 + 探针语义面变更超范围——拒（触达判据由
  验收 2 的人工核对承担）。

## 实际跑过的验证（2026-09-28，全部实跑）

| 面 | 命令 | 结果 |
|---|---|---|
| L0 机械 | `pnpm verify` | 全绿 ×2（归档后 + verify.mjs members 改后各一次；md-links/md-anchors/note-status/note-format/doc-budgets/entry-chain/client-keys 咬断链与归档形态零红） |
| L0 回归 | `pnpm test` | 83/83 |
| 观察面 | pack `pnpm build` + `client-load-smoke`（keyless 真浏览器） | ALL PASS（渐进面与磁盘真值对账：证据 60 = 磁盘 60 · 已交付 · 问题行逐字；未绑定负样本双断言；噪音零残留） |
| 入口链 | `entry-chain-probe`（真模型档） | ALL PASS（真值抽取 ▶ 当前 = cockpit-home；Q1 bigram 11/11；留档 smoke-workspace） |
| 触达 | 三入口人工核对 | 根 AGENTS 布局行 / 00-index 术语映射行 / 00-index D18 行各 ≤1 跳到 design/40；单页六问（是什么/构成/通道/怎么改/验证/边界）全覆盖 |
| 链路清扫 | grep 四篇旧路径 | 活区零残留（NO-STALE-REFS） |

## 环境状态

- 今后"驾驶舱"的当前事实查 [design/40](../../docs/design/40-research-cockpit.md)——入口：
  根 AGENTS 布局行 / 00-index（文档地图 · D18 · 术语映射）/ guides 60/62 / pack README
  与 AGENTS / 代码前门头注，全部一跳直达；改驾驶舱仍走 guides/60 §2 路由（design/40 只写
  形状，细节归代码头注）；
- observability-gui Note 留活跃——动 client-keys 门禁时翻它（红证出处）；
- 演进链四篇在 notes/archived/ 冻结（正文永不改；复活 = 写新 Note 引用快照）。
