---
topic: run bundle 宪章卡的事实复核
intent: 校正锚点卡中不可复算的数字与三条会改变方案的事实错误，并留下可复跑的计数命令与未复算边界
---

# 宪章卡复核：数字、口径与三条会改变判断的事实

> 消费者：[_backlog/issues/2026-10-23-run-bundle-agent-state-and-read-chain.md](../../../_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)
> ｜ 复核日 2026-10-23 ｜ 只读：所有脚本只写 `/tmp`，未改任何 bundle 文件。
> ｜ 复核对象 = 该卡 12:55 初稿 + [RFC](../../../../notes/implemented/2026-10-23-run-bundle-charter.md) +
> 同目录四份证据。初稿的数字若与本文不一致，以本文为准；本文未复算的项在 §3 显式列出。
> ｜ **2026-10-23 用户裁定：历史偏差只作反例证据，不修、不建卡、不追改；本文件不是修复队列。**

## 0. 结论先行

1. **「独立」不是现状。** 初稿写「无 `../drt_` 路径式互引是好事」——实测有 **14 处 `../drt_`**
   （4 个文件，全部在 `archive/drt_computer-use-benchmarks`），其中 **7 条是 `[来源:]` 跨 bundle
   证据链接**，直接违反「研究状态之间零必需依赖」。另有 **37/46** 个归档 bundle 在散文里提到
   别的 bundle（45 个外部 slug）。初稿由此推出的「独立、可删已是现状，工作量只压在续上」
   不成立：续是主工程，独立性也需要一条**窄门禁**与旧场豁免。
2. **readiness 大多可机械读，问题在终局定义与升级权。** 当前 `terminalVerdictLine` 对 51 份
   review 的结果 = **46 PASS / 3 FAIL / 2 判不出**；3 个 FAIL 都在 `archive/`，其中 video 是
   文末历史附录夺权（真解析缺陷），coding-agent 是 lead 回写升级、mcp-server 是终局 FAIL 仍归档
   （权限/流转问题）；cn-llm-infra 的 `PASS-with-conditions` 与 eu-us 的无终局行是 2 个判不出。
   初稿「5 种形态 / 3 例末次匹配是历史轮 = readiness 不可机械读」把**可读性**与**权威性**混成
   一件；正确命题是：**先定单一终局块与升级权，再谈容错**。
3. **改手册不是「加几行」：它会红 snapshot-replay 的 B 层录制基线。** 手册是模型可见输入，
   `snapshots/replay/research-face/*/session.v4.jsonl` 里存着逐字注入文本 + `baselineIdentity` +
   digest；改一个字就要**真模型重录**四个角色场景。这条成本必须进分期与验收，不能藏在
   「不新增文件」后面。
4. **两处核心计数错了**：node-gate 是 **46/53**（不是 47/53），归档 node-gate 是 **44/46**
   （不是 45/46）；`cn-us-open-source` 也缺 gate，`agriculture-gap` 反而有 gate。
5. **plan 重写样本是 v1→v6、+5 个节点（W3.2–W3.6）**，不是 v1→v7、+6 个；今天 6 个 plan 里
   只有 e2e-rerun 有 `plan/vN` 快照（1/53），「重写前落快照」目前是未执行的习惯。
6. **阅读调用统计可复算，但初稿混了口径**：662 个 session 目录（run 组口径 656）、8,094 次 read；按「先判
   `templates/` 再判角色」的互斥分类，evidence 3,610、final.md 628、question 529、journal 518、
   review 426、leads 393、topics 342、drafts 248、templates 212、findings 200、final/vN 137、
   plan 35、NODES 16。方向性结论（证据是热点、plan/NODES 是冷面）成立，个别数字与初稿差
   2–10%，是会话集/分类顺序差，不是新事实。

## 1. 复算表

