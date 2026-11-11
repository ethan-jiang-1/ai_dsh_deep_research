// cli-entry.mjs — 共享 CLI 入口判定（symlink-safe）。
//
// 为什么：macOS `/tmp` → `/private/tmp`；按字面路径或 `resolve()` 比较会让
// `main()` 在 symlink checkout 下静默不执行（bootstrap 误报、dev 工具假绿）。
// realpath 归一后比较同一文件；`argv1` 缺省取 `process.argv[1]`。
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** @param {string} metaUrl `import.meta.url` @param {string} [argv1] CLI 入口路径 */
export function isMain(metaUrl, argv1 = process.argv[1]) {
  if (argv1 === undefined) return false;
  try {
    return realpathSync(fileURLToPath(metaUrl)) === realpathSync(argv1);
  } catch {
    return false;
  }
}
