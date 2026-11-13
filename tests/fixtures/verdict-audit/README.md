# verdict-audit — 真实 child 会话线形夹具

消费方 = [verdict-audit-fixture.spec.mjs](../../run/verdict-audit-fixture.spec.mjs)（keyless；默认回归）。
资产来源 = claim 级裁决试点 A 的一次**真实 critic child** 会话 + 它对应的 bundle 工件。

## 为什么冻结这一份

`verdict-audit` 的四条判据（`session-preset` / `session-depth` / `not-verbatim` / `verifier-wrote`）
读的是真实 DSH v4 会话日志的**线形**（durable header 的 `agentPreset`/`delegationDepth`/
`parentSession`、`assistant/message` 的 content text 块、`tool/call` 的 name）。此前这些事实由测试
直接注入对象，CLI 里的日志读取没有 keyless 覆盖——日志线形或读取顺序漂移时，单测仍绿。本夹具把
一次真实现场（含 `delegationDepth: 1` 的 child、逐字裁决正文、只读工具面）固化下来，让 README
里的解析规则与 core 的 `parseSessionFacts` 由同一份真实行格式钉住。

原始现场（不入库，gitignored）：`runtime/harness-home/sessions/<group>/394f8a00-78f9-42bf-8911-58e9c786c8fd/`
（87 行事件、约 400 KB 解压后）。试点 = [claim-verdict 卡](../../../_backlog/_archived/settled_issues/2026-11-10-claim-verdict-quality-loop.md) P3；
契约 = [verdict-contract](../../../_backlog/_archived/research/quality-loop/2026-11-10-verdict-contract.md) §4/§5。

## 布局

```
pilot-a/
  sessions/research-workspace/394f8a00-…/session.v4.jsonl   # 真实 child 会话的脱敏切面
  bundle/
    final/v1.md                                            # 真实终稿（claims 原句的来源）
    review/claims.json                                     # 真实 claim 表
    review/verdicts-r1.json                                # 真实裁决（raw = child 末条正文）
    review.md                                              # 测试补充的最小终局块（非试点产物）
    run.md                                                 # 测试补充的 bundle 头（非试点产物）
```

组目录名 `research-workspace` 是可移植标签；`findSessionDir` 只按 `<group>/<sessionId>` 发现，
不比对 `projectKey`，所以不需要复刻录制机的 home 路径。

## 脱敏规则（改夹具前必读）

1. **事件条数、顺序、`seq`/`time` 不改**；只截断载荷。与 [client-load-home](../client-load-home/README.md)
   同一纪律。
2. `assistant/message`：`text` 块**逐字保留**（`not-verbatim` 的比对面）；`reasoning` 块截到 160 字、
   `tool-call` 的 arguments 截到 160 字；`data.stream` 清空。
3. `request/header`、`request/context` 载荷以 `__elided__` 标记替换（本夹具不证装配面；需要那面看 snapshot）。
   `system/message` 保留 persona 前 160 字。
4. `tool/result`、`user/message`、`agent/inbox/spliced`：递归把字符串截到 200 字（JSON 结构保留）。
5. 路径占位：`__BUNDLE__`（试点 bundle 路径）、`__WORKSPACE__`、`__REPO_ROOT__`、`__HOME__`；
   入库前 `grep -c 'Users/bowhead'` 必须为 0。
6. **不改** `final/v1.md`、`claims.json`、`verdicts-r1.json` 的内容：三者互相钉住（claims 原句在 final、
   raw 与 child 末条正文逐字相等）。改任一件应预期消费测试变红——绿了说明钉歪了。

## 重新录制

试点再跑一次（或换一个真实 child）后：

1. 取 child 的 canonical 日志（`session.v4.jsonl.zstd` 先 `zstd -dc` 成明文）；
2. 按上面六条生成脱敏切面；用 `parseSessionFacts` 自检：`preset=critic`、`depth=1`、`parentSession` 非空、
   末条 `assistantTexts` 与 `verdicts-r1.json` 的 `raw` 逐字相等、工具名无 `write/edit/bash`；
3. 同步复制 bundle 三件真实产物（`final/v1.md` / `claims.json` / `verdicts-r1.json`），`review.md` 保持
   测试补充形态；
4. `pnpm test` 跑消费测试；人审 diff 后再提交（体积目标 < 0.15 MB / 6 文件）。

## 这份夹具不证明

- 不证明 quote 是否真支持 claim、claim 表是否漏句（语义审归 critic 与人）；
- 不证明 child 装配请求面（persona/skill/headers）——那是 [snapshots](../../../snapshots/README.md) 的
  `research-face` 场景；
- 不是回放语料：canned 流与场景声明不在本组，跑法只有 keyless 消费测试。