| # | 初稿说法 | 复核结果 | 复算方式 |
|---|---|---|---|
| 1 | 53 个 bundle（4 根 + 46 archive + 3 `_abandoned`） | **成立** | `ls -d drt_* archive/drt_* _abandoned/drt_*` |
| 2 | 2,078 张证据卡；归档 1,800 | **成立** | `find <bundle>/evidence -name '*.md'` 求和 |
| 3 | 归档 1,800 卡 vs 409 canonical md（81%） | 卡 1,800 成立；**顶层 md = 408**（409 差 1，口径未注明）；81% 成立 | `find archive/drt_* -maxdepth 1 -name '*.md'`（408）；比例 1800/(1800+408)=81.5% |
| 4 | 归档核心 question/topics/journal/findings/final/audit 46/46 | **成立** | 逐件 `find archive/drt_* -maxdepth 1 -name <f>` |
| 5 | 归档 review/node-gate 45/46 | review **45/46 成立**；node-gate **44/46** | 同上；缺 gate = `cn-us-open-source` + `deepseek-chat-context` |
| 6 | 全量 review 51、audit 47、node-gate 47 | review 51、audit 47 成立；**node-gate 46** | 同上 |
| 7 | plan 6/53、归档 1/46、acceptance 2/53 | **成立**；`plan/vN` 仅 1/53（e2e-rerun） | 同上 |
| 8 | 47 份 audit 依赖 `runtime/harness-home/sessions` | **依赖成立**；但 audit 只记语料规模，不记语料根（0/46 写路径）；2 份 acceptance 记绝对语料根 | `grep -l 'harness-home\|/Users/' archive/*/audit.md` = 0；`grep -n '会话语料根' archive/*/acceptance.md` |
| 9 | 无 `../drt_` 路径式互引、无 symlink | symlink 0 成立；**`../drt_` 14 处/4 文件**，其中 7 条 `[来源:]` | `grep -rn '\.\./drt_' . --include='*.md'`；`grep -rn '\[来源:.*\.\./drt_'` |
| 10 | 29 个文件写死 `/Users/bowhead/...` | **成立**（15 `_abandoned` + 14 `archive`） | `grep -rl '/Users/bowhead' <bundle 三区>` |
| 11 | 7 张证据卡用 `file:///...` 作 `source_url` | **成立**（7 个 `source_url` 字段；10 个文件提到 `file:///`，含 audit/review 的讨论） | `grep -rn 'source_url:.*file://'` |
| 12 | 51 份 review 有 5 种 readiness 形态、3 例末次匹配是历史轮 | **形态成立，结论过强**：当前终局解析 46 PASS / 3 FAIL / 2 null；3 FAIL = coding-agent、video、mcp-server；video 是附录夺权，另两例是权威/流转问题 | 调 `terminalVerdictLine` 逐份跑（脚本见附录 A） |
| 13 | 某在飞 plan 从 v1 到 v7、新增 W3.2–W3.6 六个节点 | **v1→v6、+5 个节点**（eu-us-cn-ai-stack，plan 头「图版本：v6」；W3.2/W3.3/W3.4/W3.5/W3.6） | `grep -n '图版本' drt_eu-us-cn-ai-stack/plan.md` |
| 14 | `_abandoned` 表里 2 行、盘上 3 个 | **成立**；漏登 `drt_deepseek-v4-status` | `ls _abandoned/drt_*`；`head -20 _abandoned/README.md` |
| 15 | v4-status「2 条 HITL2」 | **1 条 HITL2 拍板行 + 1 条操作侧代理模拟 provenance**；present 只在日志，不在 bundle | `grep -n 'HITL2\|代理模拟' question.md`；`grep -n present journal.md`（无） |
| 16 | 大文件：leads 74,805 B、review 112,043 B、final 49,383 B | 三个样本都在；但**不是最大**：review 最大 201,341 B、leads 最大 176,083 B、final 最大 61,088 B（在飞 hardware） | `find ... -name review.md -o -name leads.md -o -name final.md \| xargs ls -l` |
| 17 | 656 个研究会话 / 21 次显式「继续」/ 一次 6 glob + 1 spill | session 目录 **662**（run 组口径 656；差 6 未逐场核）；首条消息含「继续+slug」的 **27** 场（初稿 21 的口径未注明；卡 §4 的 34/32 是 resume-behavior 的「探针命中/真探针」口径，与 27 不同，勿混）；6 glob + 1 spill 的个案未复现 | 662 个 session 目录；首条 user/message 扫描（脚本见附录 A） |
| 18 | 阅读调用 3,608 / 640 / 583 / 518 / 439 / 413 / 394 / 249 / 211 / 208 / 41 / 16 | 见 §0.6；会话 662、read 8,094；按模板优先分类 evidence 3,610、final 628、question 529、journal 518、review 426、leads 393、topics 342、drafts 248、templates 212、findings 200、final/vN 137、plan 35、NODES 16 | 附录 A 脚本；初稿可能按 basename 分类，模板读取被算进 question/topics |

## 2. 计数口径（可直接复跑）

