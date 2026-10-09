// port-reclaim.mjs — 端口收割执行器（scripts/AGENTS.md「端口与临时路径自持有」的机械面）。
// 实测依据（2026-09-26/27，preset-smoke 出生现场）：web 服务进程不在 spawn 子进程的进程组里
// （SIGTERM / 整组 SIGKILL 都够不着——连跑三次实测，每次跑完端口仍被占、下一次冒烟直接
// EADDRINUSE），按**端口**收割才可靠；web 有 supervisor 式监听重建行为，杀完立刻验存在竞态
// 窗口——三轮"杀→等→验"，仍不干净才 fail-loud（一个只在单独运行时通过的脚本是脚本的缺陷）。
// 消费方：scripts/smoke/preset-smoke.mjs（boot 失败兜底 + 收尾双保险）、
// scripts/smoke/release-smoke.mjs（⑤ 安装域冒烟后的释放验证——preset-smoke 被外层超时击杀
// 时其 finally 不及跑，web 孙进程独立进程组会漏占端口）。
import { spawnSync } from 'node:child_process';

export const listenersOn = (port) => {
  const r = spawnSync('lsof', ['-t', '-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' });
  if (r.error !== undefined) return null; // lsof 缺席：降级为不校验（本仓目标平台在位）
  return r.stdout.split('\n').map((x) => x.trim()).filter(Boolean);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 返回 null = 端口已释放；非 null = 残留/降级描述（fail-loud 依据——lsof 缺席同样返回描述，
// 与 preset-smoke 既有语义一致：无法校验就不宣称已释放）。
export const reclaimPort = async (port) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const pids = listenersOn(port);
    if (pids === null) return `lsof 缺席，跳过端口 ${port} 收割校验（本机无 lsof）`;
    if (pids.length === 0) return null;
    for (const pid of pids) { try { process.kill(Number(pid), 'SIGKILL') } catch { /* 已死 */ } }
    await sleep(800);
  }
  const left = listenersOn(port);
  return left !== null && left.length > 0 ? `端口 ${port} 用后未释放（残留 pid ${left.join(',')}）` : null;
};
