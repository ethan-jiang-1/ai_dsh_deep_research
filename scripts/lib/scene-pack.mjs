// scene-pack.mjs — 场景包（scene-capture 产物）的读取与列示纯函数（2026-10-21 卫生轮）。
//
// 为什么存在（六维卫生评审维度6 高项）：scene-capture 只管「抓」——抓完的场景包此前全仓
// 零消费者（grep 实证；runtime/README 目录表也没登记 scenes/），「看见当时页面」的闭环缺
// 读取半边（抓了只能人肉逐文件开；"三天前页面坏了"零存量可看）。本模块收读取半边：
// CLI 壳 = scene-capture 的 --list / --show 子命令；keyless 契约测试钉住
// （tests/run/scene-pack.test.mjs——缺件与坏 meta 不静默）。
// 场景包形态（写盘正本 = scene-capture.mjs）：page.png / page.html / body.txt /
// console.txt / meta.json（url 已脱敏 / at / screenshot / consoleProblems / exceptions）。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

/** 场景包五件套（与 scene-capture 写盘契约同清单；测试消费防漂移）。 */
export const PACK_FILES = ['page.png', 'page.html', 'body.txt', 'console.txt', 'meta.json'];

/**
 * 读单个场景包 → 概要。
 * 缺件如实标记 `present:false`（不装在场）；meta.json 不可解析 = `meta:null` + `metaError`
 * 带原因（不静默吞）；目录缺席 = null（CLI 壳负责 fail-loud 提示，纯函数不猜）。
 * @returns {{name:string, mtime:number, files:Object, meta:Object|null, metaError:string|null,
 *   consoleProblems:number|null, exceptions:number|null}|null}
 */
export function readScenePack(dir) {
  if (!existsSync(dir)) return null;
  const files = {};
  for (const f of PACK_FILES) {
    const p = join(dir, f);
    files[f] = existsSync(p) ? { present: true, bytes: statSync(p).size } : { present: false };
  }
  let meta = null;
  let metaError = null;
  if (files['meta.json'].present) {
    try {
      meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
    } catch (error) {
      metaError = String(error?.message ?? error);
    }
  }
  return {
    name: basename(dir),
    mtime: statSync(dir).mtimeMs,
    files,
    meta,
    metaError,
    consoleProblems: Array.isArray(meta?.consoleProblems) ? meta.consoleProblems.length : null,
    exceptions: Array.isArray(meta?.exceptions) ? meta.exceptions.length : null,
  };
}

/**
 * 扫描场景包根目录 → 概要列表（mtime 降序——最新现场先看；散件与点目录跳过）。
 * 根目录缺席 = 空数组（调用方区分「没抓过」与「抓了但空」由 CLI 壳提示承担）。
 */
export function listScenePacks(root) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const ent of readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
    out.push(readScenePack(join(root, ent.name)));
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}
