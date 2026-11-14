---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-175：notes 门禁不剥围栏 + 隐藏 `.md` 绕过日期前缀——示例可当证据、引用可当状态

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：已修 — 共享 `scripts/lib/note-scan.mjs`（fence mask + 隐藏 `.md` 红）；用户当轮指示「有新的继续往前做」
>
> 位置：[scripts/verify/gates/c-notes.mjs](../../../scripts/verify/gates/c-notes.mjs) 的
> `statusOf` / `hasPositiveEvidence` / `note-tree`；前科 = [BUG-165](BUG-165-note-format-quoted-status-and-negated-evidence.md)
> 与 [BUG-166](BUG-166-note-tree-hidden-directory-bypass.md)（同批只修了头七行/隐藏目录）。

## 症状

BUG-165 把状态行收窄到头七行、把否定节按 h2 排除，但没有**块级剥离** fenced code：

1. 只有围栏里的 `## 验证`（没有真证据节）→ `note-format` **PASS**（示例冒充证据）；
2. 头七行内围栏里的 `> 状态：proposed` → `note-format` **FAIL**（引用被当第二条状态行），
   而实现注释写的是「围栏里的状态行不算状态」；
3. `notes/implemented/.hidden-note.md`（无日期前缀）→ `note-tree` / `note-format` 双 **PASS**
   （点文件豁免把 Note 本身也豁免了）。

## 复现（2026-11-14 实测）

```sh
# ① 围栏里的证据标题
cat > notes/implemented/2099-01-01-probe-fence-evidence.md <<'EOF'
> 状态：implemented

## 决定

探针：只有围栏里的证据标题。

## 输掉的方案

没有。

```markdown
## 验证
这段只是围栏里的示例，不是本 Note 的证据节。
```
EOF
node scripts/verify/verify.mjs --only=note-format
# PASS note-format        ← 应红：没有真证据节
rm notes/implemented/2099-01-01-probe-fence-evidence.md

# ② 头七行内的围栏引用
cat > notes/implemented/2099-01-02-probe-fence-status.md <<'EOF'
> 状态：implemented

```
> 状态：proposed
```

## 决定

探针：围栏内的引用状态行在头七行内。

## 输掉的方案

没有。

## 实际跑过的验证

真的跑过。
EOF
node scripts/verify/verify.mjs --only=note-format
# FAIL note-format … 状态行必须唯一（头七行内发现 2 条，行 1/4）   ← 应绿
rm notes/implemented/2099-01-02-probe-fence-status.md

# ③ 隐藏 .md
cat > notes/implemented/.hidden-note.md <<'EOF'
> 状态：implemented

## 决定

探针：隐藏文件名绕开日期前缀。

## 输掉的方案

没有。

## 实际跑过的验证

真的跑过。
EOF
node scripts/verify/verify.mjs --only=note-tree,note-format
# PASS note-tree / PASS note-format   ← 应红：文件名不是 yyyy-mm-dd-topic.md
rm notes/implemented/.hidden-note.md
```

## 根因（已证）

判据是**行/全文正则**，没有 Markdown 块级状态；点文件豁免在目录类型/Note 判定之前：

- `statusOf` 只截头七行，围栏里的 `> 状态：` 仍是头七行内的一个字符串；
- `hasPositiveEvidence` 对全文逐行匹配 `^##`，围栏里的 `## 验证` 也是「h2」；
- `note-tree` 对 `notes/<lifecycle>/.hidden-note.md` 先 `startsWith('.')` 跳过，日期前缀合同从未执行；
- `note-graduation-rewrite` 已有一份 `` ``` `` 剥离逻辑，但没有共享，`~~~`/长围栏仍漏。

## 牵出的失败类

- **C8 假红 / C7 假绿**（同一机制双向）+ **C2 扫描面收窄**。
- 同机制第 **2** 次（BUG-165/166 是同一门禁的首轮边界）；按类修：块级剥离单一函数 + 目录/文件
  类型先判，状态/证据/毕业三个读者共用。

## 修复判据

- fenced code（``` / ~~~、长度、语言后缀、未闭合）内的行一律不算状态行/证据 h2/毕业标记；
- 状态行 = 围栏外唯一一条且住头七行；证据节 = 围栏外至少一条非否定证据 h2；
- `notes/` 根与生命周期层的隐藏目录红；隐藏 `.md` 不豁免日期前缀；`.DS_Store` 等非 `.md`
  点文件仍忽略；
- 反证：①围栏证据 → 红；②头七行围栏引用 → 绿；③隐藏 `.md` → 红；④真实证据 + 否定节 → 绿；
  `.DS_Store` → 绿；`gates.e2e` 常驻案例覆盖四形态。

## 修复落地（2026-11-14）

- **改动**：新增 `scripts/lib/note-scan.mjs`（`maskFencedCode` / `h2Titles` / `statusLines`）；
  `c-notes` 的 `statusOf`、`hasPositiveEvidence`、`note-tree`、`note-graduation-rewrite` 改用共享
  mask；隐藏目录与隐藏 `.md` 显式红，非 `.md` 点文件豁免保留。
- **gate cases**：`note-tree-hidden-dir` / `note-tree-hidden-note-file` / `note-format-fenced-evidence`
  注入红；`note-format-quoted-status` / `note-format-negated-plus-real` / `note-tree-dot-store`
  正向控制。
- **证据**：`node --test tests/checks/note-scan.test.mjs` → 3/3 PASS；
  `node scripts/smoke/gates.e2e.mjs --case=…` → 3 注入 + 3 对照全绿；
  `node scripts/verify/verify.mjs --only=note-tree,note-format` → PASS；
  `pnpm test` → spec 1342/1342 + checks 114/114；`pnpm verify` 全绿。
- **反证**：①旧实现围栏证据 PASS → 现红；②旧实现围栏引用 FAIL → 现绿；③旧实现隐藏 `.md` 双 PASS → 现红。
