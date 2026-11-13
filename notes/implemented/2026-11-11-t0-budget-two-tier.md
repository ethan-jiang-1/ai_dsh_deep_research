# T0 常驻面预算：触发 10,000 / 硬顶 12,288 双档单源

> 状态：implemented

## 决定

`content/manual.md` 的常驻面预算按两级合同落：下放触发 `10,000` 由
`tests/pack/content-disclosure.spec.mjs` 把守；失控硬顶 `12,288` 由 `content-shape` 门禁把守。
两个数只住 `scripts/lib/content-budget.mjs`，测试与门禁各自 import。

文档同步为当前读数：manual 9,996；触发余 4；硬顶余 2,292。`docs/design/70` 的
12,038 / 12,288 旧读数删除；`docs/evaluation.md` 的 `content-shape` 行写明两档。

## 输掉的方案

- **统一到 10,000**：硬顶余量变成不可达，等于把 12,288 的历史上限作废；首刀后只剩 4 字符，
  任何编辑都直接红，触发与硬顶的区分消失。
- **统一到 12,288**：10,000 的“该下放了”触发没有执行面，回到诊断前的双数字歧义。
- **保留两处字面量、只改文案**：下一次改一处仍会漂移；测试/门禁各写一份数字就是这次的 gap。

## 实际跑过的验证

- `node -e` 读 manual → `length 9996`；`node --test tests/pack/content-disclosure.spec.mjs` → pass。
- `node scripts/verify/verify.mjs` → 全绿（`content-shape` 用硬顶常量）。
- `pnpm test` → 全绿（navigability 的 lib 表消费列对账包含 `content-budget`）。

## 环境状态

macOS；Node 22.23.1；pnpm 11.7.0。工作树改动未提交、未 push。
