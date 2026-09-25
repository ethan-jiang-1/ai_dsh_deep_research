// vendor-artifacts.mjs — vendor 构建产物自检（boot 面护栏；共享模块，五个 boot 入口共用）。
//
// 为什么存在（RFC vendor-build-guard，2026-09-25 升 pin 实测）：0.1.7 起启动依赖构建产物，
// 缺失时报错**极其隐晦**——typert 面：`typert-loader: N contributors failed to register …
// Cannot find module …/lib/typert.host.js`；client 面：`client-modules: 51 client packages
// failed to compose: client bundle not found` / `Plugin client-hmr — Missing services:
// clientModules`。本模块把"深处隐晦失败"提前成"boot 前一行 remedy"。
//
// 范围纪律：这是 **boot 面护栏，不是 L0 门禁**——verify.mjs 刻意不依赖构建产物（新 clone /
// CI 未构建时 L0 仍应秒级绿）；本检查只在"真正要起 web"的时刻拦（boot-run.sh 与四个冒烟/
// 探针脚本的 boot 前）。代表产物只取两类（0.1.7 实测的两种失败面），不做全量扫描——全量
// 是 vendor-build.sh 的职责，这里只求"缺失时必拦 + 在位时不误报"。
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 代表产物（换 pin 后若上游包改名，这里随升 pin 重校更新——两处都选了机制上稳定的包）：
export const REPRESENTATIVE_ARTIFACTS = [
  {
    rel: 'packages/goal/goal/lib/typert.host.js',
    why: 'typert host 面（goal 是 24 个 typert 贡献包之一）',
  },
  {
    rel: 'packages/client/ui-sidebar-right/lib/client.js',
    why: 'client 面 bundle（ui-sidebar-right = 右栏页签宿主，观察面依赖）',
  },
];

/** 自检：root 下 vendor/dsh 的代表构建产物是否在位。返回 { ok, missing }——纯 fs，keyless。 */
export function assertVendorArtifacts(root) {
  const missing = [];
  for (const { rel } of REPRESENTATIVE_ARTIFACTS) {
    if (!existsSync(join(root, 'vendor', 'dsh', rel))) missing.push(rel);
  }
  return { ok: missing.length === 0, missing };
}

/** 一行 remedy（boot 面失败消息用它，指引升 pin 固定动作）。 */
export const ARTIFACT_REMEDY =
  'vendor 构建产物缺失——先跑 `bash dev/vendor-build.sh --clean`（升 pin 固定动作，见 docs/guides/60-dev-loop.md §3）';

// CLI 模式：node scripts/lib/vendor-artifacts.mjs [root]——缺失即打印 remedy 并 exit 1
// （boot-run.sh 用；root 缺省 = 本仓根）。判据：只认 process.argv[1] 指向本文件。
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === join(process.argv[1])) {
  const root = process.argv[2] ?? join(fileURLToPath(new URL('../..', import.meta.url)));
  const { ok, missing } = assertVendorArtifacts(root);
  if (!ok) {
    console.error(`boot 前自检红：vendor 构建产物缺失（${missing.join('、')}）`);
    console.error(ARTIFACT_REMEDY);
    process.exit(1);
  }
  console.log('boot 前自检绿：vendor 构建产物在位');
}
