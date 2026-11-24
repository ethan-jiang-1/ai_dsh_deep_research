// checks/lib/shared/session-log.mjs — canonical session log discovery and native decoding.
//
// The regression surface is deliberately small: callers choose policy (group, age,
// selected session), while this module chooses one physical log and decodes it
// without a shell or external subprocess.
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { projectKey } from './workspace-root.mjs'
import * as zlib from 'node:zlib'

/** 组目录名正本（vendor 同形 `projectKey(cwd)`）——再导出给 seed materialize 用，避免第三份实现。
 *  为什么从这里取：workspace-root 的消费方台账（checks/README lib 表）已把 session-log 记为
 *  workspace-root 的消费方；冒烟只从 session-log 取，不新增 lib 表的消费方行列。 */
export { projectKey }

const LOG_CANDIDATES = [
  'session.v4.jsonl.zstd',
  'session.v4.jsonl',
  'session.v3.jsonl.zstd',
  'session.v3.jsonl',
]

/** Select the highest canonical generation present in one physical session directory. */
export function resolveSessionLog(sessionDir) {
  for (const name of LOG_CANDIDATES) {
    const path = join(sessionDir, name)
    try {
      lstatSync(path)
      return path
    } catch (error) {
      if (error.code !== 'ENOENT') return path // Present but inaccessible: never select an older generation.
    }
  }
  return null
}

/** 组名含子串的首个会话组目录名；根缺席或无命中 → undefined。
 *  组过滤盲区的逃生口（2026-10-21 卫生轮 维度6 件①）：researchWorkspaceGroup 只认
 *  research-workspace 组（run 通道约定），dev home 的冒烟/自测组（dev-smoke-workspace /
 *  runtime-smoke-workspace / lib-selftest 等）对观察工具不可见——症状发生在冒烟会话时
 *  「刚才发生了什么」入口失效。需要跨组观察的消费者（session-events / watch-run 的
 *  --group）用本函数自带子串；无命中返回 undefined，由调用方 fail-loud（列在场组），
 *  不静默换组。 */
export function findGroup(sessionsRoot, substring) {
  if (!existsSync(sessionsRoot)) return undefined
  return readdirSync(sessionsRoot).find((d) => d.includes(substring))
}

/** research-workspace 组的目录名（run 通道组名约定 = 组名含该子串；组随会话 cwd 走）。
 *  组不在场（未 source env.sh / 无 run 历史）→ undefined。三消费方（client-load.entry /
 *  hitl-answer / watch-run）原各写一份同款一行——收敛为唯一正本（2026-10-13 结构重构）；
 *  判据本体复用 findGroup（子串可参数化的那一份），缺省子串 = research-workspace。 */
/**
 * @param {string} sessionsRoot
 * @param {string | null} [workspace]
 * @returns {string | undefined}
 */
export function researchWorkspaceGroup(sessionsRoot, workspace = null) {
  if (typeof workspace === 'string' && workspace !== '') {
    const key = projectKey(resolve(workspace))
    if (existsSync(join(sessionsRoot, key))) return key
  }
  return findGroup(sessionsRoot, 'research-workspace')
}

/** Find one session's physical directory under a sessions root.
 *  `session-<id>` wins over the bare `<id>` form; the first matching group in readdir order wins.
 *  Missing root or id -> null（不猜、不抛）。2026-11-04 从六个真模型档消费方收进 canonical：
 *  旧决定“sessionDirOf 保留本地”已重开，双形态/首匹配语义逐字保留（见 session-dir-canonical Note）。 */
export function findSessionDir(sessionsRoot, sessionId) {
  if (typeof sessionsRoot !== 'string' || typeof sessionId !== 'string' || !existsSync(sessionsRoot)) return null
  for (const form of [`session-${sessionId}`, sessionId]) {
    for (const group of readdirSync(sessionsRoot)) {
      const dir = join(sessionsRoot, group, form)
      if (existsSync(dir)) return dir
    }
  }
  return null
}

