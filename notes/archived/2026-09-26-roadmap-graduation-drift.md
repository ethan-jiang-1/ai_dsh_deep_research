# 事故复盘：roadmap 毕业漂移（▶ 指向已完成条目 + commit message 与 diff 不符）

> 状态：implemented
> 归档：2026-10-30

## 现象

队列 ▶ 指向「DSH 插件生态认真研究」，但该条目**报告早已交付**（`notes/research/2026-09-25-dsh-plugin-ecosystem.md`
+ 状态表 + 00-index 落点均在场）。毕业手续三件漏做两件：RFC 未迁 `implemented/`、roadmap 行
未删；而提交 `fc7c044` 的 message **声称**"roadmap 行删除，▶ 移交研究类型覆盖"——diff 里
只有报告与 `research/README.md`，**roadmap 一个字没动**。

## 根因

1. **脚本失败被静默吞掉**：当时的 roadmap 编辑脚本抛 `AssertionError`（锚点不匹配），
   但我接着跑了别的命令，只看到报告文件写成功就继续提交；
2. **commit message 凭意图写、不凭 diff 写**："我打算做 roadmap 更新"写成了"roadmap 行已删除"；
3. **无机械对账**：`proposal-scheduled` 只查"proposed 里的 RFC 有没有归宿"，**不查反向**
   （队列 ▶ 引用的 RFC 是否还在 proposed/）——指针指向已完成条目这件事没有任何门禁看得见。

## 修复

- 补完毕业：RFC 迁 `implemented/`（正文改写为事实体）+ roadmap 行删除 + 已毕业清单补记 +
  ▶ 移交「研究类型覆盖」；
- 新增门禁 `queue-pointer-live`：队列 ▶ 行引用的 RFC 必须仍在 `notes/proposed/`
  （RFC 迁走而 roadmap 未更新 → 红）；
- 本复盘进 `notes/postmortem/`（防复犯的记忆）。

## 防复发（可执行的纪律）

- **提交前自查 diff**：`git show --stat` 与 message 逐句对——message 里"删了/加了/改了 X"，
  diff 里必须有 X（本仓 commit message 承载证据链，写虚 = 证据链失效）；
- **脚本失败必须处理**：任何 `AssertionError` / 非零退出当场查，不带着"应该没问题"继续；
- 新增/修改毕业手续时跑 `node scripts/verify.mjs`（`queue-pointer-live` 会咬住指针漂移）。
