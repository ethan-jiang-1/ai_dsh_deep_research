---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-165：note-format 的文本扫描不区分引用/反例——合法 Note 被误杀（状态行/证据节）

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：已修 — note-format 状态行只认头七行；证据按标题判定（2026-11-14，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）
>
> 位置：[scripts/verify/gates/c-notes.mjs](../../../scripts/verify/gates/c-notes.mjs) 的
> `statusOf` 与 `VERIFY_NEGATED`；合同正本 = [notes/README.md](../../../notes/README.md)（状态行唯一 +
> implemented 需「实际跑过的验证」节）。

## 症状 A：正文里的引用状态行被当成第二条状态行

`statusOf` 扫描**整个文件**里所有以 `> 状态：` 开头的行，不剥离代码围栏/行内引用。一个合法
Note 在正文引用旧状态（教学/历史）时被判「状态行必须唯一」，错误文案自己却写着「正文引文不算状态」。

## 复现 A

````sh
cat > notes/implemented/2026-01-02-probe-quote.md <<'EOF'
> 状态：implemented

## 决定

探针：正文引用状态行。

```
> 状态：proposed
```

## 输掉的方案

没有。

## 实际跑过的验证

真的跑过。
EOF
node scripts/verify/verify.mjs --only=note-format
# FAIL note-format
# notes/implemented/2026-01-02-probe-quote.md: 状态行必须唯一（发现 2 条，行 1/8）——正文引文不算状态
rm notes/implemented/2026-01-02-probe-quote.md
````

## 症状 B：任何「否定式」标题都让整篇 Note 失去证据节

`VERIFY_NEGATED` 是全局测试：只要文中任意 h2 含「未/无/待/… + 验证/证据」词，整篇就判
「缺实际跑过的验证」——即使同时存在**合法的** `## 实际跑过的验证`。

## 复现 B

```sh
cat > notes/implemented/2026-01-01-probe-negated.md <<'EOF'
> 状态：implemented

## 决定

探针：同时有真实验证节与“未验证的猜想”节。

## 输掉的方案

没有。

## 实际跑过的验证

真的跑过。

## 未验证的猜想

这里只是猜想，不构成证据。
EOF
node scripts/verify/verify.mjs --only=note-format
# FAIL note-format
# notes/implemented/2026-01-01-probe-negated.md: 缺"实际跑过的验证"节——无证据的"完成"不算完成
rm notes/implemented/2026-01-01-probe-negated.md
```

两个探针都删除了，`git status` 干净；对照 = 去掉引用/否定节后同一 Note 全绿。

## 根因（已证）

判据是**全文正则**而不是按语义范围取值：

1. `statusOf` 用 `lines.flatMap(l => l.startsWith('> 状态：'))` 扫全文，没有 fenced code / inline code
   剥离（`note-graduation-rewrite` 已有剥离逻辑，未复用）；
2. `VERIFY_NEGATED` 的 `test(text)` 是「全文任意命中即失败」，而不是「至少一个未否定的证据 h2」。
   否定式标题本意是「这一节不算证据」，被实现成「整篇没有证据」。

## 影响面

- 合法 Note 被 `pnpm verify` 拒绝：不能引用旧状态行、不能写「未验证的猜想/待验证」caveat；
- 新笔记门禁刚落地（2026-11-14），误杀会迫使作者删证据性文字或加 grandfather 注释，反噬治理目标；
- 与 note-tree 的隐藏目录洞（[BUG-166](BUG-166-note-tree-hidden-directory-bypass.md)）同批，属新门禁
  的首轮边界。

## 牵出的失败类

- **C8 假红**（语义边界用全文正则）+ **C4 文本/编码边界**。
- 同机制第 **1** 次（新门禁）；类修：任何「状态/声明」扫描都要先剥离引用/围栏，任何「至少一节」
  断言都要按节判定而不是全文否定。

## 修复判据

- 状态行：剥离 fenced code / inline code 后再找 `> 状态：`；或只认「头七行内的第一条」并把正文引用
  明确豁免。反证 A 必须绿。
- 证据节：先枚举所有 h2，取其中**非否定**且命中证据词表的标题；至少一条即通过。反证 B 必须绿。
- 负对照：只有 `## 未验证的猜测` 而没有真证据节 → 必须仍红（防修成「有字就过」）。
- 既有 12 篇 archived / implemented 全量复跑，不新增 grandfather。

## 修复关联

已修（2026-11-14）。触面 = 门禁与笔记合同，按 [_backlog/AGENTS](../../AGENTS.md) 转 `等人拍板`；可与 BUG-166 同批修。

## 修复落地（2026-11-14）

- **改动**：`scripts/verify/gates/c-notes.mjs`：`statusOf` 只在头七行找状态行（正文引用不再计数）；证据节改为「至少一条非否定证据 h2」，不再因任意否定标题否决整篇。
- **证据**：`node scripts/verify/verify.mjs --only=note-tree,note-format` → 全绿；`gates.e2e` 的 12 个 note 案例全绿（含更新后的 duplicate-status：改为头七行内注入）。
- **反证**：引用状态行 + 真实验证节的临时 Note 旧实现红「状态行必须唯一」；修后 PASS。只有 `## 未验证的猜测` 的 Note 仍红（负对照）。
