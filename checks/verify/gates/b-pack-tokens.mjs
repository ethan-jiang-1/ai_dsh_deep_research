// b-pack-tokens.mjs — Domain B · 驾驶舱 token 与 CSS 纪律门禁（从 b-pack.mjs 拆出以守住 550 行上限）。
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, PACK, fail, note, walkMany } from '../context.mjs';

const PHANTOM_DSH_RE = /var\(\s*(--dsh-(?:border|surface|text|accent|bg|color)[a-z0-9-]*)\b/g;
const RAW_HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const DSW_VAR_USE_RE = /var\(\s*(--dsw-[a-z0-9-]+)\b/g;
const CSS_DECL_RE = /(--(?:dsw|ds|dsh)-[a-z0-9-]+)\s*:/g;
const TOKEN_EXEMPT_MARKER = /token-exempt:/;

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (match) => '\n'.repeat((match.match(/\n/g) ?? []).length))
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function collectKnownDswTokens() {
  const stylesDir = join(ROOT, 'vendor', 'dsh', 'packages', 'client', 'ui-theme', 'src', 'styles');
  if (!existsSync(stylesDir)) return null;
  /** @type {Set<string>} */
  const known = new Set();
  for (const name of readdirSync(stylesDir)) {
    if (!name.endsWith('.css')) continue;
    const raw = readFileSync(join(stylesDir, name), 'utf8');
    for (const match of raw.matchAll(CSS_DECL_RE)) known.add(match[1]);
  }
  return known.size > 0 ? known : null;
}

/**
 * ── client-tokens（禁止裸 hex 颜色、幽灵 --dsh-* 变量与未声明的 --dsw-* 变量）──
 * 正本：vendor/dsh/packages/client/ui-theme/src/styles/*.css。
 * 反证：在 src/client/ 写入 `#ff0000` / `var(--dsh-border)` / `var(--dsw-alias-label-error)` → 本门禁必红；
 * gates.e2e 常驻案例 = `client-tokens-raw-hex`、`client-tokens-phantom-dsh-var`。
 * 注：vendor ui-theme 缺席时（如 gates.e2e 隔离副本），记 note 并继续扫描裸 hex 与幽灵变量。
 */
export function runClientTokens() {
  const gate = 'client-tokens';
  const clientDir = join(PACK, 'src', 'client');
  const graphModelPath = join(PACK, 'src', 'lib', 'plan', 'graph-model.ts');
  const files = walkMany([clientDir]).filter((f) => /\.(?:ts|tsx|css)$/.test(f));
  if (existsSync(graphModelPath)) files.push(graphModelPath);

  if (files.length === 0) {
    fail(gate, '未扫描到任何 src/client/ 或 graph-model.ts 文件（防空集失效）');
    return;
  }

  const knownDsw = collectKnownDswTokens();
  if (knownDsw === null) {
    note(gate, 'vendor/dsh/packages/client/ui-theme 缺席（隔离副本）——跳过 live ui-theme 声明集核对，仅检查裸 hex 与幽灵变量');
  }

  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file);
    const lines = raw.split('\n');
    const stripped = stripComments(raw);
    const strippedLines = stripped.split('\n');

    strippedLines.forEach((line, idx) => {
      if (TOKEN_EXEMPT_MARKER.test(lines[idx] ?? '')) return;

      for (const m of line.matchAll(PHANTOM_DSH_RE)) {
        fail(gate, `${rel}:${idx + 1}: 幽灵 DSH 变量 ${m[1]}（真实主题变量为 --dsw-alias-*，见 vendor/dsh/docs/web-styling.zh.md）`);
      }

      for (const m of line.matchAll(RAW_HEX_RE)) {
        fail(gate, `${rel}:${idx + 1}: 禁止硬编码 hex 颜色 ${m[0]}，请改用 --dsw-alias-*（若确需例外，同注释标 /* token-exempt: <原因> */）`);
      }

      for (const m of line.matchAll(DSW_VAR_USE_RE)) {
        const token = m[1];
        if (knownDsw !== null) {
          if (!knownDsw.has(token)) {
            fail(gate, `${rel}:${idx + 1}: 未在 ui-theme 中声明的变量 ${token}`);
          }
        } else if (token === '--dsw-alias-label-error') {
          fail(gate, `${rel}:${idx + 1}: 幽灵变量 ${token}（应为 --dsw-alias-state-error-primary）`);
        }
      }
    });
  }
}
