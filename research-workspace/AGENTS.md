# research-workspace — 研究手册（角色会话的 cwd）

这里是 Deep Research 团队的共享工作区。所有研究角色会话在此目录工作；本手册通过
`agent-instructions` 注入每个角色会话。角色人格见各自 preset；这里只放**跨角色共享的
工作纪律与文件契约**。

## 目录约定

```
runs/<slug>/           一次研究 engagement = 一个 run（slug 由主编在立项时定，kebab-case）
  question.md          研究问题定稿 + HITL1 对齐快照（owner: lead）
  topics.md            topic 图：must_answer + scope_role（owner: lead）
  leads.md             候选方向清单（owner: scout）
  evidence/            证据文件，一条一档（owner: analyst）
  findings.md          发现账本：结论 + 支撑 + gap 状态（owner: lead）
  review.md            对抗核查报告（owner: critic）
  drafts/              过程稿（owner: 各角色，按需）
  final.md             最终报告（owner: lead，成品）
  journal.md           运行纪要（追加式，所有角色可写）
templates/run/         新 run 的起点模板（只读，不直接写）
```

模板六件 ↔ question/topics/leads/evidence-entry（= evidence/ 单条模板）/findings/final；
review.md、drafts/、journal.md 无模板——review 格式住 critic 的 adversarial-review skill，
drafts/journal 运行时自建。

## 事实的 owner（一处事实一个家）

| 文件 | 唯一 owner | 其他人 |
|---|---|---|
| question.md / topics.md | lead | 只读 |
| leads.md | scout | 只读 |
| evidence/*.md | analyst（创建者） | 只读 |
| findings.md | lead | 只读 |
| review.md | critic | 只读 |
| final.md | lead | 只读 |

要改别人 owner 的文件：通过团队通道向 owner 提请求，不直接动手。

## 证据文件契约（evidence/ 下的硬格式）

frontmatter 必须有：`source_url`（真实抓取过的 URL）/ `retrieved_at` / `quality`（A–D）/
`found_by` / `supports`。正文"原文摘录"与"解读"两节分开。以上即最小契约，**所有角色按此判**；
analyst 会话内另有全文模板（`evidence-extraction` skill——skills 按角色硬隔离，其他角色
加载不到，判据以本手册为准）。**没有 frontmatter 的文件不算证据**（critic 按此判）。

## 交付物三态

- **过程稿**：drafts/ 与各 owner 文件——团队内部工作面，不是成品；
- **成品**：lead 会话中 `present` 声明的 `runs/<slug>/final.md`——唯一对外交付物；
- **非成品声明**：非 lead 角色的 present 声明一律视为过程稿展示。

## 交互纪律（两点交互）

整个 run 只有两个人机交互点，都由 lead 执行：**立项对齐（HITL1）**与**交付审阅（HITL2）**。
两点之间所有角色静默自主推进——不问"要不要继续"、不汇报中间进度、不等确认。
用户主动发消息时直接回答，但回答不改变既定研究方向与分派。

## 完成判据（verify the world）

- final.md 每条关键结论附 `[来源: evidence/xx.md]` 且文件真实存在、内容真实支撑；
- 没有 CRITICAL 未修复的 review.md 就没有 final.md（readiness: PASS 前置）；
- "研究完成"的唯一依据是文件事实（final.md + present 声明），不是任何人的口头宣告。
