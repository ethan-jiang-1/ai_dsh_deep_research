// roles.mjs — 角色清单的单一事实源访问器（基础整治 §3.2）。
// 事实源 = 盘上 packages/deep-research-pack/presets/ 目录本身；任何消费点不得
// 再硬编码角色清单（verify 门禁 role-list-sync 咬单行 ≥3 角色名与 [...] 数组块）。
// 零依赖（本脚本只用 Node 标准库；"不引入 npm 依赖"的旧原则已随 tsx/构建链废弃——
// 见 AGENTS.md §偏离登记簿伴随行）。
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/** 枚举 pack 盘上角色（0.1.7：presets/<role>.patch.yml 即一个角色；结构由 verify preset-structure 咬），字典序。 */
export const presetRoles = (root) => readdirSync(join(root, 'packages', 'deep-research-pack', 'presets'))
  .filter((f) => f.endsWith('.patch.yml'))
  .map((f) => f.replace(/\.patch\.yml$/, ''))
  .filter((n) => /^[a-z0-9][a-z0-9-]*$/.test(n))
  .sort();

/** 非研究角色（方法库页共创；不进 run 生命周期，也不作 subagent 候选）。 */
const NON_RESEARCH_ROLES = new Set(['method-editor'])

/** 研究角色（D2 的四角色）——凡断言 run 生命周期/工具面（web/subagent/录制面）的消费点用它，
 *  别把方法编辑算进研究面。presetRoles 仍是「盘上全部 preset」的唯一事实源。 */
export const researchRoles = (root) => presetRoles(root).filter((role) => !NON_RESEARCH_ROLES.has(role))
