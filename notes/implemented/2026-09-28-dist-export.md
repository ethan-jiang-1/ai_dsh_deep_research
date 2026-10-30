> 状态：implemented

# dist 导出（tarball + 安装手册 → `_dist/`）

## 决定

pack 的对外交付通道 = 一条命令导出自包含 tarball + 中文安装手册：

```sh
node scripts/dist/export-dist.mjs
```

精神移植自参考仓 `ai_dsh_architect`（外部材料，其正本 = 该仓 `docs/distribution.md` 与
`scripts/export-dist.mjs`）的四条合同，按本仓裁剪：

1. **一条命令出完整交付**：`npm pack`（与 `release-smoke` 每轮证明的同一条调用，cache 钉进
   scratch——工具态纪律）→ inventory 在导出的产物本体上重申发布边界（必备条目 / 四 preset 行 /
   skills 与模板随包 / 无 `package/` 之外的条目）→ 写安装手册到 `_dist/`。
2. **手册是生成物，不是手写物**：版本、日期、条目数在导出时注入，手册与旁边的 tarball 不能
   漂移；正文每一步走 `release-smoke` 验证过的路径（add → dump-config 四个挂载标记 →
   scaffold 铺工作区 → preflight → 起会话 → 卸载）。
3. **`_dist/` 是导出目的地，不是源**：`.gitignore` 用 `_dist/*` + `!_dist/安装手册.md`——
   tarball 是导出产物不进库（`.tgz` 置底段本来就挡），手册是唯一 tracked 例外（tracked
   生成物先例 = pack 的 `workspace/` 种子）。
4. **版本一致性机械化**：新 L0 门禁 `dist-manual-version` 断言手册表头版本 = pack
   `package.json` 版本且表头指名当前 tarball 文件名——版本 bump 不重导出即红，迫使两者同 diff。
   导出不是发布：不动版本、不发 registry；pack 已 `private: false`（2026-10-25 开源发布，
   见 [open-source-launch](2026-10-25-open-source-launch.md)），npm 发布动作归维护者账号。

## 输掉的方案

- **手工拼手册 + 手动 `npm pack`**：正是参考仓立此合同前要治的病——手册与产物各改各的，
  步骤靠记忆，无门禁可拦。
- **把 tarball 提交进 `_dist/`**：二进制产物入库只增历史不增信息，且与 `secrets-untracked`
  对 `.tgz` 的既有立场冲突；gitignored、一条命令可再生。
- **门禁只查版本号、顺带查 tarball 文件名**：表头版本对而文件名指错（改名/版本半截 bump）
  是同一"手册漂移"病的另一形态，同一位正本（表头）可机械对账，一并钉住。

## 验证

- 首跑导出全绿：`npm pack` 产 `dsh-deep-research-pack-0.1.0.tgz`，inventory 68 条目
  （preset 行 4、skill 6、模板 6），手册写入。
- 门禁反证：把 `_dist/安装手册.md` 表头版本注入 `9.9.9` → `dist-manual-version` 红
  （点名版本 ≠ pack 版本与修正入口）→ 还原绿；删手册 → 红（tracked 生成物必须在库）→ 重导出绿。
