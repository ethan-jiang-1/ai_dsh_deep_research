# 马拉松复盘：静默自主长程（队列条目 1→3，2026-09-25）

> 状态：implemented

归宿：goal「静默自主长程马拉松（8 小时预算）」复盘记录；三个队列条目各自毕业 Note 在案
（[vendor-build-guard](2026-09-25-vendor-build-guard.md) · [team-preflight-marker](2026-09-25-team-preflight-marker.md) ·
[observability-gui](2026-09-24-observability-gui.md)）——本 Note 只做马拉松级汇总，不复述细节。

## 决定

8 小时静默自主（无用户在场）按 roadmap 既定次序执行队列条目 1→3（4/5 需用户触发，搁置池
不动）。**三件全部毕业**，全程每阶段 pre-commit 绿、步步为营提交（共 12 个提交，含一次被
自家门禁 client-keys 拦下后修正再提——门禁咬作者 = 设计起效）。

## 交付与证据总表

| 条目 | 交付 | 关键证据 |
|---|---|---|
| 1 vendor 构建产物自检 | 共享自检模块 + 五 boot 入口接线 + 静态夹具测试 | 三层红证（CLI/boot-run ⓪ 早退不碰在跑 web/preset-smoke exit 2）；28 tests |
| 2 team-preflight 末标记加固 | 判据改锚（机制断言集不变，标记降为观察点） | 三连跑 ALL PASS——恰好复现历史 2/3 缺席率（两次缺席即旧判据之红） |
| 3 观察面 GUI 化 | D18 + 双半构建链 + journal 流页签 + 活标题/HITL 折算 + 两个冒烟 | client-load-smoke 7/7（331 事件真数据）；盘侧真模型 ask 挂起实证；收尾六面全绿 |

## 附带大修（条目 3 途中抓到的真回归）

升 pin 遗留的 **Web UI 浏览器面全坏**（服务端/RPC 全绿所以从未暴露）：205 个包 host 半
缺失 → clientBundle 纯折依赖静默外置 → "missed the module table"；前端壳 stale →
平台种子导出对不上。修复 = host 半批量补建（205/205 零失败）+ 前端壳重建 + vendor-build.sh
固化 ⑦⑧ 两步。**首次真浏览器加载即抓到**——这正是 client-load-smoke 存在的意义
（company postmortem 0003 教训的直接回报）。

## 本轮实证的机制事实（记档防复犯）

- 0.1.7 服务注入**两级都要声明**（remote + remote.session——只声明一侧各炸一种错）；
- `PropsRuntime` 的 SessionStandardProps 基层为空，成员由 ui-session 类型增强合并（漏 import
  则 props.sessionId 不存在）；
- composite 工程（tsc -b）要求 import 的文件显式列进 include（TS6307）；
- keyed 槽类型位字面量（PropsRuntime<泛型参数>）编译期可查——与值位静默失效面分治（门禁收窄）；
- 会话日志 v4 = **多帧 zstd**：node:zlib 只解第一帧，zstd CLI 全帧解为准；
- session/prompt 的 requestId 非 UUID 会被静默丢弃（accepted 但永不处理）；
- 0.1.7 UI：测试须知模态的全屏 _mask_ 盖住一切控件（先点 Continue）；New tab 控件在折叠列
  内永远 hidden——guide 胶囊才是开页签正路；侧栏列表懒刷新且 RPC 会话不进当前工作区列表。

## 真模型花销

team-preflight ×4（加固前三跑 + 收尾一跑）、l4-lite ×2（判别回归一跑 + 收尾一跑）、
client-hitl-smoke ≈8 会话（真模型 prompt + followup 造挂起态）——合计 ≈14 个模型回合，
均 L4-lite 档量级（单条消息级），无整场研究 run 开销。

## 残留风险与未完成（如实）

- 观察面 **步骤条/矩阵/review** 未做（时间盒边界：活标题 + journal 流优先——用户点名需求
  与数据通道证明；复活路径与范本在毕业 Note 记档）；
- **浏览器端到端活标题翻转**为观察点（三证在案：fold 单测 + 盘侧真挂起 + 页签挂载；受会话
  列表工作区归组的自动化定位阻隔）——▶ 条目「研究类型覆盖」真人 run 时目验收口；
- C 工具卡（stretch）未做（设计上随 B 议，未触发）；
- 搁置池五条原样未动（各复活条件现状在 roadmap 表内）。

## 输掉的方案（马拉松级）

- **先跑 GUI 再修浏览器回归**：否决——回归是主线可用性问题，当场修（client-load-smoke
  首跑即暴露正是顺序正确的回报）；
- **为翻活标题硬自动化 composer**：否决——被编辑器实现挡住（非产品缺陷），降级为观察点
  + 真人 run 目验（RFC 降级条款如实记录）；
- **跳过夹具直接测真实树**：否决——L0 不得依赖构建状态（新 clone/CI 未构建时测试须仍绿）。
