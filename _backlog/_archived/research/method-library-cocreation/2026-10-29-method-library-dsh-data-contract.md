---
topic: 方法库工作台所依赖的 pinned DSH session、存储、文件读取与插件生命周期机制
intent: 记录 pinned DSH 的一手源码证据，划清 DSH 已有机制、pack 尚需实现的业务语义和不可据此承诺的行为。
---

# 方法库工作台：pinned DSH 数据机制与限制

## 证据范围

本记录把仓库固定的 `vendor/dsh` 作为实现依据：仓库说明其开发基线为 `dsh-v0.2.1-rc.2`、commit `687f282e86`，全局安装不作为机制依据；pinned checkout 自身 `package.json` 版本为 `0.2.1-rc.2`（`AGENTS.md:104-110`；`vendor/dsh/package.json:1-4`）。本会话可见的全局安装清单为 `~/.nvm/versions/node/v22.23.1/lib/node_modules/@deepseek-ai/dsh/package.json:1-4`，版本 `0.2.1-rc.3`。这是运行环境版本差异的观察，不替代仓库 pin；GUI Inspect 或全局安装不能证明 pinned `rc.2` 的能力。

以下引用均指本仓库 pinned 源码/文档，并写出文件路径与行号。描述“可用”指 DSH 有对应机制，不代表方法库 pack 已经实现该业务协议。

## Session log、追加与 durability

- `dsh-session` 在内存中持有 event-sourced `Session`；持久化由另行挂载、订阅 `session/event` 的 persistence plugin 提供。`append()` 会快照并冻结 payload、要求 lossless JSON、通知观察者；surface event 还要求相应 surface metadata（`vendor/dsh/packages/core/session/README.md:28-50`；`vendor/dsh/packages/core/session/src/index.ts:798-826`）。
- 每次 append 的 `seq` 由当前日志长度生成，事件数据在发布前验证；因此日志序号可用于同一 session 内的顺序和关联，不能直接当作业务 draft revision 或文件版本（`vendor/dsh/packages/core/session/src/index.ts:808-826`）。
- `sessions.flush(session)` 是 session durability listeners 的屏障：等待所有 listener settle，失败时在全部 settle 后抛出首个失败；它只承诺已注册 listener 提供的持久化语义，不会替没有 persistence provider 的内存 session 创造持久性（`vendor/dsh/packages/core/session/src/index.ts:1310-1335`；`vendor/dsh/packages/core/session/README.md:28-28`）。
- 通用 `SessionHandle` seam 的 `append()` 解析只保证该 backend 实例可见；通常要等 `flush()` 才能依赖跨崩溃 durability。例外是当前 shipped JSONL provider：它对每个 append batch fsync，append 成功解析时该批已耐久；`sessions.flush(session)` 仍是显式 listener 屏障，可观察失败并覆盖使用其它 provider 的 composition。两者都不提交方法库文件或 UI draft（`vendor/dsh/packages/session/session-persistence/README.md:47-57`；`vendor/dsh/packages/session/session-persistence-jsonl/README.md:75-77`；`vendor/dsh/packages/session/session-persistence-jsonl/src/storage.ts:182-210`）。公开 README 还说明对持久 tool call 若无 durable result，结果属于未知；有副作用的调用需先验证外部状态或询问用户，不应盲目重试（`vendor/dsh/packages/core/session/README.md:167-171`）。
- `sessionQuery.readSession()` 可读取完整、经 replay validation 的 raw event log，而不把 session 激活成 live session；`sessionQuery` 文档列出精确读取、surface、事件、谱系与过滤等读查询能力，没有通用写草稿操作（`vendor/dsh/packages/session-query/session-query/src/index.ts:178-198`；`vendor/dsh/packages/session-query/session-query/README.md:28-45`）。

## Plugin records 与 projections

- `appendPluginRecord()` 确实存在，但源码明确标记为 experimental，并规定仅 `packages/experimental/` 下生产源码可调用；记录必须 JSON 可序列化、被标为 ignorable、不会进入 model-visible surface，格式迁移只 best-effort 保留。它不是普通 pack 可依赖的通用 draft API（`vendor/dsh/packages/core/session/src/index.ts:468-497`）。
- 正式的 `sessionProjections` 是由已注册 unit 对 session events 做确定性 fold 的 projection registry。注册随 Cordis fiber 生命周期；unload 会移除该 key；快照含 `asOfSeq`，checkpoint 行是 `{ key -> { ver, seq, val } }`，用于恢复事件派生 projection，而不是任意可变 UI 草稿（`vendor/dsh/packages/session/session-projection/src/index.ts:181-197`；`vendor/dsh/packages/session/session-projection/README.md:54-69`）。
- `session-projection-cache` 为 projection checkpoint 提供持久缓存；写入先 flush session log，再写完整 session checkpoint record，保证缓存不领先于日志。缓存契约不能推导为页面业务 draft 的自动保存/恢复 API（`vendor/dsh/packages/session/session-projection-cache/src/index.ts:248-272`；`vendor/dsh/packages/session/session-projection-cache/README.md:55-67`）。

