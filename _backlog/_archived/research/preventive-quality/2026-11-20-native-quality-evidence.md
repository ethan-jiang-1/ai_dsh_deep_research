---
topic: preventive-quality-native-evidence
intent: 将两组 FAQ 的关键质量主张回查到本仓 pinned DSH 源码和测试，并区分上游机制、本仓集成、建议与本轮执行证据。
---

# 预防性质量：原生机制与本仓证据边界

## 范围与版本

本材料按题目要求通读本机 `_faq_on_digested/30_schemastery-basics/` 与 `_faq_on_digested/31_preset-quality/` 下的 Markdown；FAQ 是调查入口，以下机制以本仓 `vendor/dsh` 源码和测试为准。只做静态阅读，没有运行测试、真模型、录制/刷新、浏览器或服务。

本仓 pinned DSH 是 `b830ec950faba0a46dda564be3e2d854afed94f1`（`dsh-v0.2.1-rc.5`）；全局安装相同版本字符串不证明同一源码。FAQ 基线记录的提交 `62adbb04417f` 不在 pinned vendor 的可用 Git 对象中，因此不能据此做完整提交差异结论。对照外部 FAQ checkout 与 pin 时，所抽取的 13 个关键实现/测试文件字节相同；这只说明抽查文件相同，不证明整个 checkout 或所有 FAQ 结论等价。

细粒度源码链接使用与[本地 pinned submodule](../../../../vendor/dsh)相同提交的上游路径；查证实际读取本地源码，不依赖远端页面可访问。

## Schema 与生命周期

Schemastery 是运行时解析器，不等同于 TypeScript 类型、工具 JSON Schema 或跨操作业务不变量。[pinned Schemastery](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/vendor/schemastery/src/index.ts) 显示 required 检查先于 default；[对象与字典解析](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/vendor/schemastery/src/index.ts) 默认保留未知对象字段，字典 key 可被改写；[union/transform](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/vendor/schemastery/src/index.ts) 按分支顺序首个成功返回，非 preserve transform 会分别对解析值与 adapted 输入调用 callback，可能有副作用或写回。故 schema 约束输入的一部分，不会自动提供回滚、跨入口互斥或领域正确性。

`.volatile()` 也不是通用热替换。[Schemastery volatile 路径限制](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/vendor/schemastery/src/index.ts) 拒绝动态容器中的 volatile 字段；[Cordis Config 解析](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/vendor/cordis/src/fiber.ts) 通过 Standard Schema 校验同步配置并在问题时失败。[Loader Entry](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/vendor/loader/src/config/entry.ts) 对候选配置先跑内部 config hook 与解析，再提交 volatile 引用；不合法候选不替换运行引用，普通有效值变化仍走生命周期更新。提交引用后通知监听者，监听失败不构成回滚。原生 [Loader 测试](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/scripts/loader-volatile-update.spec.ts) 覆盖引用身份、多引用先提交再通知、实例隔离、非法候选和混合更新重挂；[Settings profile 测试](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/packages/settings/settings/tests/configuration.spec.ts) 另覆盖持久化/重启、无效编辑不写盘、高层覆盖拒绝、并发与旧 revision。它们证明各自所有者的配置行为，不给任意插件或任意副作用以全树事务保证。

配置 JSON Schema 投影主动说明其边界：[生成文档注释](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/packages/boot/app-boot/src/config-schema/document.ts) 将表达式结果、服务依赖、启动检查与序列相关 patch 留给运行时校验，并给出 `complete` 诊断；[union 反例测试](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/packages/boot/app-boot/tests/schemastery-json-schema.spec.ts) 验证投影不执行 transform 且对输入写回差异放宽并报告限制。可解析或 schema complete 不能替代真实 Loader 装配。

Preset registry 在注册时 eager activate，并以自身 scope 持有 generation；[实现](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/packages/preset/agent-preset-registry/src/index.ts) 和 [mount 审计](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/packages/preset/agent-preset-registry/src/mount.ts) 检查 enabled 行的启动、失败与服务泄漏，Host 服务晚到可重审；**disabled 行跳过审计**。所以“roster 有条目”“没有 broken”都不等于所有声明能力实际存在。按 ID 选择还会保留 live revision；[registry 测试](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/packages/preset/agent-preset-registry/tests/registry.spec.ts) 覆盖组合隔离、旧代保留和坏定义失败。

## 精确能力、请求快照与回放

Pinned DSH 有真实 composition 的精确能力断言，不只是启动成功：[Web preset e2e](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/apps/cli/tests/web-agent-presets.e2e.ts) 对 standard 工具名集合精确比较（明确排除依赖机器 ripgrep 的 `glob`/`grep`），并对 minimal 的 prompt sections、工具集合及服务投影做精确断言。这证明被测 shipped composition 的可观察能力；它不是通用评分，也不证明模型会正确选工具。

