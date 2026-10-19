#!/usr/bin/env node
// dev/run-kickoff.mjs — run 通道会话驱动（④ run-mechanics 的操作面，真模型档配套）。
// 对已在跑的 run 通道 web 做 session/create（+ 可选 session/prompt）——会话日志即真相，
// 本脚本不做研究断言。
//
// 两种模式：
//   · 开工（缺省）：session/create 建新会话（+ 可选送 kickoff 指令）；
//   · **续跑**（`--session <id>`）：**不新建**，把指令注入**既有会话**——中断恢复的操
//     作面（guides/61 §3：挂起/停摆的会话不会因通道重启消失，发恢复指令即唤醒；本模式
//     是该承诺的可复跑工具，等价于人在 GUI 里手打一句）。
//
// 用法：
//   node dev/run-kickoff.mjs --port 3083 --token <t> [--cwd <dir>] [--preset lead] [--prompt <text> | --prompt-file <f>]
//   node dev/run-kickoff.mjs --port 3083 --token <t> --session <id> (--prompt <text> | --prompt-file <f>)
// 输出：session id（stdout，一行）——后续日志核对/仪表盘观察用它定位。
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { readSessionText, resolveSessionLog } from '../scripts/lib/session-log.mjs';
import { reconcileInjectedMessage } from '../scripts/lib/inject-reconcile.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const port = flag('--port', process.env.DSH_RUN_PORT || '3083');
const token = flag('--token', null);
const cwd = flag('--cwd', resolve(ROOT, 'research-workspace'));
const preset = flag('--preset', 'lead');
const promptFile = flag('--prompt-file', null);
const resumeSessionId = flag('--session', null);
let prompt = flag('--prompt', null);
if (promptFile) prompt = readFileSync(resolve(process.cwd(), promptFile), 'utf8');
if (!token) {
  console.error('缺 --token（web 横幅里的 token）');
  process.exit(1);
}

const base = `http://127.0.0.1:${port}`;

// token → cookie（同 team-preflight-smoke 的 authenticate 形状）
const authRes = await fetch(`${base}/?token=${token}`, { redirect: 'manual' });
const cookies = [...authRes.headers.getSetCookie()];
if (cookies.length === 0) throw new Error('token 交换没拿到 cookie');
const cookie = cookies.map((c) => c.split(';')[0]).join('; ');

let rpcId = 0;
const rpc = async (endpoint, args_) => {
  const res = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `rk-${++rpcId}`, method: endpoint, payload: { args: args_ } }),
  });
  const body = await res.json();
  if (body?.result?.ok !== true) throw new Error(`${endpoint} 失败: ${JSON.stringify(body).slice(0, 300)}`);
  return body.result.value;
};

