---
topic: 方法库工作台写入路径与授权策略比较
intent: 比较模型可见 Host tool 与 Client Remote 直达 Host owner 的一手证据、授权、回执、生命周期和测试缺口；不代用户作授权决定。
---

# 方法库工作台写入路径比较

> 范围：pinned DSH `dsh-v0.2.1-rc.2` 与当前 pack；这是证据比较，不是实现授权或产品决定。(`AGENTS.md:104-113`)

## 当前状态

- D25 规定面板不直写、通过模型可见路径留会话记录；同期 Note 记录选择此路径的理由是保留模型可见性与会话留痕。2026-10-28 D25 扩为 Method Editor 调窄 Host tool；D37 将它定为非研究角色，由页面按钮发保存封套，再调工具。(`docs/decisions.md:38`, `notes/implemented/2026-10-12-research-config-tab.md:16-21`, `docs/decisions.md:50`)
- 当前工具从 Agent Session `header.cwd` 固定读写 `method-library.md`；参数没有 Session/Workspace ID 或 operation ID，且直接用 Node `fs`，不走 `ctx.fs`。(`packages/deep-research-pack/src/method-library-tool.ts:23-59`)
- 当前页面把封套发给 Coach，并监听 live `assistant/message`；Client 已挂 `session` 与只读 `workspaceFiles`，没有方法库写入 Remote。API Remotes 只挂固定显式清单，不会自动发现新 Remote。(`packages/deep-research-pack/src/client/MethodLibraryView.tsx:306-328`, `packages/deep-research-pack/src/client/index.ts:60-95`, `vendor/dsh/packages/api/remotes/README.md:77-79`)

## 授权与信任对照

| 路径 | 可核实的调用者与目标 | 政策含义 |
|---|---|---|
| 模型可见 Host tool（当前） | 只在 Method Editor preset 声明；DSH tool 可注册在调用 Agent scope；工具从 owning Agent Session 取 `cwd`，固定写该目录下的方法库。(`packages/deep-research-pack/presets/method-editor.patch.yml:23-56`, `vendor/dsh/packages/core/tools/src/index.ts:1065-1095`, `packages/deep-research-pack/src/method-library-tool.ts:44-59`) | 窄参数和模型可见调用不等于验证了本次 UI 按钮授权。工具不经 `ctx.fs`；DSH sandbox 的写入限制由 `ctx.fs` 后端执行，不能从这段 Node `fs` 写入推出同样的 per-session sandbox fence。(`vendor/dsh/packages/fs/fs/README.md:28-36`, `vendor/dsh/packages/fs/fs-sandbox/src/index.ts:48-88`) |
| Client Remote 直达 Host（候选） | Web RPC 使用已认证 Connection Peer；浏览器 Peer principal 是 `owner`。Gateway 对 owner 不做资源解析或 `remoteAccess.decide`，Host 测试验证该分支不读 policy。(`vendor/dsh/packages/client/connection/README.md:41-51`, `vendor/dsh/packages/api/gateway/src/index.ts:781-809`, `vendor/dsh/packages/api/gateway/tests/gateway-access.host.spec.ts:254-286`) | Connection 认证证明可访问 Host，不等于业务目标授权；RemoteAccess 规则只检查非 owner。要限制 owner Remote 写入，Host handler 必须另做资源/操作授权，不能只声明 `resources`。(`vendor/dsh/packages/api/remote-access/README.md:27-36`, `vendor/dsh/packages/api/gateway/README.md:33-35`) |

- DSH 的 Session 与 Workspace 是独立资源种类；workspaceFiles 以 Session ID 查 Session header 的 `cwd`，本身只有读、列目录与观察方法。Workspace 控制器将 `workspaceId` 注册为另一种资源。使用哪个身份代表“共享 Host owner 的目标”，须由写入服务和产品授权明确定义。(`vendor/dsh/packages/api/workspace-files/src/index.ts:202-220`, `vendor/dsh/packages/api/workspace-files/README.md:28-40`, `vendor/dsh/packages/api/workspace-controller/src/index.ts:54-77`, `vendor/dsh/packages/typert/protocol/README.md:61-67`)
- Pack 文档定义一 Host 一用户、无每用户分区；方法库是本工作区数据。若采用共享 Host owner 的直接写入，不能假设 DSH RemoteAccess 会自动按本机用户分区。(`packages/deep-research-pack/README.md:214-220`)

## UI 操作身份与回执

