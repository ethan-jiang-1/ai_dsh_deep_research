---
topic: run bundle 续跑与交付行为审计
intent: 用真实会话证据回答「停了能续、删了没事、交付态可判」，并列出恢复行为的失败模式
---

# 「停了能续 / 删了没事 / 交付态可判」实证

> 消费者：[_backlog/issues/2026-10-23-run-bundle-agent-state-and-read-chain.md](../../_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)
> ｜ 只读分析（2026-10-23）；口径：`zstd -dc` 逐行解析 1,679 个会话（run 组 656 = 顶层 280 + subagent 376）；
> bundle 53（active 4 / archive 46 / _abandoned 3）。「真探针」= 首条用户消息在问「继续/状态/接手」的会话。

## A｜恢复 / 状态探针（命中 34，真探针 32，2026-09-26 → 10-17）

| session | prompt 形态 | 前 3 动作 / 读序 | 重发 HITL | 重交付 | 误读路径 | 靠会话记忆 | 判定 |
|---|---|---|---|---|---|---|---|
| 771c918e | 继续 + 四问 | glob 空转 → glob `drt_*/**/*` → question→review→final | – | – | ✓ | – | 答对；却 edit 改写 journal 的 HITL 代答声明 |
| 70750c12 | 同上（api-pricing） | glob miss → 4 次 glob 自愈 → question/topics/journal/findings/final | 1 | – | ✓ | – | 答对；反向问用户「下一步」 |
| 7c0f7618 | 同上（qwen-dashscope） | glob miss + read miss → question/topics/findings/review | – | **✓ present** | ✓×2 | – | 答对；「只读复核」却重新 present 并改 journal |
| fa46b88c | 同上（cn-agentic-parity） | glob miss → 12 reads（review 读 3 次） | – | – | ✓ | – | 自报揪出 2 处 bundle 内不一致；改 journal |
| db20f4cc | 同上（zhipu，绝对路径） | glob 工作区 → 10 reads → 3 edits journal | – | – | – | – | 答对；为消歧临时改标题再改回 |
| dcd786d5 | 同上（computer-use） | 3 glob（2 空）→ 9 reads | – | – | ✓ | – | 答对 |
| e178e5fe | 「中断恢复实测…不要写文件」 | glob → glob `drt_*/**/*.md` → question/topics/journal/final/v1 | – | – | – | – | 14 调用零写，**正例** |
| 19332823 | 「你刚接手…四问」 | glob 空转 → 自愈 → 20 reads | – | – | ✓ | – | 答对 |
| 19ebcd57 | 继续 mcp-security | 4 次路径试错（绝对路径当 glob → rg IO error） | – | – | ✓×4 | – | 答对 |
| 4a03af6a | 状态探针：现在什么状态/补研究走哪条路 | 读 final/v1 → **edit final/v1.md ×2**（「待 HITL2」→「已定稿」）+ edit findings | – | – | – | – | **探针改写交付态记录**；该 bundle 终局 verdict=FAIL |
| bfc503ff | 「继续 drt_claude-context-window 这个 run。」（无条件） | 4 reads → session_search(slug) → session_search(HITL1) → 23 处改 | 1 | 1 | – | **✓×2** | 92 调用重做已交付场，2 次 spawn |
| 0fc7fcae | 「继续 mistral-api-model-list」（裸 slug） | glob → journal/question/topics/final/review → ask「交付拍板」 | 1 | 1 | – | – | 重走一遍 HITL2 收口 |
| f0b2924a | 「继续 cn-moe-2026」（缺 drt_ 前缀） | get_goal→glob→journal/question/topics→web_fetch×2 | **3（含重发 HITL1 四问）** | – | – | – | 87 调用 / 16 spawn / 28 处改写 |
| 36c68186 | 「继续 drt_cn-us-ai-gap」 | glob→journal/question/topics/leads→create_goal→spawn×3→5 张任务卡 | 1（计划确认重呈） | – | – | – | 团队与任务板全量重建；journal 两次 edit 报 `file has not been read` |
| 1cfe9b60 | 「续跑指令…从 bundle 恢复即可」 | **0 工具调用**（13 次 MALFORMED_RESPONSE） | – | – | – | – | 整场空转 |
| 4b36a1c6 | 操作侧「重新呈交 HITL2」 | 读 bundle → ask | 1 | – | – | – | 设计内重发 |
| 2aac9f35 / 590e7671 / 31f84163 / 3dd2b19d | 「继续…目标=交付闭合」+ 逐条待办 | 读 review/audit/question → 定位红门 → 定点改（21/50/22/17 处） | 1–4 | 1 | – | – | **边界明确即收敛**：4 场全部归档 |
| beb15c16 / 75ae3325 | 继续 browser/video landscape | glob→read→比对 archive | – | – | – | – | 答对并自曝门禁红灯 |

小计：误读路径 **19 调用 / 10 会话**（09-26~27 的 6 个探针里 5 个首调即空转）；探针写盘 **5 个**；
探针重交付 **1 个**；重问用户 **6 个**表内会话。

## B｜删除 / 归档 / 停放

