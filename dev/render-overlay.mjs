// dev/render-overlay.mjs — 从 pack 渲染源码域 overlay（生成物，勿手改；`--check` 给门禁用）。
//
// 为什么需要生成：0.1.7 preset 重设计后，preset 的内容就是 patch 行本身（旧形态里角色内容
// 住在 presets/<role>/ 目录、overlay 只指路径）。源码域通道（preset-smoke 真挂载）用
// `--profile web --patch <本文件>` 迭代 preset，因此必须携带同样的 preset 行——为避免
// 「pack 一份、overlay 一份」两处漂移，overlay 由本脚本生成，门禁 `overlay-fresh` 对账。
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = join(ROOT, 'packages', 'deep-research-pack');
const OUT = join(ROOT, 'dev', 'research.overlay.yml');

/** 取每个 preset patch 文件 `- insert:` 之后的正文（缩进已 ≥4，可直接并入 overlay 的 insert 列表）。 */
function presetBodies() {
  const dir = join(PACK, 'presets');
  const parts = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.patch.yml')).sort()) {
    const lines = readFileSync(join(dir, f), 'utf8').split('\n').filter((l) => !l.startsWith('#'));
    const i = lines.findIndex((l) => l.trim() === '- insert:');
    if (i === -1) throw new Error(`${f}: 缺 "- insert:" 行`);
    const body = lines.slice(i + 1).join('\n').replace(/\s+$/, '');
    parts.push(`    # ── ${f}（由 dev/render-overlay.mjs 从 pack 渲染）──\n${body}`);
  }
  return parts.join('\n\n');
}

const rendered = `# 生成文件 —— 由 dev/render-overlay.mjs 从 packages/deep-research-pack 渲染；**勿手改**
# （门禁 overlay-fresh 对账：改 pack 后跑 \`node dev/render-overlay.mjs\` 重生成）。
#
# research.overlay.yml — 源码域 overlay（preset-smoke 真挂载用）
# 机制：\`--profile web --patch <本文件绝对路径>\` 在 profile 层之后追加本 overlay——行包名在
# vendor 源码工作区解析（boot 进程起自本仓，tsx/esm 从其 node_modules 解析），零安装混线。
# 0.1.7：preset 即行（config.plugins），web-app bundle 已 insert 出厂 registry（default:
# standard）与四个出厂 preset；本 overlay 把 registry 默认换成研究主编，并并入本包四个角色行。
- id: agent-preset-registry
  name: '@deepseek-ai/dsh-agent-preset-registry'
  config:
    default: lead

- insert:
${presetBodies()}

    # ── 交付物声明工具（base 无此行）──
    - id: tool-present
      name: '@deepseek-ai/dsh-tool-present'
    # ── 团队 Web 可视面（观察与调试任务起止；vendor 层无此行）──
    - id: ui-agent-team
      name: '@deepseek-ai/dsh-experimental-client-ui-agent-team'
`;

if (process.argv.includes('--check')) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current !== rendered) {
    console.error('overlay-fresh: dev/research.overlay.yml 与 pack 渲染结果不一致——跑 `node dev/render-overlay.mjs` 重生成');
    process.exit(1);
  }
  console.log('overlay-fresh: dev/research.overlay.yml 与 pack 一致');
  process.exit(0);
}
writeFileSync(OUT, rendered);
console.log(`已渲染 ${OUT}（${rendered.split('\n').length} 行）`);
