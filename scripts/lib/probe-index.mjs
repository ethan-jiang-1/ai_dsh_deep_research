// scripts/lib/probe-index.mjs — 探针索引的纯函数（扫描/解析/渲染）。
//
// 为什么存在：根 `probes/` 的目录清单是唯一事实源，但「有哪些、证明什么」需要一张可读索引；
// 手维护表一定会漂（company 的教训 = 手写清单漏项）。本件把「递归扫描目录 + 读头注 + 按域分组
// 渲染表格」做成纯函数，CLI（probes/_index.mjs）只负责 --write/--check；门禁（probe-registry）
// 只比较生成物与目录。索引不复制判据/不证明全文——那两段是头注的事实，索引只列一行摘要。
//
// 域 = 第一级子目录（behavior/ / browser/ / stream/ ...）；域内平铺 `<mechanism>-probe.mjs`。
// 头注协议（必填六字段）：状态 / 一句话 / 何时跑 / 档位 / 判据 / 不证明；
// `为什么存在` 推荐。字段解析只读首个匹配行；多行值不进入索引（避免第二份长文）。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** 头注必填字段（顺序即索引/门禁的报错顺序）。 */
export const REQUIRED_FIELDS = ['状态', '一句话', '何时跑', '档位', '判据', '不证明'];

/** 可选字段（推荐写，门禁不拦）。 */
export const OPTIONAL_FIELDS = ['为什么存在'];

/** 不是探针的目录内工具（索引与门禁都跳过）。 */
export const NON_PROBE_FILES = new Set(['_index.mjs']);

/** 没有域目录时的分组名。 */
export const UNGROUPED = '（未分组）';

const FIELD_RE = /^\/\/\s*(探针|状态|一句话|何时跑|档位|判据|不证明|为什么存在)\s*[:：]\s*(.*)$/;

/**
 * 递归列出探针文件（`*.mjs` / `*.cjs`，跳过任意层的 `_index.mjs`），返回相对 dir 的路径。
 * 目录不存在返回空数组；调用方决定防空语料怎么报。
 */
export function listProbeFiles(dir) {
  const rels = [];
  const walk = (current, prefix = '') => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        walk(join(current, entry.name), `${prefix}${entry.name}/`);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!/\.(?:mjs|cjs)$/.test(entry.name)) continue;
      if (NON_PROBE_FILES.has(entry.name)) continue;
      rels.push(`${prefix}${entry.name}`);
    }
  };
  walk(dir);
  return rels.sort();
}

/**
 * 从头注前 16 行解析字段。只取每个字段首次出现的行；返回扁平对象。
 * `探针` 字段是标题行（可选），其余见 REQUIRED_FIELDS / OPTIONAL_FIELDS。
 */
export function parseProbeHeader(text) {
  const fields = {};
  for (const line of String(text).split('\n').slice(0, 16)) {
    const match = FIELD_RE.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    if (!(key in fields)) fields[key] = value.trim();
  }
  return fields;
}

/** 返回缺失的必填字段（保持 REQUIRED_FIELDS 顺序）。 */
export function missingProbeFields(fields) {
  return REQUIRED_FIELDS.filter((key) => !fields[key]);
}

/** 域 = 相对路径第一段；没有子目录归 UNGROUPED。 */
export function domainOf(file) {
  const parts = String(file).split('/');
  return parts.length > 1 ? parts[0] : UNGROUPED;
}

/**
 * 渲染索引 Markdown。`entries` = [{ file, fields }]；按域分组、组内按文件名排序。
 * 只列一行摘要；表格管道转义，避免字段里的 `|` 破表。
 */
export function renderProbeIndex(entries) {
  const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').trim();
  const groups = new Map();
  for (const entry of entries) {
    const domain = domainOf(entry.file);
    if (!groups.has(domain)) groups.set(domain, []);
    groups.get(domain).push(entry);
  }
  const lines = [
    '# 探针索引（生成物，勿手改）',
    '',
    '> 生成器 = `probes/_index.mjs --write`；事实源 = 每支探针头注；本表只答「有哪些、在哪」。',
    '> 指南 = [../docs/guides/66-probe-playbook.md](../docs/guides/66-probe-playbook.md)。',
  ];
  for (const domain of [...groups.keys()].sort()) {
    const rows = groups.get(domain)
      .sort((a, b) => a.file.localeCompare(b.file))
      .map(({ file, fields }) => [
        `[${file.split('/').pop()}](${file})`,
        cell(fields['一句话']),
        cell(fields['档位']),
        cell(fields['何时跑']),
        cell(fields['状态']),
      ]);
    lines.push('', `## ${domain}/（${rows.length} 支）`, '', '| 探针 | 一句话 | 档位 | 何时跑 | 状态 |', '|---|---|---|---|---|');
    lines.push(...rows.map((row) => `| ${row.join(' | ')} |`));
  }
  lines.push('');
  return lines.join('\n');
}

/** 扫描目录并返回 [{ file, fields, text }]；目录为空返回 []。 */
export function scanProbeEntries(dir) {
  return listProbeFiles(dir).map((file) => {
    const text = readFileSync(join(dir, file), 'utf8');
    return { file, text, fields: parseProbeHeader(text) };
  });
}
