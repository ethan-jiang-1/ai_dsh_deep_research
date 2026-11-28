---
title: DSH Cordis 插件组合与白名单裁剪机制
source_url: https://github.com/deepseek-ai/dsh
retrieved_at: 2026-11-28
quality: A
found_by: scout-1
supports: T1
lens: official
source_tier: primary
publisher: github.com
---

# DSH Cordis 插件组合与白名单裁剪机制

> 通过 `cordis.patch.yml` 的 `disabled: true` 与 `isolate` 隔离域，外部组合包可在不修改宿主内核的前提下，精准裁剪出厂面板并装配多角色预设与独立客户端槽位。

- 组合层采用声明式覆写：后置 bundle 层按行 `id` 精准关闭非研究面（如 Trajectory 与 Terminal），避免任何 CSS 隐藏补丁。
- 全部前端扩展点（侧栏、工具卡、命令、触发器、快捷键）均要求包裹 `scoped.effect`，卸载与热更新时自动收回贡献。

## Question List（本 topic）
- [x] 是否查验了一手声明式 patch 与 `scoped.effect` 合同？
- [x] 是否核对了隔离域（`isolate`）对 worker 工具面的限制边界？
