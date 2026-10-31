---
topic: plugin-as-product
intent: 把产品首屏起步卡/工作区指示/凭据提示写成可实现的 client 规格（slot、数据源、文案、测试）
---

# 首屏体验实现规格：起步卡、工作区指示与凭据提示

本文是[产品首屏体验](../../issues/2026-11-01-product-first-run-ux.md)的技术支撑。目标不是做皮肤，而是让用户在空白会话里知道"这是什么、从哪开始、当前工作区、看哪里"。

## 1. 现有 slot 与已注册面

| slot | kind/scope | 现状 | 本卡用法 |
|---|---|---|---|
| `sidebar.brand.mark` / `sidebar.brand.name` | single/root | 包内已注册 Orca 品牌（`src/client/index.ts:139-145`） | 不动 |
| `conversation.hero.brand.mark` | single/root | vendor 空位（包未占用） | 可用 Orca mark；但侧栏已有品牌，P0 不必重复 |
| `conversation.hero.workspace` | single/root | vendor workspace picker；显示当前 Workspace 标题 | 不替换；起步卡引用其值 |
| `conversation.hero.agentPreset` | single/session-maybe | vendor preset 控制；产品 profile 默认 `lead` 时显示 "Deep Research Lead" | 不动；验收断言它 |
| `conversation.hero.options` | list/session | vendor 紧凑选项 | 可放"研究提示"小 chip（P1） |
| `conversation.input.dock` | list/session | vendor 全宽 dock（GoalBar/TodoPanel 用） | **起步卡放这里** |
| `sidebar.right.pane` | list/session | 包的四个右栏页签 | 不动；卡片只指路 |

`conversation.input.dock` 的注册形态参考 `packages/client/ui-goal/src/client/index.ts:102-103`、`packages/client/ui-conversation/src/client/skeleton/TodoPanel.tsx:116-117`：

```ts
ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
  name: 'conversation.input.dock',
  id: 'deep-research-start',
  order: 10,
  locale: 'deepResearchPack',
}, StartCard))
```

组件类型 = `PropsRuntime<'conversation.input.dock'> & PropsLocale<'deepResearchPack'>`；实际可用的 session/workspace props 以 vendor 类型为准（`PropsRuntime` 给出 session 上下文）。不要自己在组件里读 `location`/`process`。

## 2. 组件与数据

`src/client/StartCard.tsx`（新文件）：

```tsx
export function StartCard(props: StartCardProps) {
  const sessionId = props.sessionId            // 以 vendor PropsRuntime 实际字段为准
  const files = useWorkspaceFiles(sessionId)   // 已有 readFile/listDir 通道
  const workspace = useCurrentWorkspace(sessionId)
  const hasRun = files.some(f => f.name.startsWith('drt_'))  // 根目录 list
  const hasUserMessage = useHasUserMessage(sessionId)        // session.follow snapshot
  if (hasRun || hasUserMessage) return null
  return <Card ... />
}
```

数据源（全部已有）：

- `remote.workspaceFiles.list(sessionId, '')`：根目录列表，判断 `drt_*`（`MethodLibraryView.tsx:630-645` 同款）。
- `sessions`/`workspaces` 服务：当前 Session 的 workspace membership / 标题（`client/index.ts` 已 inject `sessions`, `workspaces`）。
- `remote.session.follow`：判断 Session 是否有 `user/message`（已有 follow 实现）。
- `locale.bind('deepResearchPack')`：文案。

不新增：

- 不新增 localStorage/storage domain/自定义 session event（`data-plane-invariants`）。
- 不新增模型可见文本（卡片是 Client 渲染，不进请求）。
- 不读 `$DSH_HOME`/launch env（Client 无该权限）。

## 3. 收起逻辑

```text
if (workspace files root has any entry starting with 'drt_') → hide
if (session history has any user/message) → hide
if (session is subagent / non-main) → hide
else → show
```

