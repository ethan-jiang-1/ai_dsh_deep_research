// tests/pack/handbook-surface.mjs —— T0 手册 + generic 按需细则的读取缝（非 spec）。
//
// 为什么单独成文件：manual 是可生长 T0，细则会按 design/70 的缝下放到 `content/generic/`；
// 断言“手册必须说某件事”的测试若只读 manual.md，会在下放后假红。这里把 T0 + generic 视为同一个
// “模型可见手册面”，顺序 = T0 在前、generic 字典序在后；只被需要的 spec import，不进入发现面。
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PACK } from './preset-helpers.mjs';

const MANUAL = join(PACK, 'content', 'manual.md');
const GENERIC = join(PACK, 'content', 'generic');

/** 手册面 = manual.md + content/generic/*.md（按需细则）；generic 缺席时退化为 T0。 */
export function handbookSurface() {
  const parts = [readFileSync(MANUAL, 'utf8')];
  if (existsSync(GENERIC)) {
    for (const name of readdirSync(GENERIC).filter((entry) => entry.endsWith('.md')).sort()) {
      parts.push(readFileSync(join(GENERIC, name), 'utf8'));
    }
  }
  return parts.join('\n\n');
}

/** 只读 T0（断言常驻面预算/指针时用，不混入 generic）。 */
export function manualT0() {
  return readFileSync(MANUAL, 'utf8');
}

/** 盘上 generic 文件（字典序；不存在 = 空）。 */
export function genericFiles() {
  if (!existsSync(GENERIC)) return [];
  return readdirSync(GENERIC).filter((entry) => entry.endsWith('.md')).sort();
}