## Tool、command 与 Remote 身份

- Agent loop 在 `tool/call` 中记录模型 tool `callId`，追加 `tool/result` 时沿用该 ID，并在 surface metadata 中记录来源 call event 的 `seq`。这保证模型 tool call/result 互相对应；默认 event contract 不把该 tool call 因果关联到触发它的 UI prompt `requestId`。Host 工具若从 prompt 取得业务 `operationId`，仅校验模型回传相同字符串不能证明它对应一条当前有效 UI 命令；绑定及授权须由 pack 协议另行建立（`vendor/dsh/packages/core/agent-loop/src/tool-calls.ts:262-290`；`vendor/dsh/packages/core/session/src/types.ts:358-384`）。
- Session prompt 的 `requestId` 会成为被接受用户消息 `source.rpcId`，供 Session Client 跟踪 inbox 提交是否被接纳；它不是后续 tool call ID。Slash command 的 `commandId` 只关联 command/run/done 生命周期。Remote transport 的 `rpcId` 在一次 Connection request/response 中相关联；Client facade 将 unary 响应作为该次调用的 Promise 结果交给调用方，但不提供 Host 去重、业务 journal 或跨重试幂等（`vendor/dsh/packages/api/session-controller/src/index.ts:477-485`；`vendor/dsh/packages/api/session-controller/src/client/sessions/session.ts:793-814`；`vendor/dsh/packages/api/gateway/src/client/index.ts:444-473`）。
- `api-remotes` facade 显式导入并挂载一份固定的 generated contribution 清单；清单不含 pack 新 Remote 时，不会自动将它加入 `ctx.remote`。Client plugin 也可直接导入自己生成的 contribution 并调用 `ctx.remote.$mount()`，但这只证明 DSH 提供挂载机制，不代表本 pack 已导出或接通该 artifact；Host/Client 包装、授权与生命周期仍须验证（`vendor/dsh/packages/api/remotes/src/client/index.ts:177-207`；`vendor/dsh/packages/api/remotes/README.md:73-79`；`vendor/dsh/packages/experimental/client-ui-claude-code-mods/src/client/mount.ts:111-130`）。
- Slash command 有独立 `commandId`，`command/run` 与 `command/done` 配对；命令执行器在 handler 前追加 run、settle 后追加 done（`vendor/dsh/packages/interaction/commands/src/types.ts:93-117`；`vendor/dsh/packages/interaction/commands/src/index.ts:332-385`）。这个 ID 是 DSH slash-command 生命周期的一部分，不能据此承诺任意页面发出的 tool 指令都有同型 `commandId`。

## Session follow 与 Client journal 恢复

- raw `SessionFollowRequest` 只有 durable address、可选的 history-window 参数与 `assistantStream`；没有 caller-supplied event cursor。Host `follow()` 在安装观察后取当时的 `source.cursor`，用该位置生成 opening snapshot，并从下一个 seq 开始发 live event；小于预期的 buffered seq 被跳过，向前出现 seq gap 则失败。因此重新打开 raw follow 会先得到新的 opening snapshot，不是从 pack 指定的已处理 cursor 开始（`vendor/dsh/packages/api/session-controller/src/types.ts:488-509`；`vendor/dsh/packages/api/session-controller/src/history.ts:120-124`）。
- DSH Client `SessionEventStream` 包装 raw follow，提供 snapshot-first journal、事件连续性检查与已打开流的缺口 page repair；通用 `RemoteJournalStream` 在 Client 内维护 last-applied cursor，但重连时不会把它发给 Host：每次 raw follow 都打开新的 Host snapshot，adapter 验证 snapshot cursor 不落后于 last-applied cursor，再以新 opening page 替换当前窗口。断线期间的 durable history 可能由这个新 snapshot 覆盖；若 pack 必须重放该区间，`session.page` 只按 `throughSeq` 截断并向更旧方向以 `beforeSeq` 分页，caller 必须从新的 opening watermark 回溯读取到 last-processed seq，合并排序后自行去重/应用，不能假设单页覆盖区间。此恢复仅针对 durable Session events；process-local assistant frames 不能通过 history page 恢复。cursor 是 adapter 内部状态，不是 raw follow API 参数（`vendor/dsh/packages/api/session-controller/src/client/index.ts:13-26`；`vendor/dsh/packages/api/session-controller/src/client/transport.ts:99-107`；`vendor/dsh/packages/api/gateway/src/client/journal-stream.ts:83-101`；`vendor/dsh/packages/api/session-controller/src/types.ts:488-509`；`vendor/dsh/packages/api/session-controller/src/history.ts:77-111`）。
- pack 当前另建 `follow()` 并直接消费 `scoped.remote.session.follow()`；它没有使用 `SessionEventStream`，且只把 raw event 中的 live `assistant/message` prose 交给草稿 parser。DSH adapter 可作为事件 journal 机制接入候选，但不会自动给模型 prose 增加业务 `operationId`、patch id 或 draft revision。Pack 仍须定义 stale patch 拒绝、重复结果处理及 operation reconciliation；若维持 raw watcher，则须自行建立 snapshot 对账、重连状态和游标/历史连续性逻辑（`packages/deep-research-pack/src/client/index.ts:60-95`；`packages/deep-research-pack/src/client/MethodLibraryView.tsx:408-488`）。