| 事件 | 时间 | 证据 | 后果 |
|---|---|---|---|
| 14 场移 `_abandoned/`（A 类 4 + C 类 9 + 停摆 1） | 10-16 | `_backlog/_archived/settled_issues/2026-10-15-unclosed-bundles-disposition.md` §落地记录 | **可逆性成立**：A 类 4 场 10-16/17 被「继续…目标=交付闭合」会话复活并归档 |
| 16 场删除 | 10-19 | `research-workspace/_abandoned/README.md` | 唯一副本 = `/tmp/abandoned-backup-20261019.tgz`（937K，README 自述「非长期保存」）；bundle 不可复活，只剩会话日志 |
| 停放登记漏登 1 场 | 10-21 | `_abandoned/README.md:14` 写「当前 **2** 个」，盘上 3 个（`drt_deepseek-v4-status` 10-21 迁入，README mtime 10-20） | 位置=状态的登记表已失真 |
| 仪表盘不认停放位 | 现行 | `scripts/lib/run-dashboard-core.mjs:20-26` SCENE_ROOTS 只有根 + archive；`ResearchStatusTab.tsx:191` 认三位置 | **两个观察面不一致**：停放场在多 run 总表消失，会话页签仍显示渐进面 |
| 门禁会写被判对象 | 现行 | `scripts/run-gates/node-gate.mjs` 每次运行落 `node-gate.md` 进 bundle | **观察动作污染交付物**；本次审计误触 1 次，已删并恢复目录 mtime |

## C｜present 在 log vs bundle 的在场率

72 次 present（run 组 66，49 个 slug）对 53 个 bundle → **6 个 bundle 全程无 present**；门② 三条通过路径
（`scripts/lib/node-gate-session-gates.mjs:169-186`）= present / PASS-RELAY / RED。

| bundle | 位置 | final.md | 终局 readiness | present | 歧义 |
|---|---|---|---|---|---|
| `_abandoned/drt_semver-caret-prerelease` | 停放 | ✓ | PASS | ✓ | 位置说未交付，文件说已交付（README 理由=审计 CRITICAL 7） |
| `_abandoned/drt_deepseek-v4-status` | 停放 | ✓ | PASS | ✓ | 同上 |
| `archive/drt_mcp-server-ecosystem` | 归档 | ✓ | **FAIL** | ✓ | 文末附录 `- 结论行：**readiness: FAIL**` 夺终局权 |
| `archive/drt_2026-ai-coding-agent-landscape` | 归档 | ✓ | **FAIL**（全文无 PASS） | ✓ | 4a03af6a 探针却把 final/v1.md 改成「已定稿」 |
| `archive/drt_2026-ai-video-generation-landscape` | 归档 | ✓ | **FAIL**（L213 PASS→L237 FAIL） | ✓ | 归档动作先于 FAIL 处置 |
| `archive/drt_deepseek-api-pricing` | 归档 | ✓ | 无 review.md | ✓ | 门② 无对象 |
| `archive/drt_geometry-coaching` | 归档 | ✓ | PASS | – | 无 final/v1.md（门④ N/A） |
| `drt_eu-us-cn-ai-stack` | active | ✓ | 无可用终局行 | ✓ | 活跃区里「已交付但未归档」 |

## D｜失败模式排名（频次 × 后果）

1. **交付态没有单一正本**（8/53 实证；后果最高）：位置 / `final.md` / readiness 行 / 日志 present
   四处可互相矛盾；`terminalVerdictLine` 对「文末附录保留首轮 FAIL」仍误判（mcp-server-ecosystem）。
2. **「继续 <slug>」不界定范围 → 恢复即重做**（3 场，最大 92 调用 / 23 处改写）：
   bfc503ff、f0b2924a、0fc7fcae；带「目标=交付闭合」边界的同类会话反而全部收敛。
3. **只读探针写盘**（5 例）：4a03af6a 改交付态与正文；771c918e 改 HITL 代答 provenance；
   7c0f7618 / fa46b88c / db20f4cc 追加 journal。
4. **重发 HITL**（run 组 185 个 ask turn 中 62 个从未被答，34%）：f0b2924a 重发 HITL1 四问、
   3dd2b19d 连发 4 张 HITL2 卡、36c68186「计划确认（重呈）」。
5. **路径误读**（19 调用 / 10 会话）：cwd 已是 `research-workspace` 仍再拼前缀；一次把绝对路径当
   glob pattern 触发 rg IO error。
6. **恢复零产出**（1cfe9b60：0 调用）。
7. **靠会话记忆**（bfc503ff 用 session_search 找 HITL1 与 slug）——与「bundle 即真相」契约相反。
8. **归档/停放的观察面缺口**：不认 `_abandoned`、登记表漏登、门禁写盘。

## E｜复核入口与审计偏差

- 复核：`zstd -dc <session>/session.v4.jsonl.zstd`；bundle 判据 = `terminalVerdictLine`（pack `src/lib/review-readiness.ts`）。
- **审计偏差（如实记）**：本次误跑了一次 `node-gate.mjs`，它把 `node-gate.md` 写进
  `archive/drt_cn-us-open-source/`；已删除该文件并把目录 mtime 还原为 Sep 29 09:39。
  这正好是「观察动作会写 bundle」的活证。