```sh
# bundle 与顶层件
cd research-workspace
ls -d drt_* archive/drt_* _abandoned/drt_* | wc -l
for f in question.md topics.md journal.md findings.md final.md review.md audit.md \
         node-gate.md leads.md plan.md acceptance.md; do
  printf '%s ' "$f"; find drt_* archive/drt_* _abandoned/drt_* -maxdepth 1 -name "$f" | wc -l
done
# 证据卡 / 顶层 md
find drt_* archive/drt_* _abandoned/drt_* -path '*/evidence/*.md' | wc -l
find archive/drt_* -maxdepth 1 -name '*.md' | wc -l
# 跨 bundle 依赖
grep -rn '\.\./drt_' . --include='*.md' | wc -l
grep -rn '\[来源:.*\.\./drt_' . --include='*.md' | wc -l
# 绝对路径 / file://
grep -rl '/Users/bowhead' drt_* archive/drt_* _abandoned/drt_* | wc -l
grep -rn 'source_url:.*file://' drt_* archive/drt_* _abandoned/drt_* | wc -l
```

**read 统计的互斥分类顺序**（顺序会改变数字，必须固定）：先判路径含 `templates/`，再判
`evidence/`、`final/vN`、`final.md`、`question.md`、`journal.md`、`review.md`、`leads*`、
`topics.md`、`drafts/`、`findings.md`、`plan/vN`、`plan.md`、`NODES.md`、`AGENTS.md`、其他。
初稿的 `question 583 / topics 394` 很可能把模板读取算进了角色读取；本复核把模板单列 212。

## 3. 未复算 / 不可复算（如实保留）

| 项 | 状态 | 处置 |
|---|---|---|
| 430 处路径字面量 | 初稿未给正则/范围；在 `scripts/ + pack src + docs` 里按 `drt_` 计是 **41 文件/115 处**，按更宽的路径词计 508 处 | 卡里改成可复算的两条窄指标（`drt_` 字面量 + 含绝对路径文件数），不再引用 430 |
| 185 个 ask turn / 62 未答（34%） | 未复算；来自 [resume-behavior](2026-10-23-resume-behavior.md) | 保留为方向性证据，不写进硬判据 |
| 72 次 present / 49 slug / 6 bundle 无 present | 未复算；来自 resume-behavior | 保留；门禁改造后以结构化事件重算 |
| 32 个真探针 / 5 个写盘 / 3 场重做 | 未复算；来自 resume-behavior 的逐会话表 | 保留；卡引用其表，不复制数字 |
| 「6 次 glob + 1 次 spill grep」 | 未定位到具体 session | 卡里删掉这个细节，改为「冷读探针先 glob 空转」的方向性表述 |
| 「present 一半在外」 | 初稿措辞与 38/46 journal 提及率不一致 | 卡里改成「38/46 归档 journal 提到 present；6 个 bundle 全程无 present；present 原始事件只在日志」 |
| 13 个未复算的跨 bundle 引用 | 本复核只精确到 7 条 `[来源:]` + 14 处 `../drt_` | 卡里用精确数；更广的散文互引标「37/46 有提及」 |

## 4. 三条会改变方案的判断

### 4.1 独立性：把「提及」与「证据依赖」分开

- **证据依赖（红）**：`[来源: ../drt_x/evidence/...]` 或 `[来源: archive/drt_x/...]` 让本 bundle
  的结论依赖另一个 bundle 的磁盘状态。实测 7 条，全部在 `archive/drt_computer-use-benchmarks`
  （final 4 个唯一卡 + findings + final/v1），源 bundle 是 `drt_cn-agentic-parity`。
- **散文提及（黄）**：正文叙述「前序 run 曾记录」不算必需依赖；但它会让删除后的文字悬空。
  实测 37/46 归档 bundle 提到 45 个外部 slug（含已删除的 anthropic 两场）。
- **自指（绿）**：`drt_token-factory/findings.md` 这类同 slug 引用不是跨 run 依赖。
- **规则建议**：新 run 禁 `../drt_` 与跨 bundle `[来源:]`；散文提及允许但不得充当证据；
  旧 bundle 按 epoch 豁免，不追溯改写。门禁只扫「来源链」与 `../drt_`，不做全文禁词
  （否则 37 个归档全红，且无法区分叙述与依赖）。

### 4.2 交付态：终局块 + 升级权，而不是更多正则

- **video**：文末「附：第一轮判定（历史记录，保留不改）」里的 `## readiness: FAIL` 被当前
  解析器当成终局；说明「历史附录不算当前」还没有机器形态。