- 不用"已看过"标记；用户每次回到空白工作区都会看到起步卡（可接受；比 localStorage 干净）。
- 首屏加载时 workspaceFiles 可能慢：先渲染骨架/空，不闪红；`list` 失败时仍显示卡片（工作区可能新建）。
- 用户发出第一条消息后，`user/message` 到达 → 卡片消失；不需要手动关闭。
- 若工作区有 `drt_*`（继续研究），卡片不显示；右栏「研究状态」已有入口。

## 4. 文案（zh/en 示例）

中文：

```text
Deep Research · 一支多角色研究团队
当前工作区：<workspace title/path>

① 直接问一个研究问题——Lead 会先确认三件事：研究类型 / 深度与篇幅 / 时间口径与语言。
② 确认计划后，团队在后台工作；右栏「研究状态」看进度与等你拍板的问询。
③ 交付后，右栏「终稿」读读者版；需要审计源时切换。

凭据：有 DEEPSEEK_API_KEY 时搜索/抓取回退完整；只有 DeepSeek 账号登录也能开始（搜索可用、抓取回退降级为本地）。
```

英文同步；文案键加进 `src/client/locales.ts` 与 `DeepResearchPackLocaleKey`。

## 5. 工作区可见性/切换

- 卡片顶部显示**当前工作区**（标题 + 路径；标题来自 vendor workspace picker / `workspaces` 服务）。
- 提供一行"换工作区"提示：指向 hero/sidebar 的 vendor workspace picker（不自己造 picker）。
- P0 不比较"启动工作区 vs 当前工作区"：Client 没有 launch env。**可见指示 + vendor picker** 满足"用户能看到自己在哪、能切换"。
- P1 若要做到"启动工作区不匹配"的精确提示，需要 Host 暴露 launch 状态（Remote 或 URL 参数）；不在 P0 承诺。父卡/子卡 D 的验收措辞已按此收窄。

## 6. 凭据提示

- 不读取/展示 key 值；不判断"有没有 key"的精确状态（Client 没有 credentials 面）。
- 静态一句：账号登录也可用；key 影响搜索/回退能力。避免"未配置 = 错误"的红错。
- 如果未来 Client 能读 model catalog，可把提示改成动态；P1。

## 7. 与右栏页签的关系

- 卡片只给入口名："研究状态"（进度/问询）、"终稿"（交付）；不复制页签内部说明。
- 交付后自动开终稿已有行为，不重复实现。
- 卡片不抢右栏；`conversation.input.dock` 在 composer 上方，宽度随聊天列。

## 8. 测试

真浏览器（复用 `client-load-smoke` 的 `loadChromium`/`launchChromium`）：

1. 新 home + 空工作区 + pack profile：首屏有 Orca、当前工作区、三步文案、凭据提示、Lead preset、composer；无 pageerror。
2. 工作区预置一个 `drt_probe/`：卡片不出现；右栏「研究状态」仍可用。
3. 发一条消息（或注入 fixture user/message）：卡片消失。
4. 中英 locale 切换：文案都在。
5. 工作区文件 list 失败：卡片仍显示，不红错。
6. 断言没有 localStorage 写入（检查 `page.evaluate(() => localStorage)` 只含 vendor 键，不含产品新键）。

现有 `client-load-smoke` 的断言清单可扩；`product-boot-smoke` 复用同一浏览器 harness。

## 9. 边界与风险

- `conversation.input.dock` 是 session-scoped list；卡片在 subagent/非主会话要隐藏，避免队员会话也显示。
- `remote.workspaceFiles` 根 = session header.cwd；如果 Session 不在启动工作区，卡片显示的是实际 cwd，这正是"可见指示"。
- 首屏 workspaceFiles 慢时不要阻塞 composer；卡片可以后到。
- 文案可能增加模型上下文？不会：Client 渲染不进请求；`data-plane-invariants` 的模型可见面不受影响。
- 皮肤/主题不在本卡；Orca 品牌已存在，不新做视觉系统。