- DSH 以 `callId` 将模型 tool call 与 tool result 配对；当前 UI 按名称/字段保存等待态，监听器只消费 live assistant 文本，再按名称和四字段回读，未将 `callId` 绑定到该 UI 操作。(`vendor/dsh/packages/core/agent-loop/src/tool-calls.ts:262-290`, `packages/deep-research-pack/src/client/MethodLibraryView.tsx:306-328`, `packages/deep-research-pack/src/client/MethodLibraryView.tsx:434-457`, `packages/deep-research-pack/src/client/index.ts:75-95`)
- Remote unary Promise 把该 RPC 的结构化 `RemoteResult` 交回发起 handler；Connection 的 `rpcId` 关联请求与响应，不是持久业务操作 ID、去重键或重试幂等协议。Remote transport 本身不注册 prompt/tool/session event，因此不因一次 RPC 自动进入模型会话记录。(`vendor/dsh/packages/api/gateway/src/client/index.ts:444-473`, `vendor/dsh/packages/client/connection/src/client/rpc.ts:37-69`, `vendor/dsh/packages/api/gateway/README.md:74-81`)
- 因此两者都需独立定义 UI `operationId` 与 Host 校验/记录规则，才能把结果归属到一次按钮操作；Session prompt `requestId` 进入 user message source 的 `rpcId`，用于 prompt/message correlation，不是保存操作 ID。(`vendor/dsh/packages/api/session-controller/src/types.ts:408-418`, `vendor/dsh/packages/api/session-controller/src/index.ts:477-485`)

## 装配、释放、失败与测试

- Host tool 通过 preset / Cordis tool 注册生命周期提供；实现直接读改写文件，未使用 DSH `ctx.fs` 的原子 mutation/version guard。方法库当前没有锁或版本史，并发写是后写覆盖先写。(`vendor/dsh/packages/core/tools/src/index.ts:1065-1095`, `packages/deep-research-pack/src/method-library-tool.ts:44-93`, `vendor/dsh/packages/fs/fs/README.md:34-38`, `packages/deep-research-pack/README.md:220`)
- Host Remote 需 Host Service/生成贡献与 Client 显式导入和 `$mount`；生成器为 Host Remote 契约发出 Client projection，现有 API Remotes 固定导入清单需另加 pack contribution。mount/dispose 由 Cordis fiber 管理，dispose 撤下方法并取消在途调用。(`vendor/dsh/packages/typert/generator/README.md:112-114`, `vendor/dsh/packages/api/remotes/src/client/index.ts:24-31`, `vendor/dsh/packages/api/gateway/README.md:56-60`, `vendor/dsh/packages/api/gateway/src/client/index.ts:214-221`, `vendor/dsh/packages/api/gateway/src/client/index.ts:254-279`) Remote 失败有结构化结果，但断线/取消不证明 Host 尚未提交。(`vendor/dsh/packages/api/gateway/README.md:31-33`, `vendor/dsh/packages/api/gateway/README.md:58-60`)
- tool 已开始但无 durable result 时，DSH 恢复为 `TOOL_OUTCOME_UNKNOWN`，有副作用操作不可盲目重试；workspaceFiles 回读不是事务快照，只能核实观察到的内容。(`vendor/dsh/packages/core/session/README.md:167-171`, `vendor/dsh/packages/api/workspace-files/README.md:145`)
- 需要的测试：tool 装配/卸载与仅目标文件写入；无效输入、无 cwd、并发/版本冲突；实际 tool call 与 UI operation 的绑定，超时后已写及重连不得误报/盲重试。Remote 另测 owner 的显式 handler 授权、非 owner Session/Workspace 拒绝、Host 认可的目标解析、mount/dispose、取消及响应丢失。当前测试只覆盖写入纯函数，不证明 Host 装配/授权/并发。(`tests/pack/method-library-write.test.mjs:1-6`, `vendor/dsh/packages/api/gateway/tests/gateway-access.host.spec.ts:254-286`, `vendor/dsh/packages/api/session-controller/README.md:36`, `vendor/dsh/packages/api/workspace-controller/README.md:27`)

## 不保证与未决判断

- Host tool 保留模型可见调用与 Session tool result，但不保证请求来自当次 UI 按钮；当前文件写入也不保证 sandbox policy、跨进程 CAS、业务 journal 或 exactly-once。(`docs/decisions.md:38`, `packages/deep-research-pack/src/method-library-tool.ts:44-59`, `vendor/dsh/packages/core/session/README.md:167-171`)
- Client Remote 提供直接 UI RPC 结果，不自带模型可见审计、owner 目标级 RemoteAccess 授权、去重或 exactly-once。成功 RPC、成功 prose 和当前态回读都不能单独证明完整操作历史或因果归属。(`vendor/dsh/packages/api/remote-access/README.md:27-36`, `vendor/dsh/packages/api/gateway/README.md:58-60`, `vendor/dsh/packages/core/session/src/repair.ts:163-194`)
- 待用户裁定：是否授权绕过模型直接写；若授权，按 Session 还是 Workspace 定目标、如何在 owner bypass 下执行业务授权、是否要求确认/journal，以及需要怎样的模型可见审计。上述是证据比较，不替用户作授权决定。(`docs/decisions.md:38`, `vendor/dsh/packages/api/gateway/README.md:33-35`)
