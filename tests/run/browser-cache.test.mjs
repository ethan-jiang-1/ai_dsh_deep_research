// browser-cache — 浏览器缓存目录判据（2026-11-03 CI 实测：Linux 上只认 macOS 路径，
// chromium 回退失效 → client-load 在 CI 红在 launch）。纯函数，不启动浏览器。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { browserCacheDirs } from '../../scripts/lib/browser-cache.mjs'

test('缓存候选跨平台：macOS / Linux / Windows 三个缺省目录都在', () => {
  assert.deepEqual(browserCacheDirs('/home/u', undefined), [
    '/home/u/Library/Caches/ms-playwright',
    '/home/u/.cache/ms-playwright',
    '/home/u/AppData/Local/ms-playwright',
  ])
})

test('PLAYWRIGHT_BROWSERS_PATH 在场时只认它（与 Playwright 优先级一致）', () => {
  assert.deepEqual(browserCacheDirs('/home/u', '/opt/pw'), ['/opt/pw'])
})
