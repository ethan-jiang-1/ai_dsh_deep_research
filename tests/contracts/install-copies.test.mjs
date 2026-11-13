// install-copies — live install docs keep the canonical order and never install the
// team layer by @latest.
//
// Why: the manual is the install-contract owner, while README / pack README carry the
// user and package quickstarts. They are allowed to duplicate the commands only if the
// critical order is identical: profile bootstrap -> pack -> team layer. This guard makes
// a reordered or @latest copy red before a release.
//
// Red recipe: move the profile bootstrap after a plugin add, or change a team-layer
// command to @latest -> red; restore -> green.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const docs = [
  'README.md',
  'packages/deep-research-pack/README.md',
  'packages/deep-research-pack/README.zh.md',
  'scripts/dist/product-manual.md',
  '_dist/安装手册.md',
];
const PROFILE = /--from-default-profile\s+web\s+--dump-default-config/;
const PACK_ADD = /dsh plugin --profile deep-research add\s+(?:file:|"?dsh-deep-research-pack@)/;
const TEAM_ADD = /dsh plugin --profile deep-research add\s+"?@deepseek-ai\/dsh-experimental-agent-team-profile@/;
const LATEST_CMD = /^[ \t]*dsh plugin --profile deep-research add[^\n]*@latest/m;

test('live install docs: profile bootstrap before pack add, pack before team layer', () => {
  for (const rel of docs) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    const profile = text.search(PROFILE);
    const pack = text.search(PACK_ADD);
    const team = text.search(TEAM_ADD);
    assert.ok(profile >= 0, `${rel}: 缺 --from-default-profile web --dump-default-config`);
    assert.ok(pack > profile, `${rel}: pack add 不在 profile bootstrap 之后`);
    assert.ok(team > pack, `${rel}: 团队层不在 pack add 之后`);
    assert.doesNotMatch(text, LATEST_CMD, `${rel}: 出现 @latest 安装命令`);
  }
});