/** Read one session's canonical log text by id; missing/unreadable -> ''（六个冒烟/探针消费方的既有契约）。 */
export function readSessionTextOf(sessionsRoot, sessionId) {
  const dir = findSessionDir(sessionsRoot, sessionId)
  if (dir === null) return ''
  const logPath = resolveSessionLog(dir)
  return logPath === null ? '' : (readSessionText(logPath) ?? '')
}

/** List canonical logs in one session group, newest mtime first; inaccessible logs are omitted. */
export function sessionLogsInGroup(groupDir) {
  if (!existsSync(groupDir)) return []
  const out = []
  for (const sessionId of readdirSync(groupDir)) {
    const dir = join(groupDir, sessionId)
    const logPath = resolveSessionLog(dir)
    if (logPath === null) continue
    let mtimeMs
    try { mtimeMs = statSync(logPath).mtimeMs } catch { continue }
    out.push({ sessionId, dir, logPath, mtimeMs })
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs)
}

/**
 * Decode concatenated native zstd frames（vendor 语义：**逐次 append 一帧**）。
 *
 * 三态而不是两态（BUG-434）：崩溃/断电留下的**尾部半帧**是 vendor 自己就有修复路径的
 * 正常形态（`repair.ts` 专为它设计）。旧实现「任意一帧坏 = 整份 null」把「尾部坏」与
 * 「整份坏」压成同一状态，恢复工具恰好在崩溃现场盲掉。
 *
 *   完好        → `{ buffer, truncatedTail: false }`
 *   尾帧坏      → `{ buffer: 已解前缀, truncatedTail: true }`
 *   中间帧坏    → `null`（失败点之后仍有完整帧头 = 真损坏，不得把前缀当完整事实）
 *   首帧就坏    → `null`
 */
const ZSTD_MAGIC = 0xfd2fb528

/** 从 `offset` 解析一个完整帧的边界；不是合法帧 → null（不猜）。 */
function nextFrameOf(buf, offset) {
  const start = offset
  if (buf.length - offset < 5 || buf.readUInt32LE(offset) !== ZSTD_MAGIC) return null
  offset += 4
  const descriptor = buf[offset++]
  if ((descriptor & 0x18) !== 0) return null
  const contentSizeFlag = descriptor >>> 6
  const singleSegment = (descriptor & 0x20) !== 0
  const checksum = (descriptor & 0x04) !== 0
  const dictionaryFlag = descriptor & 0x03
  const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag
  const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : 1 << contentSizeFlag
  const headerBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes
  if (buf.length - offset < headerBytes) return null
  const contentSizeStart = offset + (singleSegment ? 0 : 1) + dictionaryBytes
  offset += headerBytes
  let last = false
  while (!last) {
    if (buf.length - offset < 3) return null
    const blockHeader = buf.readUIntLE(offset, 3)
    offset += 3
    last = (blockHeader & 1) !== 0
    const blockType = (blockHeader >>> 1) & 0x03
    if (blockType === 3) return null
    const blockBytes = blockType === 1 ? 1 : blockHeader >>> 3
    if (buf.length - offset < blockBytes) return null
    offset += blockBytes
  }
  if (checksum) {
    if (buf.length - offset < 4) return null
    offset += 4
  }
  // 声明的内容长度（可选；zstd 流式压缩可能不写）——用于识别「结构看似完整、实际被截断」的帧。
  let contentSize = null
  if (contentSizeBytes > 0) {
    const raw = contentSizeBytes === 1 ? buf.readUInt8(contentSizeStart)
      : contentSizeBytes === 2 ? buf.readUInt16LE(contentSizeStart) + 256
        : contentSizeBytes === 4 ? buf.readUInt32LE(contentSizeStart)
          : Number(buf.readBigUInt64LE(contentSizeStart))
    contentSize = raw
  }
  return { bounds: [start, offset], contentSize }
}

/** 逐帧扫描到第一个解析失败点；`rest` = 失败点偏移（=== buf.length 表示干净扫完）。 */
function scanZstdFrames(buf) {
  const frames = []
  let offset = 0
  while (offset < buf.length) {
    const frame = nextFrameOf(buf, offset)
    if (frame === null) break
    frames.push(frame)
    offset = frame.bounds[1]
  }
  return { frames, rest: offset }
}

