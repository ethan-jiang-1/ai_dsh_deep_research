#!/usr/bin/env node
// run-dashboard — M2 run 只读观察面（RFC：notes/implemented/2026-09-24-m2-run-dashboard.md
// + debug-dashboard-plus：notes/implemented/2026-09-24-debug-dashboard-plus.md）的 CLI 壳：
// 纯管线（解析→场景→模型→渲染，全 fail-soft）住 scripts/lib/run-dashboard-core.mjs
// （2026-10-13 下沉——tests 消费纯函数不再 import CLI 入口），本件只管参数、watch 循环、输出写盘。
//
// 用法：
//   node --import tsx/esm scripts/run-ops/run-dashboard.mjs <runDir> [--out <html>]          一次性生成
//   node --import tsx/esm scripts/run-ops/run-dashboard.mjs --latest [--out <html>]          多场扫描取最新（SCENE_ROOTS）
//   加 --watch --interval <秒> 持续再生成（配合页面 meta refresh；默认 5s）
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { listScenes, sceneState, buildModel, deriveStep, detectHitlWait, readGuiBase, renderHtml } from '../lib/run-dashboard-core.mjs';

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
    console.error('用法: run-dashboard.mjs <runDir> [--out <html>] [--watch] [--interval <s>] | --latest [--out <html>]（多场扫描）');
    process.exit(1);
  }
  const generate = () => {
    const scenes = listScenes();
    const dir = latest ? (scenes[0]?.dir ?? null) : runDir;
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
      console.error(`run-dashboard: 写 ${out}（run: ${model.slug}${dir ? '' : '，等待 lead 建 drt_<slug>/'}${model.hitlWait.length ? '，HITL 等待 ×' + model.hitlWait.length : ''}）`);
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
