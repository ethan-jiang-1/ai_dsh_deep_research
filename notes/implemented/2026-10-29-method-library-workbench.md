# 方法库工作台 A′：两列共创与受控写入

> 状态：implemented
> 来源：[方法库工作台重排 issue](../../_backlog/_archived/settled_issues/2026-10-29-method-library-workbench-redesign.md)

## 决定

方法库主 tab 采用 A′ 两列：左侧库/搜索，右侧在读态显示条目详情，在新建/编辑态以同一活动草稿显示摘要、访谈和表单检查。摘要在对话上方；表单检查使用自己的滚动区域；窄屏（≤640px）把库折叠为可切换的全宽面板，工作台只隐藏不卸载。摘要字段可直接进入表单并聚焦，内置参考详情可直接作为新方法来源。

新建访谈前必须显式选择来源：从零、某条内置参考，或一条有完成回执（`delivered.json` 或旧式 `acceptance.md`）且 question/最高 `final/vN.md` 内容非空的 run。来源预览有界显示，必需内容必须读到 EOF；缺席、失败、取消和 partial 分别呈现，不靠“最近几条 run”猜。

活动草稿由 `MethodLibraryView` 单一 owner 持有；每个草稿使用独立 Method Editor Session。Client 为草稿维护单调 revision 和 assistant turn/seq 基线：旧 turn、重复 seq、用户中途修改后的迟到候选都被拒绝；`SessionReference.ready` 后还要求 `openState === 'open'`。刷新恢复、跨进程 CAS 和 exactly-once 不在承诺内。

方法库写入只走 Method Editor 的 Host tools：`method_library_upsert`、`method_library_set_default`、`method_library_remove`。Host 绑定 owning Session、durable owner prompt 的 `rpcId`、动作/名称、turn、单个 `callId` 与保存内容的 SHA-256；保存/删除/默认操作都写后 reread。Client 只在匹配的 tool result 与完整分页整库回读后报告 `verified`；超时、断线或目标态不一致锁定为 unknown，不自动重发，刷新只观察当前文件状态。普通保存/编辑/另存为保持默认状态；「保存并设为默认」「设为默认」「清除默认」显式；删除默认可留下零默认；删除不提升其它条目。

读态默认/删除操作使用一次性的 Method Editor 操作上下文。排队操作在 coach ready 后恢复时必须复用同一 draft/coach 上下文，不能把它当成新的读态操作重新建 Session。

## 输掉的方案

- **保留原三栏（库 / 表单 / 方法编辑）**：用户实测拥挤，滚动和对话体验都差；A′ 改为两列加工作台表面。
- **Client Remote 直写 workspace 文件**：绕过模型可见/可审计路径，不符合 D25 的面板写入授权；保留 Host tool。
- **编辑器 checkbox 隐式切换默认**：无法区分普通保存、另存为和显式默认操作；改为独立动作与组合保存。
- **自动取最近三条 run 作为来源**：用户无法确认具体依据；改为显式选择、完成判据与有界预览。
- **跨刷新草稿恢复 / operation journal / 跨进程 exactly-once**：需要新的持久 owner 与 schema，超出本卡承诺；明确不做。
- **把模型 prose 当作保存/删除/默认成功**：改为 tool result + callId + 文件回读核对。

## 实际跑过的验证

- `pnpm test`：全绿（含 method draft、source、operation state、writer、events、commands 与 resume-context 回归）。
- `pnpm verify`：全绿；pack Client/Host 构建通过。
- 真实 Loader 组合 smoke：注册 Method Editor preset 的三个 Host tools，验证 durable owner command、SHA-256 失配拒绝、默认变更、删除与 workspace 回读；首轮 schema 增量已记录。
- 真实浏览器 `client-load-smoke`（显式会话）：A′ 两列、详情/访谈/表单切换、显式来源、内置预览、已完成 run 预览与完成判据、摘要字段聚焦、640/480px 无横向裁切、库/工作台切换、分隔条键盘、`SessionReference.ready/openState` 门控全部通过；无模型 prompt。
- 真实浏览器 + 真实模型隔离 E2E（`deepseek-official/deepseek-flash`，临时 workspace）：从真实方法条目进入工作台，UI 保存并设为默认 → 清除默认 → 删除；每一步 Host tool 执行、Client 回执 `Saved and verified`、目标条目字段/默认状态/删除结果均经文件回读核对。另有一次隔离 Method Editor save 探针，模型先读 `method-interview`，再按给定 operationId/payloadHash 调用 `method_library_upsert`，Host 结构化成功。
- E2E 发现并修复两个真实问题：读态排队操作在 coach ready 后重建 draft/coach 导致 Session 建会话循环；工作台右缘按钮被右侧栏宽度拖拽柄遮挡。resume 判据已抽成 `shouldStartFreshDraftContext` 纯函数并留 keyless 反证。
- 用户于 2026-10-30 授权以真实浏览器/真实模型 end-to-end 实测作为本次业务验收；真模型测试使用隔离工作区，没有改动当前 research-workspace 的方法库。

## 残余风险

- 真实模型的**迟到/重复候选 patch**没有在对抗场景里被诱导复现；当前证据是 Client revision/seq 逻辑与事件测试，不能声明真实模型执行器一定按该路径输出。
- 跨刷新草稿恢复、崩溃后 operation journal 接续、跨进程无丢写和 exactly-once 明确未承诺。
- 深浅主题、读屏和最终视觉手感仍以用户实际使用为准；自动浏览器断言覆盖结构、焦点、窄屏与遮挡，不替代审美判断。
