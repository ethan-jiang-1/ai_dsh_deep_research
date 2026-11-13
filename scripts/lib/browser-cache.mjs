// browser-cache.mjs — 浏览器缓存目录判据（平台缺省三态）。
// 从 playwright.mjs 拆出的纯件：Linux CI 曾因只认 macOS 路径导致 chromium 回退失效
// （2026-11-03 client-load 红在 launch）；单测 = tests/run/browser-cache.spec.mjs。
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * 浏览器缓存候选目录（按 Playwright 的平台缺省）：macOS / Linux / Windows。
 * `PLAYWRIGHT_BROWSERS_PATH` 在场时只认它（与 Playwright 自己的优先级一致）。
 */
export function browserCacheDirs(home = homedir(), envPath = process.env.PLAYWRIGHT_BROWSERS_PATH) {
  if (envPath) return [envPath]
  return [
    join(home, 'Library/Caches/ms-playwright'),      // macOS
    join(home, '.cache/ms-playwright'),              // Linux
    join(home, 'AppData/Local/ms-playwright'),       // Windows
  ]
}
