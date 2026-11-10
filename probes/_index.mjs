#!/usr/bin/env node
// 工具：探针索引生成/校验（不是探针，不进索引；门禁 probe-registry 消费 --check 的同一渲染）。
// 状态：常驻
// 用法：node probes/_index.mjs --write | --check
// 判据：--check 与目录不一致 exit 1；必填头注缺失 exit 1；目录缺席/参数错 exit 2。
// 为什么存在：手维护探针清单会漂（company 教训 = 手写清单漏 5 个入口）；索引必须是生成物，
// 头注是唯一事实源，门禁只比较字节。
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  missingProbeFields,
  renderProbeIndex,
  scanProbeEntries,
} from '../scripts/lib/probe-index.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'probes');
const INDEX = join(DIR, 'INDEX.generated.md');
const args = process.argv.slice(2);
const write = args.includes('--write');
const check = args.includes('--check');
const unknown = args.filter((arg) => arg !== '--write' && arg !== '--check');

if (!existsSync(DIR)) {
  console.error(`probe-index: 目录缺席 ${DIR}——根 probes/ 是探针的事实源`);
  process.exit(2);
}
if (unknown.length > 0 || write === check) {
  console.error('probe-index: 用法 = node probes/_index.mjs --write | --check（二选一）');
  process.exit(2);
}

const entries = scanProbeEntries(DIR);
if (entries.length === 0) {
  console.error('probe-index: 扫到 0 支探针——防空语料（范围收窄不等于通过）');
  process.exit(1);
}
const missing = entries.flatMap(({ file, fields }) =>
  missingProbeFields(fields).map((field) => `${file} 缺「${field}」`));
if (missing.length > 0) {
  console.error(`probe-index: 头注必填字段缺失：\n  ${missing.join('\n  ')}`);
  console.error('修正 = 按 docs/guides/66-probe-playbook.md 的头注协议补字段');
  process.exit(1);
}

const expected = renderProbeIndex(entries);
if (write) {
  writeFileSync(INDEX, expected);
  console.log(`probe-index: 已写 ${INDEX}（${entries.length} 支）`);
  process.exit(0);
}

const actual = existsSync(INDEX) ? readFileSync(INDEX, 'utf8') : '';
if (actual !== expected) {
  console.error(`probe-index: ${INDEX} 与目录不一致——运行 node probes/_index.mjs --write（生成物勿手改）`);
  process.exit(1);
}
console.log(`probe-index: 一致（${entries.length} 支）`);
process.exit(0);
