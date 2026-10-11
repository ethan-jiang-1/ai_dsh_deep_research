// scripts/lib/session-log.mjs — canonical session log discovery and native decoding.
//
// The regression surface is deliberately small: callers choose policy (group, age,
// selected session), while this module chooses one physical log and decodes it
// without a shell or external subprocess.
import { lstatSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as zlib from 'node:zlib'

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

/** Decode concatenated native zstd frames. A bad frame makes the whole read unreadable. */
const ZSTD_MAGIC = 0xfd2fb528

function scanZstdFrames(buf) {
  const frames = []
  let offset = 0
  while (offset < buf.length) {
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
    frames.push([start, offset])
  }
  return frames
}

export function decompressSessionLog(buf, decompress = typeof zlib.zstdDecompressSync === 'function' ? zlib.zstdDecompressSync : null) {
  if (!decompress || !buf || buf.length < 4) return null
  const frames = scanZstdFrames(buf)
  if (!frames) return null
  const parts = []
  try {
    for (const [start, end] of frames) {
      const part = decompress(buf.subarray(start, end))
      if (!part) return null
      parts.push(part)
    }
  } catch {
    return null
  }
  return Buffer.concat(parts)
}

/** Read JSONL or concatenated zstd JSONL as text（不解 JSON——给按行/按文本判据的消费者用）。
 *  返回 null = 不可读（坏帧/读失败）；此即"日志不可读"的唯一判定点，消费者须显式区分，不得当空语料。 */
export function readSessionText(logPath) {
  try {
    const raw = readFileSync(logPath)
    const text = logPath.endsWith('.jsonl')
      ? raw.toString('utf8')
      : decompressSessionLog(raw)?.toString('utf8')
    return text === null || text === undefined ? null : text
  } catch {
    return null
  }
}

/** Read JSONL or concatenated zstd JSONL without spawning a decoder process. */
export function readSessionEvents(logPath) {
  try {
    const text = readSessionText(logPath)
    if (text === null) return { readable: false, events: [] }
    const events = text.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line))
    if (events.some((event) => !event || typeof event !== 'object' || Array.isArray(event))) return { readable: false, events: [] }
    return { readable: true, events }
  } catch {
    return { readable: false, events: [] }
  }
}
