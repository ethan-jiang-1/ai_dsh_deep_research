// b-pack-lint.mjs — Domain B · pack `src/` oxlint gate（从 b-pack.mjs 拆出以守住 550 行上限）。
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, PACK, fail, note } from '../context.mjs';

/**
 * ── pack-lint（oxlint correctness + react-hooks + no-shadow + eqeqeq —— 停损边界只扫 pack src）──
 * 反证：在 pack src 任意文件写 shadowed 变量或删 hook 依赖 → `pnpm lint` / `pnpm verify --only=pack-lint` 红；
 * 删去 .oxlintrc.json → gates.e2e `pack-lint-missing-config` 必红。node_modules 缺席时记 note（gates.e2e 副本不含 node_modules）。
 */
export function runPackLint() {
  const gate = 'pack-lint';
  const configPath = join(ROOT, '.oxlintrc.json');
  if (!existsSync(configPath)) {
    fail(gate, '.oxlintrc.json 缺席（pack oxlint 配置正本）');
    return;
  }
  const oxlintBin = join(ROOT, 'node_modules', 'oxlint', 'bin', 'oxlint');
  if (!existsSync(oxlintBin)) {
    note(gate, 'node_modules/oxlint 缺席（未装依赖或隔离副本）——跳过 live lint');
    return;
  }
  const r = spawnSync(process.execPath, [oxlintBin, join(PACK, 'src')], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    const detail = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.trim().split('\n').slice(0, 12).join('\n');
    fail(gate, `oxlint 检查失败（exit ${String(r.status)}）：\n${detail}`);
  }
}