/** 失败点之后是否还有别的完整帧头（有 = 中间损坏，不是尾部截断）。 */
function hasFrameAfter(buf, offset) {
  for (let at = offset + 1; at + 4 <= buf.length; at += 1) {
    if (buf.readUInt32LE(at) === ZSTD_MAGIC) return true
  }
  return false
}

/**
 * 解码多帧日志。
 * @returns {{ buffer: Buffer, truncatedTail: boolean } | null} null = 整份不可用（首帧/中间帧坏）。
 */
export function decodeSessionLog(buf, decompress = typeof zlib.zstdDecompressSync === 'function' ? zlib.zstdDecompressSync : null) {
  if (!decompress || !buf || buf.length < 4) return null
  const { frames, rest } = scanZstdFrames(buf)
  if (frames.length === 0) return null
  // 扫描在中间停住且后面还有帧头 → 中间损坏；否则尾部截断（保留可用前缀）。
  const scanTruncated = rest < buf.length && !hasFrameAfter(buf, rest)
  if (rest < buf.length && !scanTruncated) return null
  const parts = []
  let truncatedTail = scanTruncated
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index]
    let part = null
    try {
      part = decompress(buf.subarray(frame.bounds[0], frame.bounds[1]))
    } catch {
      part = null
    }
    // 帧头声明的长度与实际解出长度不符 = 该帧被截断/损坏（zstd 解压对截断块可能静默返回残片）。
    if (part && frame.contentSize !== null && part.length !== frame.contentSize) part = null
    // 会话日志的一帧 = 若干**完整 JSONL 行**（vendor 一次 append 一帧）：解出的载荷必须以换行收尾。
    // 截断帧吞掉后续帧开头时，解压可能「凑巧」还原出声明长度，但尾部不会是新行 → 判损坏。
    if (part && part.length > 0 && part[part.length - 1] !== 0x0a) part = null
    if (!part) {
      // 判「尾坏」还是「中间坏」看**坏帧之后还有没有字节**：坏帧若吞掉了后续帧的开头，
      // 它的声明边界会停在缓冲中间（bounds 结尾 < 总长）→ 这是中间损坏，前缀不可当完整事实。
      const tailOnly = index === frames.length - 1 && frame.bounds[1] >= buf.length
      if (tailOnly) { truncatedTail = true; break }
      return null
    }
    parts.push(part)
  }
  return { buffer: Buffer.concat(parts), truncatedTail }
}

/** 兼容壳：只要解码字节（尾帧截断时返回可用前缀；整份不可读 → null）。 */
export function decompressSessionLog(buf, decompress = typeof zlib.zstdDecompressSync === 'function' ? zlib.zstdDecompressSync : null) {
  return decodeSessionLog(buf, decompress)?.buffer ?? null
}

/**
 * 列出会话根下**近窗口内**的会话日志（按 cwd 分组；组名不含 `group` 子串即跳过）。
 * 扫描逻辑只此一份：plan-card-stats / provider-error-stats 等投影工具共用，免得各写一份
 * 遍历+过滤（"同一判据两版实现"是本仓反复吃过的漂移）。
 *
 * @param {string} sessionsRoot 会话根（一般是 `$DSH_HOME/sessions`）
 * @param {{days?: number, group?: string}} [opts] 窗口天数（缺省 30）与组名子串过滤（缺省不过滤）
 * @returns {Array<{sessionId: string, group: string, dir: string, logPath: string, mtimeMs: number}>}
 *   按 mtime 降序；`logPath` 由 [resolveSessionLog] 选canonical 代际，缺日志的会话不计入。
 */
