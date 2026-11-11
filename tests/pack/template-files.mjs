// tests/pack/template-files.mjs —— run bundle 模板集的读取缝（非 spec，不进入发现面）。
//
// 为什么单独成文件：`content-injection` 要证“模板随包”，`content-coverage` 要枚举“模板被消费”；
// 两处各写一份文件清单就会漂移。这里把**schema 集**与**盘上集**分开：
//   - `CORE_TEMPLATES` = run bundle 的模板契约（新增 = 有意改 schema，不是自动长出来）；
//   - `templateFiles()` = 盘上事实（两边对账，新增/删除都红）。
// 这不是“覆盖清单”：它只拥有 run 模板这一组 schema 实例；其他内容资产由各自的盘上枚举守卫。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PACK } from './preset-helpers.mjs';

export const TEMPLATES_DIR = join(PACK, 'content', 'templates', 'run');

/** run bundle 模板 schema 集：8 个 md 骨架 + 3 个 JSON 写者契约（protocol/claims/verdicts）。 */
export const CORE_TEMPLATES = [
  'claims.json',
  'evidence-entry.md',
  'final.md',
  'findings.md',
  'leads.md',
  'plan.md',
  'protocol.json',
  'question.md',
  'run.md',
  'topics.md',
  'verdicts.json',
];

/** 盘上模板文件（字典序；只收 md/json，目录不混入）。 */
export function templateFiles() {
  return readdirSync(TEMPLATES_DIR)
    .filter((name) => /\.(md|json)$/.test(name))
    .sort();
}

/** 读一个模板的正文。 */
export function templateText(name) {
  return readFileSync(join(TEMPLATES_DIR, name), 'utf8');
}
