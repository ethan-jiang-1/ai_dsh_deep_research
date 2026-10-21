---
status: 已结
opened: 2026-10-21
---

# 推敲：方法库管理迁到主界面

> 立卡：2026-10-21 ｜ 状态：已结 ｜ 类型：设计 ｜ 结论倾向：现在做（主 tab/W1 已落地）
>
> 用户 2026-10-21 定调：管理不该继续塞在窄侧栏；放到主界面（Chat/Trajectory 旁）编辑更容易。

## 问题

「研究配置」右栏同时承担本次研究摘要、内置参考、库管理、领域示范、术语与回执；12 条自测
例库把管理对象埋在一屏长卡里。要编辑一条偏好必须先滚过参考内容，再进窄列 Modal；管理动作
与观察/run 动作混在一起，入口重复。

## 决定

- 新增主界面 `conversation.view` 第三 tab「方法库」：我的库搜索/列表、内置参考只读、四字段
  编辑/新建/删除、Markdown 预览；全宽、Chat/Trajectory 同排。
- 保存走 **W1**：表单生成规范化指令 → `session/prompt` 交当前会话 Lead 写 `method-library.md`；
  面板不直写文件、不新增写权限；按钮文案「交给 Lead 保存」+ 回读提示。
- 侧栏「研究配置」只留本次研究摘要（采用/来源/换一条，五态如实）+「方法库」入口；库管理/
  内置卡/领域示范/术语/管理回执移入主 tab。旧管理块保留 `COMPACT=false` 回滚分支，默认不渲染。
- 旧格式条目编辑只改四字段，指令显式附「保留旧格式正文」；内置参考只读。
- 不做通用文件写 API、不引入 nested Team、不改 NODES 八节点契约、不加数值 floor。

## 依据

- DSH seam：`conversation.view` list slot（Chat/Trajectory 同款）；`workspaceFiles` 无 write。
- 研究记录：[method-library-main-surface](../../research/2026-10-21-method-library-main-surface.md)
- 构成正本：[docs/design/40](../../../docs/design/40-research-cockpit.md)

## 实现

- 新 [MethodLibraryView.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryView.tsx)；
  [index.ts](../../../packages/deep-research-pack/src/client/index.ts) 注册；[keys.ts](../../../packages/deep-research-pack/src/client/keys.ts)
  `METHOD_LIBRARY_VIEW`；package.json 增加 ui-conversation 客户端依赖。
- [library-fold.ts](../../../packages/deep-research-pack/src/lib/library-fold.ts) 加 `saveInstruction` /
  `renderLibraryEntry` / `renderLibrary`；[ResearchConfigTab.tsx](../../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx)
  `COMPACT` 只渲染摘要 + 入口。
- 测试：[library-fold 测试](../../../tests/cockpit/library-fold.test.mjs) + `client-load-smoke` 的
  方法库 tab/编辑/新建/内置参考断言与侧栏管理区负例。

## 验收标准

- 主 tab 在 Chat/Trajectory 旁一次可达；我的库/内置参考/新建/编辑/删除结构在场。
- 编辑四字段 + 保存按钮明确「交给 Lead」；取消不发送；旧格式正文有保留提示。
- 侧栏不再渲染库列表/内置卡/领域示范/术语/管理回执；只留本次研究摘要 + 方法库入口。
- `pnpm typecheck` / `pnpm build` / `pnpm verify` / `pnpm test` / `client-load-smoke` 全绿；
  pack 种子与 run profile 同步。

验证：主 tab/编辑/新建/内置参考与侧栏负例均 in client-load；library-fold keyless 全绿。