- **coding-agent**：critic 首轮 FAIL，lead 在引用块里回写「按 critic 授权记 PASS」；当前解析器
  取 FAIL。这说明缺的不是容错，而是**谁有权升级、以什么形态升级**。
- **mcp-server**：第 2/3 轮 PASS，文末首轮 FAIL 被取；与 video 同类，但更复杂（首轮块无
  「附/历史」标题）。
- **cn-llm-infra**：`readiness = PASS-with-conditions`，当前解析器判 null；这是**术语形态**
  不是历史轮。
- **建议**：review 末尾固定一个 `## readiness（终局）: PASS|FAIL` 块（或 `terminal: ...`），
  规定「只有 critic 能写终局；lead 升级必须引用 critic 的授权行并落一个新终局块」；解析器
  只认该块，附录/历史节一律不夺权。旧 51 份按 epoch 豁免，3 个 FAIL 逐个处置。

### 4.3 手册成本：模型可见输入 = 录制基线

`snapshots/replay/research-face/` 的 4 个角色录制里，`agent-instructions` 注入消息带
`baselineIdentity`（`maxBytes: 16384`、空 `projectRootMarkers`）和手册 digest；`snapshot-replay-smoke`
的 B 层逐字比对 persona + headers + agent-instructions。改手册 → B 层红 → 真模型重录四角色。
因此：

- 阅读链/状态表/停放语义等**所有手册文本改动应成批一次落**，只付一次重录成本；
- 手册 10,757 B / 16,384 B，余量约 4.6 KB，阅读链 4–6 行放得下；不要顺手塞长表；
- 若只想验证阅读链而不动手册，可先放 lead skill（但 skill 目录描述也进比对面；正文只在
  加载时进上下文，成本不同）；跨角色覆盖仍以手册为唯一常驻面。

## 5. DSH 机制事实（用于卡的 §5.5）

| 机制 | 事实 | 出处 |
|---|---|---|
| `agent-instructions` | 首请求注入 cwd 链；嵌套文件在成功 read/write/edit 后的下一请求才注入；baseline 是普通 user/message，可 replay/compact/resume | `vendor/dsh/packages/context/agent-instructions/README.md` |
| `present` | 成功交付追加 durable `deliverables/presented`，含 `turn` / `callId` / `files[].path`；**没有版本号/哈希**；失败的 present 不发布事件 | `vendor/dsh/packages/deliverables/tool-present/README.md` + 实测日志 |
| HITL 答复 | 继续中的 ask 答复以 `user-question-reply` 消息回传（含 `callId` / `outcome`）；超时 pending 的答复走另一条 `answer` RPC | `vendor/dsh/packages/interaction/user-questions/README.md` + 日志中的 `agent/inbox/spliced` |
| goal | 每会话一个，durable across restart/resume/fork；**resume 后 active goal 被 disarm**，需人请求 `update_goal resume`；新会话没有旧 goal | `vendor/dsh/packages/goal/README.md`、`tool-goal/src/index.ts` |
| 任务板 | session-scoped；`task_id` 只是当前会话映射，恢复后重建 | `research-workspace/AGENTS.md`、`NODES.md` |
| 观察面 | client 侧用 `workspaceFiles` + `src/lib` 纯折算；`ResearchStatusTab` 按 journal 工具调用绑定会话，三位置回退；`run-version` 已用 present + final/vN 判交付 | `packages/deep-research-pack/src/client/ResearchStatusTab.tsx`、`src/lib/run-version.ts` |
| session_search | 实验性工具，workspace-scoped，省略调用方会话；只能作旁证，不是研究事实 | `vendor/dsh/packages/experimental/tool-session-query/README.md` |

## 6. 对卡的硬要求（本次复核的判据）

1. 不再出现「独立/可删已是现状、只差可续」的结论；按不变量逐条给现状与违约。
2. 不再把 node-gate 写成 47；不再写「8 文件核心 46/46」（6 件 46/46，review 45，gate 44）。
3. 不再写「无 `../drt_` 路径式互引」；给出 7 条证据依赖 + 14 处路径 + 37/46 散文提及。
4. 不再把 readiness 说成「不可机械读」；给出 46/3/2 与终局块/升级权。
5. 不再把「手册 + 几行」当零成本；写清 snapshot 重录与批量落文本。
6. 不再用 `A + C-lite` 这种与方案表字母冲突的记号；决定用名字（单位 / C-lite / 目录树）。
7. 不再把 `§8 状态推导表` 指向本卡的关闭条件；状态表在 RFC §8。
8. 验收必须预登记 ground truth、盲测协议、负样本、零写盘；「2/3 全对」单独不足以证明改进。
9. 关闭条件与实施验收分开：卡是判断记录；实施验收由 RFC/分期承载，或在卡上显式声明陪跑。

