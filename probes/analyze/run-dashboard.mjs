#!/usr/bin/env node
// 维护面：show（只读投影/诊断/取证；不判 PASS/FAIL）。规则 = docs/policy.md
// 状态：常驻
// 一句话：M2 run 只读 HTML 投影（步骤条 / HITL 等待横幅 / 归档标注；多场扫描）
// 何时跑：要看 run 进度或多场对比；给用户看现场
// 档位：keyless（只读 bundle 与会话日志；写抛弃型 HTML）
// 判据：不适用（show）
// 不证明：交付合格；HTML 永不入库、不是事实源
// run-dashboard — M2 run 只读观察面（RFC：notes/archived/2026-09-24-m2-run-dashboard.md
// + debug-dashboard-plus：notes/archived/2026-09-24-debug-dashboard-plus.md）的 CLI 壳：
// 纯管线（解析→场景→模型，全 fail-soft）住 checks/lib/analyze/run-dashboard-core.mjs；HTML 渲染 = checks/lib/analyze/run-dashboard-html.mjs
// （2026-10-13 下沉——tests 消费纯函数不再 import CLI 入口），本件只管参数、watch 循环、输出写盘。
//
// 用法：
//   node --import tsx/esm probes/analyze/run-dashboard.mjs <runDir> [--out <html>]          一次性生成
//   node --import tsx/esm probes/analyze/run-dashboard.mjs --latest [--out <html>]          多场扫描取最新（SCENE_ROOTS）
//   加 --watch --interval <秒> 持续再生成（配合页面 meta refresh；默认 5s）
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listScenes, sceneState, buildModel, deriveStep, detectHitlWait, readGuiBase, isArchivedScene, isParkedScene } from '../../checks/lib/analyze/run-dashboard-core.mjs';
import { renderHtml } from '../../checks/lib/analyze/run-dashboard-html.mjs';
import { isMain } from '../../checks/lib/shared/cli-entry.mjs';
import { usageError } from '../../checks/lib/shared/cli-exit.mjs';

// ── CLI ─────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args.splice(i, 2)[1] : null;
  };
  const out = flag('--out');
  const interval = Number(flag('--interval') ?? 5);
  const take = (name) => {
    const i = args.indexOf(name);
    if (i >= 0) args.splice(i, 1);
  };
  const watch = args.includes('--watch');
  take('--watch');
  const latest = args.includes('--latest');
  take('--latest');
  const runDir = args.find((a) => !a.startsWith('--'));
  if (!runDir && !latest) {
    usageError('用法: run-dashboard.mjs <runDir> [--out <html>] [--watch] [--interval <s>] | --latest [--out <html>]（多场扫描）');
  }
  const generate = () => {
    const scenes = listScenes();
    const dir = latest ? (scenes[0]?.dir ?? null) : runDir;
    // 桶标注（判据正本 = core isArchivedScene/isParkedScene）：全归档/停放态下 --latest 会把
    // 最新桶场当「当前 run」报——stdout 行加标记，防只看一行误读（D28）。
    const sceneMeta = dir !== null ? scenes.find((s) => resolve(s.dir) === resolve(dir)) : undefined;
    const archived = sceneMeta !== undefined && isArchivedScene(sceneMeta);
    const parked = sceneMeta !== undefined && isParkedScene(sceneMeta);
    const model = dir
      ? buildModel(dir)
      : { runDir: '(无 run)', slug: '未开始', generatedAt: new Date().toISOString(), missing: ['drt_<slug>/'], question: null, topics: [], evidence: [], leads: [], findings: [], review: null, final: null, journal: [], stats: { evidence: 0, drafts: 0, lastModified: null } };
    model.scenes = scenes.map((s) => ({ ...s, state: sceneState(s.dir) }));
    model.steps = deriveStep(model);
    model.hitlWait = detectHitlWait();
    model.silentZone = !model.hitlWait.length && scenes.some((s) => Date.now() - s.mtimeMs < 10 * 60 * 1000);
    model.guiBase = readGuiBase();
    const html = renderHtml(model);
    if (out) {
      writeFileSync(out, html);
      console.error(`run-dashboard: 写 ${out}（run: ${model.slug}${archived ? '（已归档——操作桶，不证明交付）' : parked ? '（停放——操作桶，不证明未交付/已交付）' : ''}${dir ? '' : '，等待 lead 建 drt_<slug>/'}${model.hitlWait.length ? '，HITL 等待 ×' + model.hitlWait.length : ''}）`);
    } else {
      process.stdout.write(html);
    }
  };
  generate();
  if (watch) {
    // 孤儿自退出（boot-run trap 的第二道保险：job_kill SIGKILL 掉父 shell 时，trap 不会跑，
    // 但父死后 ppid 变化 → 本进程 2s 内自行退出——2026-09-24 事故 ① 的机制化收尾）。
    const ppid = process.ppid;
    setInterval(() => {
      if (process.ppid !== ppid) process.exit(0);
    }, 2000);
    setInterval(generate, Math.max(1, interval) * 1000);
  }
}

if (isMain(import.meta.url)) main();
