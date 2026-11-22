---
status: 排查中
severity: P2
opened: 2026-11-22
---

# BUG-365：0 字节的 final/v1.md 让终稿页签显示空白——已交付报告被读成空

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/final-empty-verdict.json` + `final-empty.png`；
> 夹具 = `runtime/e2e/final-empty-e2e.mjs`。

## 症状

已交付的 `final/v1.md` 是 0 字节（生产者截断/写坏），`delivered.json` 与 present 仍说已交付。
打开状态页点「读终稿 →」：

```text
审计版 · v1    （正文空白，只剩页脚“还不满意？三种改法……”）
```

终稿页签把空正文当成正常内容渲染，没有「终稿为空/读取失败」提示；用户看到一份空白报告，
状态页却仍显示「✅ 已交付」。

## 证据

seed 已交付 run，把 `final/v1.md` 写成空文件，真浏览器点「读终稿 →」。verdict
（`runtime/e2e/final-empty-verdict.json`）：

```json
{
  "face": "bound",
  "deliveredBadge": true,
  "emptyFinalShown": true,
  "failureShown": false,
  "finalText": "审计版 · v1过程 →还不满意？三种改法……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/final-empty-e2e.mjs
```

## 根因

`ResearchFinalTab.tsx` 的正文读取：

```ts
if (!body.ok) { setFailure(...); ... }
...
setText(body.value.text)
```

只判 `read.ok`（存在 + 可读），不判正文是否为空/纯空白。`text=''` 时：
`text === null` 为 false，正常渲染 `displayed=''`，没有空态/失败态。终稿页签没有“正文为空”
这个失败分支（只有 `finalUnreadable` / `finalReadFailed`）。

## 修法方向（未实施）

- 正文有效判定 = `body.ok && trim(text) !== ''`；空/纯空白终稿落独立空态（「终稿为空」+重试/
  查看版本账），不要渲染空白正文。
- 读者版为空时回退审计版（BUG-364）；审计版也为空 → 空态，不显示“已交付即可读”的假象。
- 不改“交付 = present/回执”的事实判定；本卡只让终稿页签不把空正文当内容。

## 修复判据

- `final/vN.md` 为 0 字节/纯空白 → 终稿页签显示明确空态（不是空白正文）；状态页的交付徽标
  可保留，但终稿入口点开必须能看出“终稿为空”。
- 非空终稿 → 正常渲染（正向不回退）。
- 缺失终稿 → 既有 `finalUnreadable` 错误态（负控不回退）。
- 红证：把空正文判定改回 `text !== null` → 本夹具再次出现空白正文，exit 1；还原后绿。
- guard 落点：`ResearchFinalTab` 的正文有效性纯函数/组件测试，或浏览器层用例（本 seed 夹具可升格）。