// 会话创建形态（2026-09-26 实测）：**workspaceId 与 cwd 二选一**（同传报 bad-request）。
// 走 workspaceId 才会把会话关联进该工作区（侧栏可见 + 服务端 reconciliation 认它）；
// cwd 形态建的会话不进侧栏、且 cwd 不在工作区内时手册不注入（agent-instructions 从 cwd
// 向上发现 AGENTS.md）。故：默认路径 = 找/建 research-workspace 的 workspaceId 再建会话；
// --cwd 显式指定时退回 cwd 形态（兼容旧用法，会在 stderr 提示副作用）。
// ── 续跑模式（--session）：不新建会话，只注入指令 ──
// 为什么必须有：文档承诺的恢复动作（向停摆会话发恢复指令）此前没有常驻工具，只能现场写临时脚本
// ——2026-10-11 实测正是这样唤醒了一场停摆的 run。承诺了动作却没有工具 = 动作不可复跑。
if (resumeSessionId !== null) {
  if (!prompt) {
    console.error('run-kickoff: 续跑模式（--session）必须给 --prompt 或 --prompt-file（没有要送的东西）');
    process.exit(2);
  }
  // 送达判据 = 会话日志里出现本条 user/message（同 cdp-probe：凡"向在飞会话注入输入"的工具，
  // 成功判据都对账 journal 落盘，而不是"RPC 返回 ok"——RPC ok 只证明服务端收下了请求）。
  const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
  if (home === null) {
    console.error('run-kickoff: 续跑模式要对账送达，需先 source dev/env.sh（DSH_HOME 缺席 → 无法定位会话日志）');
    process.exit(2);
  }
  const sessionsRoot = join(home, 'sessions');
  const sessionDir = existsSync(sessionsRoot)
    ? readdirSync(sessionsRoot).map((g) => join(sessionsRoot, g, resumeSessionId)).find((d) => existsSync(d)) ?? null
    : null;
  const logPath = sessionDir === null ? null : resolveSessionLog(sessionDir);
  const sinceMs = Date.now() - 1000;
  // 关闭挂起问询前的记账（BUG-041）：**续跑分支才是官方恢复路径**（`--session` 发自由文本关闭挂起），
  // ⚠ 2026-10-18 实测教训：本仓有**两个** session/prompt 站点（新建 / 续跑），接线一度落在新建分支 →
  // 恢复路径关单时静默不记账（连跳过原因都没打印）。记账只属于"续跑关挂起"这一支。
  const closing = await closingRowForPending(resumeSessionId)
  await rpc('session/prompt', { request: { requestId: randomUUID(), sessionId: resumeSessionId, mode: 'queue', content: [{ type: 'text', text: prompt }] } });
  console.error(`run-kickoff: prompt 已送入已存会话 ${String(resumeSessionId).slice(0, 8)}…（续跑）`)
  if (closing !== null) {
    try {
      const row = closingProvenanceRow({ cardKey: closing.cardKey, text: prompt, date: new Date().toISOString().slice(0, 10) })
      appendDecisionsRow({ bundle: closing.bundleDir, row, journalNote: `**挂起问询由操作侧自由文本关闭（记账行已落 §Decisions）**：${closing.cardKey}` })
      console.error(`run-kickoff: 关闭挂起的记账行已落 §Decisions（${closing.cardKey} → bundle ${closing.slug}）`)
    } catch (error) {
      console.error(`run-kickoff: ⚠ 记账行落地失败（${String(error).slice(0, 120)}）——请人工按记账纪律补记`)
    }
  }
  let landed = false;
  if (logPath === null) {
    console.error(`run-kickoff: ⚠ 找不到会话日志（会话 ${resumeSessionId.slice(0, 12)}… 不在 ${sessionsRoot} 下）——注入已发出但**未对账**`);
  } else {
    for (let i = 0; i < 8 && !landed; i++) {
      const text = readSessionText(logPath);
      if (text !== null && reconcileInjectedMessage({ events: text.split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((e) => e !== null), text: prompt, sinceMs }).landed) landed = true;
      if (!landed) await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.log(resumeSessionId);
  if (landed) {
    console.error(`run-kickoff: 已唤醒既有会话 ${resumeSessionId.slice(0, 12)}…（续跑模式，未新建会话；送达已对账 = 会话日志出现本条）`);
    process.exit(0);
  }
  console.error(`run-kickoff: 注入已发出但**送达未对账**（会话 ${resumeSessionId.slice(0, 12)}…）——`
    + '要么该会话已终局化（通道重启后的在飞会话回不到输入面），要么日志尾部尚未落盘；'
    + '请按 guides/61 §5 判断走"重跑通道 + 新会话"路径。');
  process.exit(1);
}

const workspacePath = resolve(ROOT, 'research-workspace');
let created;
if (cwd === workspacePath) {
  const ws = await rpc('workspace/create', { request: { path: workspacePath } });
  const workspaceId = ws?.workspace?.workspaceId ?? ws?.workspaceId;
  if (typeof workspaceId !== 'string') throw new Error(`拿不到 workspaceId：${JSON.stringify(ws).slice(0, 300)}`);
  created = await rpc('session/create', { request: { workspaceId, agentPreset: preset } });
  console.error(`run-kickoff: 会话建在 research-workspace（workspaceId=${workspaceId.slice(0, 8)}…，侧栏可见 + 手册注入）`);
} else {
  created = await rpc('session/create', { request: { cwd, agentPreset: preset } });
  console.error(`run-kickoff: --cwd 形态（${cwd}）——注意：该形态的会话不进侧栏；cwd 非研究工作区时手册不注入`);
}
const sessionId = created?.id ?? created?.sessionId;
if (typeof sessionId !== 'string') throw new Error(`无会话 id：${JSON.stringify(created).slice(0, 300)}`);
console.log(sessionId);

if (prompt) {
  // 关闭挂起问询前的记账（BUG-041，2026-10-18）：**这条恢复路径此前不落任何记账**——用自由文本
  // 关闭 HITL 卡之后，交付段 §Decisions 没有对应行，门②/门③ 如实判红而复盘看不出谁在何时答的。
  // 故先取"这条会话是否有挂起 + 挂起是哪张卡"，发送成功后按代驱记账纪律补一行（bundle 归属由
  // hitl-provenance 的既有谓词判定；归属不唯一就如实跳过并提示人工补记）。
  await rpc('session/prompt', {
    request: { requestId: randomUUID(), sessionId, mode: 'queue', content: [{ type: 'text', text: prompt }] },
  });
  console.error(`run-kickoff: prompt 已送入会话 ${sessionId.slice(0, 8)}…（cwd=${cwd}, preset=${preset}）`);
}

/**
 * 取"本会话是否有挂起 + 是哪张卡 + 归属 bundle"（BUG-041 记账用；无挂起/归属不唯一 → null，静默返回，
 * 由调用方决定是否提示）。判据源：会话日志事件（foldHitlPending）+ 末位 ask 的问题头（isDeliveryReviewCard）。
 */
async function closingRowForPending(sid) {
  try {
    const { readSessionEvents, resolveSessionLog, researchWorkspaceGroup } = await import('../scripts/lib/session-log.mjs')
    const { foldHitlPending } = await import('../packages/deep-research-pack/src/lib/hitl-fold.ts')
    const { parseAskQuestions } = await import('../scripts/lib/ask-drive.mjs')
    const { isDeliveryReviewCard } = await import('../scripts/lib/ask-drive.mjs')
    const { attributionBundleOf } = await import('../scripts/lib/hitl-provenance.mjs')
    const sessionsRoot = join(process.env.DSH_HOME ?? '', 'sessions')
    const group = researchWorkspaceGroup(sessionsRoot)
    if (group === undefined) { console.error('run-kickoff: 记账跳过——找不到 research-workspace 会话组'); return null }
    const logPath = resolveSessionLog(join(sessionsRoot, group, sid))
    if (logPath === null) { console.error('run-kickoff: 记账跳过——会话日志不在（' + String(sid).slice(0, 8) + '）'); return null }
    // ⚠ readSessionEvents 返回 `{readable, events}` **不是数组**（2026-10-18 实测踩坑三次：喂对象会让
    // fold 抛错，而此前被 catch 吞掉 → 静默不记账）。此处按契约取 .events，并把失败原因打出来（fail-loud）。
    const read = readSessionEvents(logPath)
    const events = Array.isArray(read) ? read : (read?.events ?? [])
    if (foldHitlPending(events).pending !== true) { console.error('run-kickoff: 记账跳过——该会话当前无挂起问询（foldHitlPending=false）'); return null }
    const lastAsk = [...events].reverse().find((e) => e?.type === 'tool/call' && e?.data?.name === 'ask_user_question')
    const questions = parseAskQuestions(lastAsk?.data?.arguments)
    const cardKey = isDeliveryReviewCard(questions) ? 'anchor-2' : 'anchor-1'
    const slug = attributionBundleOf(events)
    if (slug === null) { console.error('run-kickoff: 记账跳过——归属未定（attributionBundleOf=null：该会话尚无 write/edit 命中任何 bundle，按纪律延迟补记）'); return null }
    for (const base of ['research-workspace', join('research-workspace', 'archive'), join('research-workspace', '_abandoned')]) {
      const dir = join(ROOT, base, `drt_${String(slug).replace(/^drt_/, '')}`)
      if (existsSync(join(dir, 'question.md'))) return { cardKey, bundleDir: dir, slug: `drt_${String(slug).replace(/^drt_/, '')}` }
    }
    console.error('run-kickoff: 记账跳过——三位置找不到 drt_' + String(slug).replace(/^drt_/, '') + ' 的 question.md')
    return null
  } catch (error) {
    console.error('run-kickoff: ⚠ 记账判定异常（如实报告，不静默）——' + String(error).slice(0, 140))
    return null
  }
}