## Storage domain 与 SQLite

- `storage-domain` 是 host-side、schema-validated 的非 session durable records 接口：domain owner 定义 schema；consumer 经 `ctx.storageDomain.open()` 取得 handle；读同步、写在 resolve 前已 durable。文档明确建议 session event log 数据应归 session persistence，而非 storage domain（`vendor/dsh/packages/storage/storage-domain/README.md:28-58`）。
- Domain 写入按每个 domain 的 write chain 排序；后端 durability 成功后才更新内存并发 `domain/changed`。这提供同一 domain 的单写串行和单次操作的持久承诺，不等同于跨多个 domain、文件和 session event 的原子事务（`vendor/dsh/packages/storage/storage-domain/README.md:71-90`）。
- SQLite backend 可通过 `dsh-storage-sqlite` 注册 `sqlite`，再令 `storage-domain.backend: sqlite`；每个 key 对应一行 JSON 文档，单次写 primitive 是一个 prepared statement，依赖 SQLite 单语句原子性，没有显式多操作事务。SQLite driver 同步阻塞 JS 线程；`:memory:` 随进程消失；格式版本不匹配会 fail-loud，文档目前不承诺迁移（`vendor/dsh/packages/storage/storage-sqlite/README.md:28-57`）。
- shipped base composition 并未把一般 storage domains 路由至 SQLite：它挂载 `storage-json` 并将 `storage-domain.backend` 设为 `json`；同一 base 对 session full-text search 单独挂 SQLite，但默认 `path: ':memory:'`、`openAt: never`，保留继承的读取而禁用搜索。这些配置说明不能把“DSH 有 SQLite backend”误读为当前 profile 已用 SQLite 持久化任一业务草稿（`vendor/dsh/packages/bundle/base/cordis.patch.yml:149-200`；`vendor/dsh/packages/session-query/session-query-sqlite/README.md:28-53`）。

## Workspace files 的读与版本

