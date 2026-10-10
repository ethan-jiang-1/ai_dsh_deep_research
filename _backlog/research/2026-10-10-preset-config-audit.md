---
topic: preset config 面对照盘点
intent: 为 company 钉版复核 Note「盘点后定」候选 preset-required-config 提供对照结论（零漂移，不需要修）。
---

# preset-required-config 盘点：四角色 config 声明面 vs vendor config-catalog（2026-10-10）

> 服务 = [company 钉版复核 Note](../../notes/implemented/2026-10-09-company-repin-review.md)
> 「盘点后定」候选。方法 = 只读对照（vendor pin `639ed015` = dsh-v0.2.0-rc.2 已验）；
> vendor 路径行内代码标注，行号 = 该 pin 现状。

## 一句话结论

**零漂移，不需要修**：四 preset + bundle 声明的全部 config 字段在正本中存在、类型/取值合法、
语义用对；无一字段"正本未见"；全部硬性必填字段在场；四 preset 共享字段取值逐字一致。

## 对照正本

`vendor/dsh/docs/config-catalog.zh.md`（生成物——`scripts/gen-config-catalog.ts` 把运行时
schemastery schema 与声明交叉核对，粘贴内容无法隐藏加载器接受的字段）。preset 行本体形状 =
`PresetDefinition`（`packages/preset/agent-preset-registry/src/definition.ts:7-13`：id 必填，
name/description/order 可选，plugins 必填）；plugins 行 = EntryOptions
（`vendor/loader/src/config/entry.ts:10-19`）。自写包 research-client 行无 config，不在 catalog
覆盖面（catalog 只生成 vendor 包）。

## 逐字段判定（共享面；L/S/A/C = lead/scout/analyst/critic）

| 行(config) | 字段 = 我方值 | 出现 | 判定 |
|---|---|---|---|
| persona | prefix = 各角色文本 | 全 | 合法（catalog:2208-2216，prefix 必填） |
| skill-filesystem | includeDefaultRoots=false；customSkillDirs=[各自 skills] | 全 | 合法（catalog:2860-2865） |
| tool-fs-search | sampleOverCapGlobResults=false | 全 | 合法且**必填**（schema `z.boolean().required()` 无默认，`tool-fs-search/src/index.ts:98`） |
| tool-todo | allowParallelInProgress=true | 全 | 合法且**必填**（`tool-todo/src/index.ts:42`） |
| tool-ask-user | mode='timed'；timeout=600 | 仅 L | 合法（catalog:3468-3473；600 与 persona 文案一致） |
| tool-web | fetch=true；searchTimeoutMs=60000 | 全 | 合法（catalog:3935-3951；fetchTimeoutMs 未声明走默认 30s） |
| tool-subagent | provider='spawn'；toolName='subagent'；backgroundMode='one-shot' | L/S/A | 合法（catalog:3821-3849） |
| agent-instructions | maxBytes=16384；projectRootMarkers=[] | 全 | 合法（`agent-instructions/src/config.ts:11,51`；[] = 关闭向上找根，有意覆盖） |
| tool-present / tool-goal / tool-session-query / tool-fs / tool-skill | 无 config | 分角色 | 合法（tool-present maxFiles schema default(8)，源码补证 `tool-present/src/index.ts:23-27`） |
| bundle：agent-preset-registry / session-query-sqlite | default:'lead'；path:':memory:' + openAt:'first-search' | — | 合法（catalog:150-152, 2668-2695） |

## 未声明可用面（正本有、我方未设——登记备查，不判采否）

tool-subagent：maxDepth（省略读 Host 默认 1 = 单点 worker，已登记 design/10）、toolFilter、persona、
agentOptions、modelSelectionSettings、enableRunInBackground；tool-web：search 开关、
searchMaxResults/Queries、fetchTimeoutMs（现 30s 默认）、fetchMaxOutputChars；tool-session-query：
maxSearchResults、searchTimeoutMs（与 tool-web 同名不同插件）；tool-fs-search：八项 cap/预算；
tool-fs：read 四件；skill-filesystem：providerName、dshHome/agentsHome、watch 六件、bundledSkillDir；
persona：suffix/complete/includeRuntimeContext；agent-instructions：dshHome、maxSourceBytes、
instructionFileCandidates、localInstructionFileCandidates；tool-goal：blockedAfterConsecutiveRounds；
session-query-sqlite：journalMode 与读窗五件。

## preset 间差异

**同字段值差异 = 零**（fs-search false / todo true / web fetch+60000 / subagent 三字段 /
instructions 16384+[] 逐字一致；maxBytes 同值另有 handbook-budget 门禁机械钉住）。结构差异
（谁挂什么）行内注释均自证意图：ask-user/goal 仅 L；session-query 仅 L/C；subagent L/S/A、
critic 无（审稿不派工）；present preset 级仅 L + bundle 层 insert 共享。

## 处置

**不需要修**。唯一观察（不构成修改建议）：tool-web fetchTimeoutMs 未设（fetch 走 30s 默认）
而 searchTimeoutMs=60000——若当年有意不对称则无需动；若属疏漏也是取值调优，不是对账问题。
