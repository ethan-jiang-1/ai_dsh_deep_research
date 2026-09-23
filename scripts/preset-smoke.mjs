#!/usr/bin/env node
// preset-smoke.mjs — L1 真挂载冒烟（认证档：需 DSH_HOME + 已装 pack；真模型档另需 DEEPSEEK_API_KEY）。
// 定义：docs/evaluation.md §L1。为什么必须是真会话：ai_dsh_company postmortem 0001 实证
// preset 挂载失败只发生在 session/create（Loader 逐行校验 config schema），roster 扫描与
// --dump-config 都看不见，UI 吞错。dump/roster 可见 ≠ 挂载成功。
//
// 用法：
//   node scripts/preset-smoke.mjs                 # keyless 预检（环境/安装形状），不发模型请求
//   DSH_SMOKE_REAL=1 node scripts/preset-smoke.mjs # 真会话档：逐角色起会话发一条消息（需 key）
//
// R1 骨架说明：keyless 预检已实现；真会话档依赖 web/headless 启动细节（R2「preset-smoke 真跑」
// 队列条目落地——对照 company preset-smoke.mjs 的 boot 流程：boot web → roster → 逐角色
// session/create → 断言模块表）。本脚本 keyless 预检失败时给出精确修复指令。

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = join(ROOT, 'packages', 'deep-research-pack');
const ROLES = ['lead', 'scout', 'analyst', 'critic'];

let failed = false;
const step = (ok, label, hint) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) { failed = true; if (hint) console.log(`      → ${hint}`); }
};

// ── 预检 1：pack 文件面完整（这层 keyless 可判）──
step(existsSync(join(PACK, 'cordis.patch.yml')), 'pack: cordis.patch.yml 存在');
for (const r of ROLES) {
  step(
    existsSync(join(PACK, 'presets', r, 'preset.yml')) && existsSync(join(PACK, 'presets', r, 'agent.cordis.yml')),
    `pack: presets/${r} 三件套（yml 两件）`,
  );
  const skills = join(PACK, 'presets', r, 'skills');
  step(existsSync(skills) && readdirSync(skills).length > 0, `pack: presets/${r} skills 非空`);
}

// ── 预检 2：DSH_HOME 环境（真挂载的前提）──
const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
step(!!home, 'env: DSH_HOME 已设置（先 source dev/env.sh）', '未设置则冒烟只能停在 keyless 预检');

if (home) {
  // ── 预检 3：pack 已安装进 home（真实安装形状）──
  const installed = join(home, 'node_modules', 'dsh-deep-research-pack');
  step(existsSync(installed), `home: pack 已安装（${installed}）`,
    '安装：npm pack（在 packages/deep-research-pack）→ dsh plugin add <tarball>，见 guides/60');

  if (existsSync(installed)) {
    for (const r of ROLES) {
      step(
        existsSync(join(installed, 'presets', r, 'agent.cordis.yml')),
        `home: 安装形状含 presets/${r}`,
        'files 声明缺失预设目录 → 检查 package.json files 字段',
      );
    }
  }
}

// ── 真会话档（显式开启，需 key）──
if (process.env.DSH_SMOKE_REAL === '1') {
  const key = process.env.DEEPSEEK_API_KEY;
  step(!!key, 'env: DEEPSEEK_API_KEY（真模型档必需）');
  if (key && home) {
    // 逐角色一条消息的最小真挂载。dsh CLI 的会话子命令在 R2 按实际 CLI 面落地；
    // 这里保留占位流程：dsh --profile <profile> 起会话 → 断言响应非错误。
    console.log('note  真会话流程在 R2「preset-smoke 真跑」队列条目落地（boot 流程对照 company preset-smoke.mjs）');
  }
}

console.log(failed ? '\npreset-smoke: 预检未全绿（见上）' : '\npreset-smoke: 预检绿（真挂载档见 DSH_SMOKE_REAL=1）');
process.exit(failed ? 1 : 0);
