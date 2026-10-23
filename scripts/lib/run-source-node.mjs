// run-source-node.mjs —— `RunSource` 的 node:fs 适配器（run-context 的 Node 半）。
//
// 职责只有三件事：把 `node:fs` 的目录/文本/版本事实翻译成 run-context 的 Outcome；
// 位置规则、同名优先级、读策略、翻页全在 pack `src/lib/run-context.ts`，本件不重复。
//
// 语义对齐 vendor `workspaceFiles`（README.zh.md「分页」）：
//   - offset 从 1 起；limit 是行数；
//   - 页 text 以 \n 连接，最后一行后不带终止符；文件末尾的 \n 是终止符，不额外算一行；
//   - eof = 本页含文件最后一行。
// 失败映射：ENOENT / ENOTDIR → missing；其它（EISDIR、EACCES、ENOTREADABLE…）→ unreadable。

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const missing = () => ({ ok: false, reason: 'missing' })
const unreadable = (detail) => ({ ok: false, reason: 'unreadable', detail })

const isMissing = (error) => error?.code === 'ENOENT'

/** 行切分：末尾 \n 是终止符，不是再起一空行（与 vendor 分页语义一致）。 */
function linesOf(text) {
  if (text === '') return []
  const lines = text.split('\n')
  if (text.endsWith('\n')) lines.pop()
  return lines
}

/**
 * 以工作区根为基准的 RunSource。
 * @param root - 工作区绝对路径（或相对当前 cwd 的路径）。
 * @returns `{ list, read, version }`，方法全部返回 Promise<Outcome>。
 */
export function nodeRunSource(root) {
  const base = resolve(root)
  return {
    async list(dir) {
      try {
        const entries = readdirSync(join(base, dir), { withFileTypes: true }).map((entry) => {
          const full = join(base, dir, entry.name)
          let mtimeMs
          try { mtimeMs = statSync(full).mtimeMs } catch { mtimeMs = undefined }
          return {
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other',
            ...(mtimeMs !== undefined ? { mtimeMs } : {}),
          }
        })
        return { ok: true, value: entries }
      } catch (error) {
        return isMissing(error) ? missing() : unreadable(`list ${dir}: ${error?.code ?? String(error)}`)
      }
    },
    async read(path, { offset, limit }) {
      if (!Number.isSafeInteger(offset) || offset < 1 || !Number.isSafeInteger(limit) || limit < 1) {
        return unreadable(`bad page window: offset=${String(offset)} limit=${String(limit)}`)
      }
      try {
        const full = join(base, path)
        const text = readFileSync(full, 'utf8')
        const all = linesOf(text)
        const slice = all.slice(offset - 1, offset - 1 + limit)
        let version
        try { version = String(statSync(full).mtimeMs) } catch { version = undefined }
        return {
          ok: true,
          value: {
            text: slice.join('\n'),
            lines: slice.length,
            eof: offset - 1 + slice.length >= all.length,
            ...(version !== undefined ? { version } : {}),
          },
        }
      } catch (error) {
        return isMissing(error) ? missing() : unreadable(`read ${path}: ${error?.code ?? String(error)}`)
      }
    },
    async version(path) {
      try {
        return { ok: true, value: String(statSync(join(base, path)).mtimeMs) }
      } catch (error) {
        return isMissing(error) ? missing() : unreadable(`stat ${path}: ${error?.code ?? String(error)}`)
      }
    },
  }
}
