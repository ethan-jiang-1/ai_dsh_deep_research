# RFC：keyless 录制快照面（输出快照级回归）

> 状态：proposed

归宿：roadmap §搁置池「keyless 录制快照面」（升级注记：0.1.7 的 `retired-tools` 钉法
**降低了复活成本**——见升 pin 重审命中 ④）。

## 问题

模型/用户可见输出（persona 效果、工具卡形态、交付文本样式）目前靠真挂载冒烟（L1/L2）
+ 真模型档（L4-lite）取证——**成本高且无快照级 keyless 回归**：改了 persona 或渲染层，
无法秒级知道"输出形态变了"。

## 方案（草图，复活后细化）

vendor 路线 = `dsh-session-snapshot`（session 回放 fixture）+ llm-replay；0.1.7 起
`snapshots/AGENTS.md` 支持 **`retired-tools` 独立钉法**（退役工具录制可与迁移覆盖无关
地钉住，含当前 format 版本）——意味着可以只钉"研究工具面"这一窄带做 keyless 回放，
不必整代快照。E1 教训仍有效：这两个包**只能作为 devDependency 解析物存在**，
绝不能进 runtime 依赖（E1 事故根源，已核销）。

## 输掉的方案

- **E1 时随解析依赖引入**：已否决——正是 E1 事故本身（`cannot resolve active package`）；
- **整代 session 快照**：押后——`retired-tools` 窄带钉法出现前成本过高。

## 验收（= 复活条件现状）

- 复活条件：需要「输出快照」级 keyless 回归时（**✗ 未到——但已接近重估点**：2026-09-27
  单日内对模型可见文本（persona/skill）改动 6+ 次，每次均以 L4-lite 真模型档验证（实测成本
  ~2-3 分钟/次 + token）。若该节奏常态化，快照面回本——下次同类改动日即触发重估）；
- 复活后验收：一条录制 → 回放 keyless 绿 + 注入输出差异 → 红（红证）+ 依赖面零污染
  （vendor-links 绿）。