Pinned agent loop 在真实请求前记录完整 `request/header`（配置与 tool schemas），冻结消息并从同一 admitted surface 构造请求：[请求构造](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/packages/core/agent-loop/src/agent.ts)。Pinned session snapshot 会比对完整 prompt/schema，并拒绝 `UNKNOWN_TOOL`；[suite](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/packages/test-support/session-snapshot/src/suite.ts) 与 [header/prompt/workspace 比较](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/packages/test-support/session-snapshot/src/suite.ts) 可证伪相对已审基线的漂移。Replay 固定已有 Assistant stream，但当前程序仍执行工具；因此能验证当前组合/执行与记录轨迹相容，不让模型重新决定新任务。Record 会调用 live LLM；refresh 重跑固定模型输出并生成可比较结果，二者都是 fixture 写入，不能自我授予正确性；独立期望仍需审阅。

本仓已有回放 B：[`snapshots/README.md`](../../../../snapshots/README.md) 声明 persona、全部 request/header、注入面等基线；[比较器](../../../../checks/lib/shared/replay-request.mjs) 对 headers 中工具 schema 与确定性输入做结构/逐字比较，覆盖未登记注入种类会 fail-loud。它证明“当前请求相对录制输入有无漂移”，不是“录制工具全集符合独立角色设计”。本仓 [preset 冒烟](../../../../checks/smoke/preset.e2e.mjs) 检查 roster/create 身份和精确 skills，没有按角色精确比较工具集合；[静态 preset 测试](../../../../tests/pack/scripts/presets.spec.mjs) 检查声明文本，不是运行后的有效工具集。应避免把两类断言混为一谈。

## Workspace oracle：原生有，本仓未接入

Pinned DSH 快照支持场景声明 `workspace.final: true`，用 `workspace.expected/` 与回放后完整工作区比较；文本、二进制、符号链接和空目录均有稳定表示，[workspace 捕获器](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/packages/test-support/session-snapshot/src/workspace.ts)。快照套件要求 mutating 场景的终态匹配 expected，否则要求工作区不变；[比较点](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/packages/test-support/session-snapshot/src/suite.ts)。[存储规则](https://github.com/deepseek-ai/deepseek-harness/blob/b830ec950fab/snapshots/AGENTS.md) 明确 record/refresh 不改写独立 expected。它不比较所有文件系统元数据，也不因此判定研究内容的领域质量。

本仓自己的 [`snapshots/README.md`](../../../../snapshots/README.md) 把 workspace 终态列为“设计稿，未实施”，并明确当前 fixture 钉请求面与收尾文本、不钉 run 后世界。现有 [回放入口](../../../../checks/smoke/snapshot-replay.entry.mjs) 创建研究 workspace、驱动 prompt 并比较 A/B；没有最终工作区捕获和独立 expected 消费。因此不能把上游 `workspace.expected` 能力算作本仓现成防线。若场景没有终态文件承诺，不必增加 workspace oracle；若需要它，expected 应独立维护且刷新不可覆盖。

## 质量主张、限制与建议

本仓已拥有发现/回归分层、类级守卫和负控纪律： [测试策略](../../../../docs/guides/67-test-strategy.md) 要求按失败类选择最低可见层、正反判据；[类级守卫方法](../../../methods/class-level-guards.md) 要求明确变体族与邻接负控。调查显示，规则存在不保证新 Module 复用其实现或性质；登记资产/快照也不保证 oracle 独立，需看真实断言是否读取了所声称的事实。

建议按承诺选择资产，而非再叠一套普遍门禁：状态/生命周期问题由拥有操作集中校验和提交，并用独立状态模型及跨真实调用者测试；角色能力承诺可从真实组合取有效工具集，再与独立期望精确比较；交付终态承诺才引入独立 workspace oracle；模型行为改变仍需配对任务或真模型证据。每种资产都需要至少一个目标负控。Schema、回放、e2e 和真模型各自只回答有限问题，不能承诺零缺陷。

FAQ 中关于 eager preset activation、精确 shipped 工具断言、独立 workspace oracle 的说法由 pinned 实现/测试支持；若将它们表述为“本仓已经有”，则需收窄：前两项是 pinned DSH 的可用机制/范例，workspace oracle 在本仓回放尚未实现。另，[本仓冒烟注释](../../../../checks/smoke/preset.e2e.mjs)称建 session 才触发 preset config 校验，与 pinned registry 注册时 eager activation 不一致；该注释不应作为选择测试层的当前机制依据。本轮没有据此修改文件。
