---
status: 修复就绪
severity: P2
opened: 2026-11-23
---

# BUG-372：配置页把 question.md 读失败说成「文件不在/被移走」

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：修复就绪 — P0 复跑仍红；根因证据见下；批 observation-residuals-369-376。
> 现场 = `runtime/e2e/config-question-unreadable-verdict.json` + `config-question-unreadable.png`；
> 夹具 = `runtime/e2e/config-question-unreadable-e2e.mjs`。

## 症状

绑定 run 的 `question.md` 在场但读不到。打开「研究配置」页签，「本次研究」区显示：

```text
本会话有研究目录，但里面的 question.md 不在——可能还没立项完成，或文件被移走了。
```

同一会话的「研究状态」页签（已修复）会显示「question.md 读取失败」；配置页却把读失败
说成文件不在，用户会以为问题文件丢了。

## 分诊与授权

- 严重级：P2 — 观察面把工件/派生的读失败、空、冲突折成良性态，用户会把旧内容/缺失当正常。
- 表面 / 边界：pack client（驾驶舱观察面）/ 真浏览器；本批跨 status/final/graph/config 四个页签。
- DSH 不变量：fail-loud — 文件在场但读不到/为空/冲突必须与缺席分开，并给出可行动提示。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-23 用户 goal 放行。
- 批：`observation-residuals-369-376`。

## 批

`observation-residuals-369-376` — 同批卡：369/370/371/372/373/374/375/376；批计划：[观察面残余与跨面事实一致性修复程序](../issues/2026-11-23-observation-residuals-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-23 复跑仍红）。

```sh
node --import tsx/esm runtime/e2e/config-question-unreadable-e2e.mjs
```

## 证据

seed 已交付 run 的 `question.md` 设为不可读，真浏览器打开研究配置页签。verdict
（`runtime/e2e/config-question-unreadable-verdict.json`）：

```json
{
  "paneOpened": true,
  "failureShown": false,
  "paneText": "…… 本次研究 本会话有研究目录，但里面的 question.md 不在——可能还没立项完成，或文件被移走了。 ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/config-question-unreadable-e2e.mjs
```

## 根因

`useConfigFeed` 的 adoption 读取：

```ts
const text = await view.read('question.md', { signal })
const adoption = foldMethodAdoption(text?.ok ? text.value.text : null, {
  bundle: true,
  question: view.hasFile('question.md'),
})
```

`!read.ok` 与「文件缺席」都落 `text=null`；`hasFile` 仍 true，`foldMethodAdoption` 得到
“bundle 在但 question 文本不在”，UI 文案就是「不在/被移走」。这里没有 `read` 失败的独立状态，
也没有复用状态页的 `readArtifact`/问题读取态。

**P0 根因证据（2026-11-23）**：P0 复跑 `config-question-unreadable-e2e.mjs`：截图「本次研究」区显示「本会话有研究目录，但里面的 question.md 不在——可能还没立项完成，或文件被移走了。」，`failureShown:false`；`useConfigFeed` 的 `const text = hasQuestion ? await view.read(...) : null` 把 `!ok` 与 absent 都落 `null`，`foldMethodAdoption` 只看 `question` 在场标志。

## 修法方向（未实施）

- adoption 读取改用 `readArtifact('question.md')`（或同源问题读取态）：区分 absent / empty /
  unreadable；`unreadable/empty` 显示「研究问题读取失败/为空」+ 重试，不显示「不在/被移走」。
- 复用状态页的 question 失败文案与 `retry`，避免两个页签各写一套。
- 保留 question.md 确实缺席 = 尚未立项完成（负控）。

## 修复判据

- question.md 在场但不可读 → 配置页显示「研究问题读取失败」+ 重试；不出现「不在/被移走」。
- question.md 为 0 字节 → 显示「研究问题为空」（或同状态页），不显示「不在」。
- question.md 确实缺席 → 仍显示「不在/可能还没立项完成」（负控）。
- question.md 可读 → adoption 正常（正向不回退）。
- 红证：把 `text?.ok` 分支改回 `null` → 本夹具再次出现「不在」，exit 1；还原后绿。
- guard 落点：`useConfigFeed` 的 adoption question 三态矩阵，或浏览器层用例。