## 附录 A：复核脚本（临时；只读）

### A1 read 调用互斥分类

```js
// node /tmp/read-stats.mjs <run 组会话根>
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
const root = process.argv[2]
const files = []
const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) {
  const p = join(d, e.name)
  if (e.isDirectory()) walk(p); else if (e.name.endsWith('.jsonl.zstd')) files.push(p)
} }
walk(root)
const cats = new Map(); const bump = (k) => cats.set(k, (cats.get(k) ?? 0) + 1)
let calls = 0
for (const f of files) {
  let text; try { text = execFileSync('zstd', ['-dc', f], { maxBuffer: 1 << 30, encoding: 'utf8' }) } catch { continue }
  for (const line of text.split('\n')) {
    if (!line.includes('"type":"tool/call"') || !line.includes('"read"')) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const d = e.data ?? e
    if (d.name !== 'read') continue
    let a; try { a = JSON.parse(d.arguments) } catch { continue }
    const p = String(a.file_path ?? a.path ?? '')
    calls++
    if (p.includes('templates/')) bump('templates/')
    else if (p.includes('/evidence/') || p.startsWith('evidence/')) bump('evidence/')
    else if (/\/final\/v\d+\.md$/.test(p) || /^final\/v\d+\.md$/.test(p)) bump('final/vN')
    else if (p.endsWith('final.md')) bump('final.md')
    else if (p.endsWith('question.md')) bump('question.md')
    else if (p.endsWith('journal.md')) bump('journal.md')
    else if (p.endsWith('review.md')) bump('review.md')
    else if (p.includes('leads')) bump('leads*')
    else if (p.endsWith('topics.md')) bump('topics.md')
    else if (p.includes('drafts/')) bump('drafts/')
    else if (p.endsWith('findings.md')) bump('findings.md')
    else if (/\/plan\/v\d+\.md$/.test(p)) bump('plan/vN')
    else if (p.endsWith('plan.md')) bump('plan.md')
    else if (p.endsWith('NODES.md')) bump('NODES.md')
    else if (p.endsWith('AGENTS.md')) bump('AGENTS.md')
    else bump('other')
  }
}
console.log({ sessions: files.length, calls, cats: Object.fromEntries([...cats].sort((a, b) => b[1] - a[1])) })
```

运行：

```sh
node /tmp/read-stats.mjs \
  runtime/harness-home/sessions/--Users-bowhead-ai_dsh_deep_research-research-workspace--
```

### A2 终局 readiness 分布

```js
// node --import tsx/esm /tmp/readiness.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs'
const { terminalVerdictLine } = await import('/Users/bowhead/ai_dsh_deep_research/packages/deep-research-pack/src/lib/review-readiness.ts')
const stats = { PASS: 0, FAIL: 0, null: 0 }
for (const root of ['research-workspace', 'research-workspace/archive', 'research-workspace/_abandoned']) {
  for (const d of readdirSync(root)) {
    if (!d.startsWith('drt_')) continue
    const f = `${root}/${d}/review.md`
    if (!existsSync(f)) { stats.null++; continue }
    const v = terminalVerdictLine(readFileSync(f, 'utf8'))
    stats[v?.value ?? 'null']++
  }
}
console.log(stats)
```

### A3 续跑首条消息形态

```js
// node /tmp/probes.mjs <run 组会话根>
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
const root = process.argv[2]
const files = []
const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) {
  const p = join(d, e.name)
  if (e.isDirectory()) walk(p); else if (e.name.endsWith('.jsonl.zstd')) files.push(p)
} }
walk(root)
let total = 0, contSlug = 0
for (const f of files) {
  let text; try { text = execFileSync('zstd', ['-dc', f], { maxBuffer: 1 << 30, encoding: 'utf8' }) } catch { continue }
  const first = text.split('\n').map((line) => { try { return JSON.parse(line) } catch { return null } })
    .find((e) => e?.type === 'user/message' && !JSON.stringify(e.data?.content ?? []).includes('<system-reminder>'))
  if (first === undefined) continue
  total++
  const t = (first.data?.content ?? []).map((p) => p?.text ?? '').join('\n')
  if (/继续|接手|续跑|恢复/.test(t) && /drt_[a-z0-9-]+/.test(t)) contSlug++
}
console.log({ total, contSlug })
```