- `workspaceFiles` 的实现文档声明它提供只读预览、目录列表和变更观察，不暴露 mutation；text `read` 回传 stat 元数据、页内容、行数与 EOF，`readBytes` 回传 stat 元数据、bytes 与 EOF，另有 `stat/list/changes`（`vendor/dsh/packages/api/workspace-files/src/index.ts:1-19`；`vendor/dsh/packages/api/workspace-files/README.md:30-36`）。
- 文件 `version` 是 stat 时取得的 opaque freshness token，不应解析或等同于业务 revision。`read()` 返回的 version 来自读取内容前的 stat；EOF 表示本页是否覆盖文件末尾；分页 text 只读到当前页范围（`vendor/dsh/packages/api/workspace-files/src/types.ts:21-35`；`vendor/dsh/packages/api/workspace-files/src/index.ts:225-247`；`vendor/dsh/packages/api/workspace-files/README.md:42-50`）。
- 该 API 的 read 不是事务快照：stat 和读取内容之间若有并发写，返回的 version 与内容可能不对应同一个文件状态。故通过 workspaceFiles 读取后不能声称基于该 version 的原子 compare-and-swap，亦不能声称读回内容一定对应该 version。读取会拒绝最终路径组件为 symlink 的文件，但文件读取不做 workspace containment，API 明确允许绝对或相对的工作区外文件路径；中间路径组件仍可能解析经过 symlink。目录 list/watch 有各自的 containment 规则，不能推广成文件读取限制（`vendor/dsh/packages/api/workspace-files/README.md:140-147`；`vendor/dsh/packages/api/workspace-files/src/index.ts:225-246`）。
- Host 有另一条可调用文件服务：base composition 挂载 `fs-sandbox`，由 `ctx.fs` 提供；sandbox backend 复用 `fs-local` 的 mutation，再加 workspace containment（`vendor/dsh/packages/bundle/base/cordis.patch.yml:516-520`；`vendor/dsh/packages/fs/fs-sandbox/src/index.ts:1-8`）。Host pack plugin 可在 Cordis composition 中声明服务依赖并调用该服务；这不让 Client 获得文件写权。
- `ctx.fs.writeText()` 支持 `createIfAbsent` / `replaceIfVersion`；local provider 在 per-target lock 内 probe、检查 guard、原子发布。guarded replacement 在同一 provider 实例里遇到过期 version 会以 `FS_STALE_VERSION` 拒绝（`vendor/dsh/packages/fs/fs/src/index.ts:254-272`；`vendor/dsh/packages/fs/fs-local/src/index.ts:101-130`；`vendor/dsh/packages/fs/fs-local/tests/filesystem.spec.ts:641-654`）。
- 保护范围不能夸大成全局 CAS：local provider 的 lock 明确仅当前进程；其它进程不串行，且本进程 guard 的 probe 与之后 atomic publish 之间，外部 writer 仍可能介入。文件 version 是 opaque metadata freshness token，依赖 device/inode/size/mtime/ctime；它不是业务 revision，特定存储若不能更新元数据会削弱检测（`vendor/dsh/packages/fs/fs-local/README.md:133-137`；`vendor/dsh/packages/fs/fs-local/src/index.ts:202-244`）。
- `dsh-fs-observation-policy` 只为 `dsh-tool-fs` 维护按 agent session 的观察状态，并在插件 dispose 时清除；workspaceFiles read 不会自动成为这个 policy 的 observation。pack 直接调 `ctx.fs` 时应自行明确提供 expected intent，不能假定模型工具的观察策略自动套用（`vendor/dsh/packages/fs/fs-observation-policy/src/index.ts:21-41`；`vendor/dsh/packages/fs/fs-observation-policy/README.md:80-82`）。

## Client plugin 生命周期与 draft 恢复

- Slot registration 返回 disposer，卸载 registration 会清理贡献及其 child slots/store mount；这是插件/UI 贡献生命周期清理，不是业务数据 checkpoint（`vendor/dsh/packages/client/ui-slots/src/index.ts:1144-1156`）。
- client store 可显式启用 localStorage 持久化；session-scoped store 的 persist key 可以加 session id 后缀。但 runtime scope teardown 明确不会调用 `clearPersisted()`；是否定义 persist、状态 schema、何时清除及如何恢复都由 store owner 决定，且这不是 Session log 或 projection checkpoint（`vendor/dsh/packages/client/store/src/index.ts:217-249`；`vendor/dsh/packages/client/store/src/contract.ts:70-102`）。

## localStorage 范围与草稿持久化 owner

**可核实事实**

