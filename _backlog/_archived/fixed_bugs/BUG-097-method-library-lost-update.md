---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-097：method-library 写工具读-改-写无锁——两个 method-editor 会话并发保存会 lost update

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 方法库读-改-写加跨进程锁，并发写明确冲突不丢条目（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/method-library-tool.ts`（三个 execute 的
> `readLibrary(path) → upsert/setDefault/remove → writeFileSync(path)`）。

## 症状

三个方法库写工具都是「读全文 → 改 → 覆盖写」，没有文件锁、没有 revision/compare-and-swap。
两个 Method Editor 会话（`coach-sessions.ts` 每个 draftKey 一个确定性 `method-coach-*` 会话，
不同草稿/标签页可并存）并发保存时：

```text
A 读 base；B 读 base；
A 写 {方法A}；B 写 {方法B}（基于旧 base）
→ 最终只有 {方法B}，方法A 丢失
```

纯函数交错模拟：

```json
{
  "aTextEntries": ["方法A"],
  "bTextEntries": ["方法B"],
  "finalEntries": ["方法B"],
  "lostA": true,
  "note": "host tool read/upsert/write has no lock or compare-and-swap"
}
```

两个 UI 操作队列各自都会收到自己那次写入的成功回执（A 的回读发生在 B 覆盖前），
用户不知道 A 已被覆盖。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/method-library-lost-update.mjs
```

（交错由脚本显式排序；host 工具的三个 execute 读/写没有互斥或版本比较，见源码。）

## 影响与触发面

- 同一工作区两个 Method Editor 会话/标签页并发保存：后写覆盖先写，无冲突提示；
- `method_library_upsert` 的写后回读只与自己的 expected 比，不检测「我读之后别人改过」；
- `method_library_set_default` / `remove` 同样读-改-写，可能回退别人刚写的条目/默认；
- 操作队列的「一次一个写」只限单个客户端会话，不跨会话/不跨标签页。

## 根因（已证）

- 没有锁文件/租约；没有文件 revision 或 compare-and-swap；
- `readLibrary` 与 `writeFileSync` 之间无冲突检测；
- claim/projection 只保证「本会话 UI 操作 ↔ 本会话工具调用」，不保证工作区文件单一写者。

## 修法候选（未实施）

1. 写前读 revision/内容摘要，写时 compare-and-swap（不匹配即拒绝并提示冲突）；
2. 或对 `method-library.md` 加工作区级文件锁/租约（超时释放）；
3. 或强制单 Method Editor 会话写者（其它会话只读），但会改变多草稿体验。

倾向 1（最小、无锁可移植）；本卡不改代码。

## 修复判据

- [ ] 两个写者交错时，后写者检测到前写并拒绝/合并，不静默丢条目；
- [ ] 单写者正常路径行为不变；写后回读/默认唯一性判据不回归；
- [ ] 复现脚本按所选修法给出冲突，而非最终只剩 B；
- [ ] 新增 keyless/集成用例先红后绿；`pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 UI 一定同时开两个 Method Editor（机制上可并存）；
- 不证明锁/租约在 NFS/网络盘的行为；不证明 `writeFileSync` 的原子性（见其它卡）。

## 已落地（2026-11-13）

- 证据 = `tests/pack/method-library-io.test.mjs` 锁/串行 mutate。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
