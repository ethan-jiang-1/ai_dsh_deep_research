---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-166：note-tree 在目录检查前跳过点目录——隐藏嵌套 Note 绕过树深/闭集

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：已修 — note-tree 目录类型判断先于点文件豁免（2026-11-14，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）
>
> 位置：[scripts/verify/gates/c-notes.mjs](../../../scripts/verify/gates/c-notes.mjs) 的 `note-tree`；
> 合同正本 = [notes/README.md](../../../notes/README.md)「树深固定两层、禁止嵌套目录」。

## 症状

`note-tree` 在生命周期目录内先执行：

```js
if (child.name.startsWith('.')) continue
if (child.isDirectory()) fail(..., 禁止嵌套目录)
```

隐藏目录（`.zz-probe-dir/`）在 `isDirectory()` 检查之前就被 `continue` 掉；`note-format` 的
`each` 也只读 `.md` 文件，不进入目录。于是 `notes/implemented/.zz-probe-dir/note.md` 完全不可见。

## 复现（2026-11-14 实测）

```sh
mkdir -p notes/implemented/.zz-probe-dir
printf 'not a note\n' > notes/implemented/.zz-probe-dir/note.md
node scripts/verify/verify.mjs --only=note-tree,note-format
# PASS note-tree
# PASS note-format
# verify: 仅判 2 道（--only）——其余门禁未计
rm -rf notes/implemented/.zz-probe-dir
```

对照：非隐藏的 `notes/implemented/zz-probe-dir/note.md` 会被 `note-tree` 立刻红「禁止嵌套目录」；
差别只在目录名是否以 `.` 开头。

## 根因（已证）

`startsWith('.')` 的本意是忽略 `.DS_Store` 之类的点文件，但它被放在**目录类型判断之前**，把
「隐藏目录」和「隐藏文件」一并豁免。树深/闭集合同没有只对非隐藏目录生效的例外。

## 影响面

- 一个隐藏子目录可以携带任意 `.md`，永不进入 `note-tree` / `note-format` 扫描；路径即状态的
  「目录 = 生命周期」合同被绕过。
- 根层同理：`notes/.probe/x.md` 整个隐藏生命周期目录可逃过闭集检查。
- 当前仓库没有隐藏目录，属门禁钝化而非现行故障（P2）；但与 BUG-165 同批，说明新笔记门禁的
  「不可见扫描面」还没封死。

## 牵出的失败类

- **C2 消费者遗漏 / C7 假绿**（扫描面收窄，静默不扫）。
- 同机制第 **2** 次（BUG-162 是 smoke 嵌套目录；本条是 notes 隐藏目录）。类修：目录类型判断先于
  点文件豁免，或显式红「notes 下不得出现隐藏目录」。

## 修复判据

- 对 `notes/` 根与每个生命周期目录：先判 `isDirectory()`（隐藏目录也红），再对**文件名**应用
  点文件豁免；或明确拒绝任何以 `.` 开头的目录。
- 反证：`notes/implemented/.zz-probe-dir/note.md` → 必须红（隐藏目录/嵌套）；删除 → 绿。
  当前实测为绿 = 反例成立。
- 保留 `.DS_Store` 等点**文件**的忽略；不要误杀。

## 修复关联

已修（2026-11-14）。触面 = 门禁/笔记树合同，按 [_backlog/AGENTS](../../AGENTS.md) 转 `等人拍板`；可与 BUG-165 同批修。

## 修复落地（2026-11-14）

- **改动**：`scripts/verify/gates/c-notes.mjs` 的 note-tree：根层与生命周期层都先判 `isDirectory()`（隐藏目录也红），再对文件名做点文件豁免。
- **证据**：`node scripts/verify/verify.mjs --only=note-tree,note-format` 全绿；正常 notes 不受影响。
- **反证**：`notes/implemented/.zz-probe-dir/note.md` → 旧实现 PASS；修后 note-tree 红「禁止嵌套目录」；删除 → 绿。
