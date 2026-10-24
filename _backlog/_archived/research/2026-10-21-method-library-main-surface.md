---
topic: 方法库管理迁到主界面
intent: 记录 conversation.view seam、UX 分工与 W1 保存决定
---

# 方法库管理迁到主界面：seam、UX 与 W1 保存

> 主题：研究方法偏好库（`method-library.md`）的管理界面从右栏窄页签迁到主界面
> `conversation.view` tab。消费者：[_backlog/_archived/settled_issues/2026-10-21-method-library-main-surface.md](../settled_issues/2026-10-21-method-library-main-surface.md)
> ｜ 构成正本：`docs/design/40-research-cockpit.md`

## 问题

「研究配置」右栏同时承担本次研究摘要、内置打法参考、我的库管理、领域示范、术语与回执；
12 条自测例库把管理对象埋在一屏长卡里。用户要编辑一条偏好，需要先滚过参考内容，再进入
窄列 Modal；管理动作与观察/run 动作混在一起，入口重复且难找。

## Seam 证据（DSH 0.2.1-rc.2）

- `conversation.view` 是 **session-scoped list slot**，Chat 与 Trajectory 都通过它注册：
  `vendor/dsh/packages/client/ui-conversation/src/client/contract/slots.ts`；
  `vendor/dsh/packages/client/ui-chat/src/client/apply.ts`；
  `vendor/dsh/packages/client/ui-trajectory/src/client/index.ts`。
- 因此第三个主 tab 不需要新 route / 新页面壳；全宽、就在 Chat/Trajectory 旁。
- `workspaceFiles` Remote 只有 `list/read/stat/changes`，**没有 write**：
  `vendor/dsh/packages/api/workspace-files/src/types.ts` + `client/remote.ts`。
  直接保存需要新 host 写权限；本轮不走。
- 备选面：`shell.overlay`（全屏 Modal）与 `settings.section`（Settings 页），都原生；一个多一层
  模态、一个不在对话旁，均不如 tab。

## 决定

- 主 tab = 「方法库」：我的库搜索/列表、内置参考只读、四字段编辑/新建/删除、Markdown 预览。
- 保存 = **W1**：表单生成规范化指令，经 `session/prompt` 交当前会话 Lead 写 `method-library.md`；
  面板不直写文件、不新增写权限。按钮文案明确「交给 Lead 保存」，成功后提示回读。
- 侧栏「研究配置」= 本次研究摘要（采用/来源/换一条，五态如实）+ 「方法库」入口；
  库管理/内置卡/领域示范/术语/管理回执移到主 tab（旧管理块保留在 `COMPACT=false` 回滚分支）。
- 内置打法只读；旧格式条目编辑时保留旧正文（表单只改四字段，指令附「保留旧格式正文」）。
- 不做通用文件写 API、不引入 nested Team、不改 NODES 八节点契约、不加数值 floor。

## 验证（2026-10-21）

- `library-fold` 新增 `saveInstruction` / `renderLibraryEntry` / round-trip keyless 测试。
- `pnpm typecheck` / `pnpm build` 通过；`pnpm test` / `pnpm verify` 全绿；`client-load-smoke`
  ALL PASS（主 tab、编辑/新建/内置参考、侧栏管理区负例均在场）。
- 浏览器走查：主 tab 在 Chat/Trajectory 旁，库列表/内置参考/编辑/新建可开；keyless 零发送。

## 已知限制

- 主 tab 只在 active conversation 出现：空白 New Session hero 没有 Chat/Trajectory/方法库
  view tabs；管理库需打开有历史的会话。后续可在 hero/左栏补入口。
- 保存是 W1 异步链路（Lead 写入后回读）；不做即时写盘。
