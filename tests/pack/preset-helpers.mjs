// tests/pack/preset-helpers.mjs — preset YAML 的读取缝（非 spec，不进入默认测试发现面）。
//
// 为什么单独成文件：preset 是 `!!js` 表达式 + `config.plugins` 嵌套结构的 YAML；把 schema 与
// group 展开逻辑各抄一份，抄错一次测试就会静默少看一半行。参照 company 仓 tests/presets/preset-yaml.ts：
// 模型（期望）住测试，观测从同一份解析器出来。
//
// 不是测试：文件名不带 `.spec.mjs`，`pnpm test` 的递归 glob 不会选中本文件。
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACK = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages', 'deep-research-pack');
const PRESETS = join(PACK, 'presets');
const WORKERS = join(PACK, 'workers');

const yaml = createRequire(join(PACK, '..', '..', 'vendor', 'dsh', 'package.json'))('js-yaml');
// DSH preset 用 `!!js` 表达式；测试只把它当字符串，不求值。
const SCHEMA = yaml.DEFAULT_SCHEMA.extend([
  new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: (data) => data }),
]);

/** 盘上角色清单（单一事实源 = presets/*.patch.yml；workers/ 不计入角色）。 */
export function presetRoles() {
  return readdirSync(PRESETS)
    .filter((name) => name.endsWith('.patch.yml'))
    .map((name) => name.replace(/\.patch\.yml$/, ''))
    .sort();
}

/** 盘上 worker profile 清单（D47；非研究角色，单独目录）。 */
export function workerPresets() {
  try {
    return readdirSync(WORKERS)
      .filter((name) => name.endsWith('.patch.yml'))
      .map((name) => name.replace(/\.patch\.yml$/, ''))
      .sort();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

/** 递归展开 group 行：`config` 是数组时才是子行（普通行的 config 对象不展开）。 */
function flattenPlugins(plugins) {
  const out = [];
  const walk = (rows) => {
    for (const row of rows) {
      out.push(row);
      if (Array.isArray(row.config)) walk(row.config);
    }
  };
  walk(plugins);
  return out;
}

/** 按行 id 找一行（含 group 子行）。 */
export function rowById(rows, id) {
  return rows.find((row) => row?.id === id);
}

/** 读一个 worker profile（workers/<id>.patch.yml）。 */
export function loadWorker(id) {
  const raw = readFileSync(join(WORKERS, `${id}.patch.yml`), 'utf8');
  const docs = yaml.load(raw, { schema: SCHEMA });
  const row = docs?.[0]?.insert?.find((item) => item?.name === '@deepseek-ai/dsh-agent-preset');
  if (row === undefined) throw new Error(`${id}: 缺 @deepseek-ai/dsh-agent-preset 行`);
  const plugins = row?.config?.plugins;
  if (!Array.isArray(plugins)) throw new Error(`${id}: config.plugins 不是数组`);
  return { role: id, raw, plugins, rows: flattenPlugins(plugins) };
}

/** 读一个 preset，返回 config.plugins 与展开后的全部行。 */
export function loadPreset(role) {
  const raw = readFileSync(join(PRESETS, `${role}.patch.yml`), 'utf8');
  const docs = yaml.load(raw, { schema: SCHEMA });
  const row = docs?.[0]?.insert?.find((item) => item?.name === '@deepseek-ai/dsh-agent-preset');
  if (row === undefined) throw new Error(`${role}: 缺 @deepseek-ai/dsh-agent-preset 行`);
  const plugins = row?.config?.plugins;
  if (!Array.isArray(plugins)) throw new Error(`${role}: config.plugins 不是数组`);
  return {
    role,
    raw,
    plugins,
    rows: flattenPlugins(plugins),
  };
}

/** 一个角色自己的 skill 目录名（盘上事实，字典序）。 */
export function skillsOf(role) {
  const dir = join(PRESETS, role, 'skills');
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}