export function sessionLogsSince(sessionsRoot, opts = {}) {
  const days = typeof opts.days === 'number' ? opts.days : 30;
  const groupFilter = typeof opts.group === 'string' ? opts.group : '';
  const cutoff = Date.now() - days * 86400 * 1000;
  const out = [];
  if (!existsSync(sessionsRoot)) return out;
  for (const group of readdirSync(sessionsRoot)) {
    if (!group.includes(groupFilter)) continue;
    for (const sessionId of readdirSync(join(sessionsRoot, group))) {
      const dir = join(sessionsRoot, group, sessionId);
      const logPath = resolveSessionLog(dir);
      if (logPath === null) continue;
      let mtimeMs;
      try { mtimeMs = statSync(logPath).mtimeMs; } catch { continue; }
      if (mtimeMs < cutoff) continue;
      out.push({ sessionId, group, dir, logPath, mtimeMs });
    }
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

/** Read JSONL or concatenated zstd JSONL as text（不解 JSON——给按行/按文本判据的消费者用）。
 *  返回 null = 不可读（坏帧/读失败）；此即"日志不可读"的唯一判定点，消费者须显式区分，不得当空语料。 */
/** 读取日志文本（zstd 三态：尾帧坏 → 可用前缀；整份坏 → null）。 */
export function readSessionText(logPath) {
  const decoded = readSessionLog(logPath)
  return decoded === null ? null : decoded.text
}

/** 读日志并区分「完整」与「尾部截断」——恢复工具据此如实标注（BUG-434）。 */
export function readSessionLog(logPath) {
  try {
    const raw = readFileSync(logPath)
    if (logPath.endsWith('.jsonl')) return { text: raw.toString('utf8'), truncatedTail: false }
    const decoded = decodeSessionLog(raw)
    if (decoded === null) return null
    return { text: decoded.buffer.toString('utf8'), truncatedTail: decoded.truncatedTail }
  } catch {
    return null
  }
}

/** Read JSONL or concatenated zstd JSONL without spawning a decoder process.
 *  `truncatedTail` = 只读到前缀（崩溃留下的尾部半帧）；调用方必须如实标注，不得当完整事实。 */
export function readSessionEvents(logPath) {
  try {
    const decoded = readSessionLog(logPath)
    if (decoded === null) return { readable: false, events: [], truncatedTail: false }
    // 尾帧截断时末行可能不完整：丢掉没有换行收尾的残行，保证每条事件都是完整 JSON 行。
    const lines = decoded.text.split('\n')
    if (decoded.truncatedTail && lines.length > 0 && !decoded.text.endsWith('\n')) lines.pop()
    const events = lines.filter((line) => line.trim()).map((line) => JSON.parse(line))
    if (events.some((event) => !event || typeof event !== 'object' || Array.isArray(event))) {
      return { readable: false, events: [], truncatedTail: false }
    }
    return { readable: true, events, truncatedTail: decoded.truncatedTail }
  } catch {
    return { readable: false, events: [], truncatedTail: false }
  }
}

/** 客户端 follow 开窗快照的盘侧复刻（对账同一窗口）：语义 = api/session-controller
 *  `paginate` + `DEFAULT_MAX_MESSAGES = 50`——从日志末尾倒序数 50 条 surface append 消息事件
 *  （user/message | assistant/message），第 50 条处（其 sourceEventSeqs 组起点更早则取组起点；
 *  seq = 稠密零基下标）定为切点，页 = 切点到末尾的全部事件（非消息事件一并含入）。
 *  唯一正本：client-load.entry 与交付目标选取（client-load-reference.support）共用——两处各写一份
 *  就是"同一判据两版实现"。 */
const CLIENT_HISTORY_MESSAGE_WINDOW = 50

/**
 * @param {readonly any[]} events - 会话日志事件（seq 序）。
 * @returns {any[]} 客户端开场快照可见的事件窗。
 */
export function clientHistoryWindow(events) {
  let counted = 0
  let cut = 0
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if ((e?.type === 'user/message' || e?.type === 'assistant/message') && e?.surfaceOp === 'append') {
      counted++
      if (counted >= CLIENT_HISTORY_MESSAGE_WINDOW) {
        cut = i
        if (Array.isArray(e?.sourceEventSeqs)) {
          for (const s of e.sourceEventSeqs) if (typeof s === 'number' && s < cut) cut = s
        }
        break
      }
    }
  }
  return events.slice(cut)
}
