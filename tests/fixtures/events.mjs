// events.mjs — 会话事件 wire-shape 构造工厂（文件级支援件，非语料组）。
// 家 = tests/fixtures/（tests/AGENTS「支援件住 lib/、fixtures/（glob 之外，import 不注册测试）」；
// 被各回归 import 构造事件，不进默认测试 glob——navigability 的孤儿检查只扫顶层目录组，
// 本文件的登记行在 fixtures/README.md）。收编动机（六维卫生轮 维度2 件②）：tool call/result
// 配对与 zstd 多帧日志的手写构造散布约十个测试文件（每份 5–20 行），vendor 会话日志格式
// 一变就要改十处——本工厂是这两个形态的单一构造正本。
//
// wire 正本（真实日志形态，非猜测）：
//  · tool/call：data = { callId?, name, arguments }，arguments 是 **JSON 字符串**（真 run 日志
//    实证：evidence-audit 2026-09-26 按真日志对齐、hitl-provenance 与 member-activity 的
//    归档 journal 挖掘同源）；callId / arguments / time 可缺席——被测谓词各有自己的最小形态，
//    工厂按需落键，不虚构字段。
//  · tool/result（v4 形态）：data = { message: { role:'tool', toolCallId?, content:[{type:'text',
//    text}] } }——result **不带工具名**，靠 callId 反查；isError / data.error（成员活动失败
//    形态，真实归档 journal 实证）与 time 按需在场。
//  · zstd 多帧：DSH 会话日志逐次 append 一帧（实测一场 run 三百余帧），读取器要扛坏尾帧与
//    坏 JSONL 行——zstdFrame 产单帧、writeZstdLog 拼帧写文件；特殊压缩参数（checksum 旗标）
//    与逐字节截断手术留在调用方（那是测试主语，不是样板）。
//
// 不收编的变体（本地语义，勿硬统一）：v3 代 result（role:'user' + source.kind:'tool' +
// tool-result content——run-dashboard 按代参数构造）；ask-drive 的整链事件驱动；replay 的
// 注入形态；plan-card 的 seq/turn/step 编排行（判据输入不是 wire 样板）。
//
// 负例留证 2026-10-21：把 toolCall 产出的 type 改错值（'tool/call' → 'tool/callx'）→
// 消费测试（hitl-fold / hitl-provenance / bundle-bind 等）当场红——工厂输出被消费方真读
// 真判，不是构造完就绿；还原 → 全绿（tests/AGENTS「改夹具应预期变红」的同族证据）。
import { writeFileSync } from 'node:fs';
import { zstdCompressSync } from 'node:zlib';

/** tool/call 事件（wire 正本见文件头注）。arguments 传对象 → JSON 字符串；传字符串原样
 *  （坏 JSON 负例形态，如 '{"path":"drt_probe/que'）；缺席则不带 arguments 键。
 *  callId / time 同理按需在场。 */
export function toolCall({ name, callId, arguments: args, time } = {}) {
  const data = {};
  if (callId !== undefined) data.callId = callId;
  data.name = name;
  if (args !== undefined) data.arguments = typeof args === 'string' ? args : JSON.stringify(args);
  return { type: 'tool/call', ...(time !== undefined ? { time } : {}), data };
}

/** tool/result 事件（v4 形态；v3 代形态留在调用方——见文件头注）。text 即 content[0].text
 *  原文（要嵌 JSON 载荷的调用方自己 JSON.stringify 后传入）；isError / error / time 按需。 */
export function toolResult({ callId, text, isError, error, time } = {}) {
  const message = { role: 'tool', ...(callId !== undefined ? { toolCallId: callId } : {}), content: [{ type: 'text', text }] };
  if (isError) message.isError = true;
  const data = { message };
  if (error !== undefined) data.error = error;
  return { type: 'tool/result', ...(time !== undefined ? { time } : {}), data };
}

/** 单个 zstd 帧：payload = JSONL 文本（string，调用方自理行尾 '\n'）或整段 Buffer（夹具
 *  字节流原样成帧）。特参压缩（checksum 旗标等）直接用 node:zlib——那是测试主语。 */
export function zstdFrame(payload) {
  return zstdCompressSync(typeof payload === 'string' ? Buffer.from(payload) : payload);
}

/** zstd 多帧日志文件（vendor 会话日志的 append 形态：一次写入 = 一帧，逐帧拼接）。
 *  frames 每项 = ①事件/文本行数组（一次 append 写下的行——对象逐个 JSON.stringify，
 *  行间 '\n'、末尾补 '\n'）②string（原样文本帧——坏 JSONL 行等损坏输入）③Buffer
 *  （原始字节帧——调用方自造的截断帧/坏尾帧原样入列）。返回 filePath 便于链式取用。 */
export function writeZstdLog(filePath, frames) {
  writeFileSync(filePath, Buffer.concat(frames.map((fr) => {
    if (Buffer.isBuffer(fr)) return fr;
    if (typeof fr === 'string') return zstdFrame(fr);
    return zstdFrame(`${fr.map((line) => (typeof line === 'string' ? line : JSON.stringify(line))).join('\n')}\n`);
  })));
  return filePath;
}
