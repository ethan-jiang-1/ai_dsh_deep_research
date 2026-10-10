# HITL 停靠点打磨首棒——拍板记账与交付序列（pipeline-polish 面⑤）

> 状态：implemented
>
> 归档：2026-10-10（notes-stocktake 边界个案 A 裁定：操作内容已由 docs/guides/61 §0 开跑全文承接〔2026-10-08 体检核实〕，残余出处指针按 archived-note-pointer 登记制显式化——裁定记录 = `notes/implemented/2026-10-10-archive-review-surface.md`）

出处：[pipeline-polish 卡](../../_backlog/_archived/settled_issues/2026-09-28-pipeline-polish.md) 2026-10-03 基座
适配复查后面⑤首棒（主序 ⑤→②→③→④ 第一棒，2026-10-03 用户拍板开工）。

## 决定

1. **lead persona「审阅（HITL2）」行**补**拍板即回写记账**：用户拍板后（无论哪支）第一动作 =
   拍板行追加进 question.md 的 Decisions 节（append-only、最新在上，写明拍板内容与版本
   走向），先记账再动交付——G8 #③ 实证缺口（拍板后落 final/ 并 present 但未回写 §Decisions，
   门③活体抓红、操作侧代补）在模型可见面的修复。
2. **lead persona「交付」行**改写为**拍板后四步序列**：① §Decisions 拍板行在场 ② final/
   版本化 ③ present 声明当前版 ④ update_goal complete——与 NODES 门②③判据逐一对齐，
   缺一即未完成（G8 #② 同源的"交付无序列化完成定义"修复）。
3. **synthesis skill §5**补两判据：**摘要发出前自检**（超 200 字 = 违纪，先删后发；执行方差
   实证第八场 576 字）+ **拍板行回写**（同决定 1 的 skill 侧形态）。
4. **HITL1 侧有意不动**：样本 3/4 卡点全在 HITL2 侧与通道，问项拟法判据已在
   （research-brief 三问结构 + 模式库判型痕）——无失败实证不改判据（floor 教训同源）。
5. **hitl2-scope-round 试点预案不入模型可见面**：触发条件未发生（搁置池行照旧），预案正本
   留 [_done 卡](../../_backlog/_archived/settled_issues/2026-09-28-hitl2-scope-round.md)。

## 输掉的方案

- **只靠 node-gate 门③事后抓红**（原状）：已实证能抓（G8 #③）但每次走操作侧补齐——把关
  成本落在操作侧而非判据进模型，救场计数下不去；
- **顺带改 HITL1 问项拟法**：无失败实证，违反"实测前不动判据"；
- **脚本代 lead 补拍板行**：伪造记账源头，违反 model-visible ⟺ logged 与"完成只认文件事实"
  ——记账必须出自 lead 本手。

## 验证

- **L0**：verify 34 门全绿 + tests 122/0（判据未变，无测试翻新面）。
- **L1**：preset-smoke 四角色真挂载 ALL PASS（keyless，skills 硬隔离断言随跑）。
- **L4-lite**：四角色真模型 ALL PASS + scout 真调 web_search（模型可见面改动的行为证据）。
- **snapshot-replay 三层 ALL PASS**：A 回放通路 PASS；B 组装请求（B1 persona 全文 + B2 工具
  schema）PASS——**B2 系 mcp-playwright 常驻（c480fb6）的在途债，本次换代一并清偿**（差分
  归因：profile mirror 含 marker 块而 v4 fixture 零 mcp 工具，常驻落地当日未跑快照冒烟）；
  C 渲染金标准按换代重写（`--update-expected`）+ 人审：活动行由"检索✓ + fetch
  FailedFetchError（v4 失败样态）"变"检索✓ + 开工播报 + fetch 正文已取回（aliyun HTTP 200，
  健康样态）"，卡标题与状态符设计不钉、逐字比对面变化与此一致。
- **fixture 换代**（`tests/fixtures/snapshot-research-face/session.v4.jsonl`，36 事件）：录制自
  **代理变量注入**的 3105 通道，探针会话已清（ee10d3c 清场纪律）；写入前结构自检四项全过
  （探针 prompt 在场 / persona 两判据在场 / mcp 工具面 25 引用）。

## 环境状态（Consequences）

- **guides/61 §0 铁律机理修正**（同 diff 入指南）："会话内起的通道 web_fetch 全域名撞墙"根因
  = **DSH SSRF 守卫 × 会话 fake-IP DNS**（守卫本地解析见非公共 IP 即拒〔198.18.x.x =
  系统透明代理 fake-IP 段〕，网络本身通——node fetch 直连实测 200）；**配方 = 启动环境注入
  标准代理变量**（DSH launcher 读 `http(s)_proxy` 装全局 dispatcher，代理跳跳过本地解析、
  DNS 归代理侧——vendor `web-fetch-http` provider.ts:123 + `util/http-proxy` README 设计
  如此），本机代理出口 7897 实证 web_fetch 200 取回正文。用户终端起通道的默认纪律不变
  （真实 DNS、零额外件）。
- run 通道当前停机（pilot 老通道已按 61 §0"确认后停掉"分支清口）：新 persona 随用户终端
  下次 `bash dev/boot-run.sh` 生效（boot 文本缓存随 boot 刷新）。
- 次序续接 = pipeline-polish 卡（面② wave0 下一棒；HITL1 侧与 scope-round 各待证据/触发）。
