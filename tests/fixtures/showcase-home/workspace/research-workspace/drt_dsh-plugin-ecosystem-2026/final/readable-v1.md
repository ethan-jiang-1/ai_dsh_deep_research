# DSH 插件化垂直研究工作台评估（读者版 v1）

> 核心结论：在不修改宿主内核的前提下，DSH 的声明式插件组合 + Host `sessionProjections` + 独立 Critic 核查架构，足以长出前台极简、后台可审计的深度研究工作台。

## 一句话结论

通过 **白名单裁剪 + Host 增量投影 + 全屏三栏溯源 + 独立 Critic 核查** 四条主轴，外部插件包既能隐藏通用编程壳噪音、把报告复核往返次数降低约 70%，又能完整保留 DSH 原生扩展点纪律与生态可组合性 [来源: evidence/e1-cordis-plugin-seam.md] [来源: evidence/e4-eval-latency-quant.md]。

## 核心机制速览

| 维度 | 推荐原生做法 | 规避的反模式 | 关键依据 |
|---|---|---|---|
| 出厂面裁剪 | `cordis.patch.yml` 声明 `disabled: true` 白名单 | 全局 `:has(...)` CSS 压盖宿主输入框 | [来源: evidence/e1-cordis-plugin-seam.md] [来源: evidence/e3-adversarial-dom-hacks.md] |
| 跨会话态势 | Host `sessionProjections` 单源增量折叠 | 侧栏按行并发开 `remote.session.follow` | [来源: evidence/e2-session-projection-wire.md] |
| 报告可信度 | 独立 Critic 拆分 `claims.json × verdicts.json` | 同上下文自写自审、缺失核查静默跳过 | [来源: evidence/e5-composability-profile.md] |
| 精读体验 | `sidebar.fullscreen` 三栏 + 150ms 悬停证据卡 | 反复切换标签页手工对照原文 | [来源: evidence/e4-eval-latency-quant.md] |

## 为什么「前台极简」与「原教旨示范」不冲突

### 1. 面向研究用户：去工程噪音、直达判断

研究用户在首屏只看到意图卡片与轻量选配，不需要理解底层插件拓扑；在左栏一眼识别「待拍板」与「已交付」会话；打开全屏终稿时，左侧自动常驻章节目录，鼠标悬停任意 `[来源: ...]` 150ms 即可核验质量等级与摘录，右侧同步对照证据卡或 Critic 核查清单 [来源: evidence/e2-session-projection-wire.md] [来源: evidence/e4-eval-latency-quant.md]。

### 2. 面向架构与插件开发者：零 hack 参考实现

打开源码即可对照每一条界面交互背后的 DSH 原生 Seam：品牌与 Hero 选项槽、Host `sessionProjections`、Composer `/` 命令弹窗与 `@` 证据胶囊、全局快捷键以及零外置依赖的 profile 层插件叠加范式 [来源: evidence/e1-cordis-plugin-seam.md] [来源: evidence/e5-composability-profile.md]。

## 诚实边界与未覆盖项

- **大规模证据内存上限（C5 部分支持）**：常规研究规模下并行扫描与有界预览缓存表现优异，但超百张证据卡工作区的长期内存开销仍待专项基准实测 [来源: evidence/e4-eval-latency-quant.md]。
- **第三方定时追踪组合（C6 待核查）**：在 profile 层叠加 `schedule-bundle` 的机制设计成立，但跨时区周期调度的长期稳定性尚未完成端到端压测 [来源: evidence/e1-cordis-plugin-seam.md]。

## 下一版优先项

- 补充超百张证据卡工作区在浏览器端的内存与加载延迟实测基准，收口 C5 边界
- 在真实 profile 中验证叠加 `schedule-bundle` 执行跨时区周期研究追踪的稳定性，核实 C6
- 对比 `workflow-ptc` 批量扇出与纯 Agent Teams 对话协作在中大型课题上的 Token 成本曲线