- 仓内 FAQ 26 归档摘要区分两类客户端数据：纯 UI 可用 `localStorage` / `userData`；session-derived 事实应由 projection 提供，不能另存副本。它明确举标题、模型、preset、绑定为不可复制的 session-derived 事实，并未把禁止范围写成所有 pack UI state（`_backlog/_archived/research/data-contract/2026-10-27-dsh-data-plane-digest.md:28-29`、`_backlog/_archived/research/data-contract/2026-10-27-dsh-data-plane-digest.md:200-204`）。该摘要说明 FAQ 原件 `_faq_on_digested/26_plugin-data-model` 按 rc.3 编写，而本仓 pin 为 rc.2；FAQ 原件不在当前 checkout，因此此处引用的是仓内归档转述，不是 FAQ 原件行号（`_backlog/_archived/research/data-contract/2026-10-27-dsh-data-plane-digest.md:8-12`）。
- pinned DSH 的 client store 把 localStorage 定义为 opt-in；声明 persist key 后才会读取/写入，session scope 只给该 key 加 session id 后缀（`vendor/dsh/packages/client/store/src/contract.ts:52-59`；`vendor/dsh/packages/client/store/src/index.ts:100-109`、`vendor/dsh/packages/client/store/src/index.ts:138-165`、`vendor/dsh/packages/client/store/src/index.ts:217-227`）。runtime scope teardown 不调用 `clearPersisted()`；清理是显式操作（`vendor/dsh/packages/client/store/src/contract.ts:80-83`；`vendor/dsh/packages/client/store/src/index.ts:238-245`）。
- pinned Client 架构将 entry store 限定为共享 viewing/interaction state，并明确包含 selection、drafts、panel widths；业务数据留在 object layer，会话、frames、connections 也不属于 store（`vendor/dsh/packages/client/AGENTS.md:54-59`）。这说明草稿可作为 Client UI state 存活于当前页面/组件生命周期，不等于它已获准跨刷新持久化。
- 本 pack 现行 README 明确采用更严规则：pack 代码不写浏览器存储，也不声明 storage domain；方法库只读 `workspaceFiles`，写入只走 host 窄工具（`packages/deep-research-pack/README.md:33`、`packages/deep-research-pack/README.md:177-179`）。因此 FAQ 的一般分类不能覆盖或放宽本 pack 自己的限制。
- Host `storage-domain` 可供 owner 声明带版本与 schema 的 durable record；适用于必须跨重启保留的 host-side 数据，不应用来替代 Session event log。调用方负责 handle 生命周期，写入在返回前已 durable（`vendor/dsh/packages/storage/storage-domain/README.md:28-36`、`vendor/dsh/packages/storage/storage-domain/README.md:47-58`、`vendor/dsh/packages/storage/storage-domain/README.md:71-73`）。domain 是静态命名且单个 facility 按名称只允许打开一次，不是可随每个 workspace 动态定义的 domain（`vendor/dsh/packages/storage/storage-domain/src/spec.ts:34-47`；`vendor/dsh/packages/storage/storage-domain/src/index.ts:64-68`、`vendor/dsh/packages/storage/storage-domain/src/index.ts:103-105`）。
- 已保存方法的既有持久 owner 是工作区 `method-library.md`；pack 当前只为完整方法条目提供 `upsert/remove`，不是 draft/checkpoint API。Client 的 `workspaceFiles` 是只读面（参见「Workspace files 的读与版本」及 `packages/deep-research-pack/README.md:33`）。

**由事实得出的设计判断**

- FAQ 26 的一般禁止针对 session-derived facts，不是所有纯 UI state；但当前 pack README 禁止任何 pack-owned browser storage。因此 localStorage draft cache 与 Host storage-domain 都不是本 pack 当前已批准的持久化 owner。后一种虽然是 pinned DSH 已有机制，使用它仍需先改变 pack 的数据政策并明确 schema/version、workspace key、保留/删除/迁移及失败恢复；session/file 写入之间也没有跨资源原子提交（参见「由事实得出的设计判断」及 `Session follow 与 Client journal 恢复`）。
- 工作台活动草稿混有方法内容、来源、手改保护、基线和保存阶段，不能只凭“它在 UI 里编辑”就认定整个对象是可随意持久化的纯 UI 偏好。当前有明确依据的 owner 只有页面/Client store 的易失状态和已保存后的工作区方法文件；没有已批准的跨刷新草稿 checkpoint owner。刷新恢复在 owner 与产品政策获批并定义完整恢复协议前不得承诺。

## 对 A′ 设计可用的结论

| 状态 | DSH 可确认的机制 | 不能从机制推出的保证 |
|---|---|---|
| 已支持 | Append-only session event、单 session seq、provider-defined persistence、JSONL provider 的 append-batch fsync、flush durability barrier、replay-validated 查询；tool call/result 以 callId 和源 event seq 关联；slash command 有 commandId 生命周期。 | 不能把 session seq 当 draft revision；不能将 slash `commandId` 泛化为任意 tool/保存命令 ID；tool `callId` 不自动关联 UI prompt。 |
| 已支持但需明确接入 | Storage domain 可存 host-side schema-validated durable records，能路由到 SQLite；client store 可选择 localStorage；projection 可按事件 fold 并缓存 checkpoint。 | 这些机制不会自动创建方法库业务 draft、字段来源/保护状态、保存快照或页面恢复逻辑；projection cache 不等同 draft store。 |
| 需业务 pack 协议 | 若要可靠恢复或验证，pack 需定义 draft identity/revision、保存操作关联 id、基线或 hash、结果回读判据及明确的并发写策略。 | 上述业务语义不是 DSH generic session/storage/workspaceFiles API 自动提供的。 |
| 不能承诺 | workspaceFiles 只读；read version 与内容可能因并发写而不一致；storage domain SQLite 是 host KV 与单次写语义；session log 与文件写之间没有跨资源原子事务。 | 不承诺 workspaceFiles CAS/transactional read、跨 session/file/domain 原子提交、仅靠历史重建 UI-only 草稿、无协议的刷新恢复或共享库并发不丢写。 |
