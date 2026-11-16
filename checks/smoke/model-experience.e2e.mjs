#!/usr/bin/env node
// Keyless real-Loader Model Experience smoke: price the Lead/Scout first request.
//
// 前置：vendor 树 native system 产物（同 method-library-tool.e2e）；CI 工具链缺 → 开发档。
// 捕获真实组装的首请求（persona + 手册 runtime context + skill 目录 + 工具 schema），
// 用 DSH fixed-density estimator 计价；绝对总数含时钟注入运行期变量，稳定面 = 工具 schema
// 与手册占比。README Model Experience 的数字以本冒烟为生成命令，不写死易漂的绝对总数。
import assert from 'node:assert/strict'
import { mkdir, lstat, symlink } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runLoaderSmoke } from '@deepseek-ai/dsh-loader-smoke'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const DRIVER = join(ROOT, 'tests/fixtures/model-experience/driver.ts')
const PATCH = join(ROOT, 'tests/fixtures/model-experience/cordis.patch.yml')
const packDirectory = resolve(ROOT, 'packages/deep-research-pack')
const { stdout, stderr } = await runLoaderSmoke({
  label: 'model-experience',
  tempDirPrefix: 'model-experience.e2e-',
  binScript: DRIVER,
  libBinScript: DRIVER,
  configPath: PATCH,
  binArgs: [PATCH],
  mode: 'src',
  sourceImport: 'tsx/esm',
  tsconfigPath: join(ROOT, 'tsconfig.json'),
  processTimeoutMs: 90_000,
  prepare: async (cwd) => {
    const profileModules = join(cwd, '.dsh', 'profiles', 'headless', 'node_modules')
    const linkPath = join(profileModules, 'dsh-deep-research-pack')
    await mkdir(profileModules, { recursive: true })
    try {
      await lstat(linkPath)
      throw new Error(`unexpected package link already exists in isolated profile: ${linkPath}`)
    } catch (cause) {
      if (cause instanceof Error && 'code' in cause && cause.code !== 'ENOENT') throw cause
      if (cause instanceof Error && !('code' in cause)) throw cause
    }
    await symlink(packDirectory, linkPath, 'dir')
  },
})
assert.equal(stderr, '', `model-experience smoke wrote stderr: ${stderr}`)
const lines = stdout.trim().split('\n')
const result = JSON.parse(lines.at(-1) ?? 'null')
assert.equal(result?.type, 'model-experience.e2e')
assert.ok(Array.isArray(result.roles) && result.roles.length === 2)
for (const role of result.roles) {
  assert.ok(Number.isInteger(role.total) && role.total > 0, `${role.role}: first-request total must be a positive integer`)
  assert.ok(Number.isInteger(role.toolTokens) && role.toolTokens > 0, `${role.role}: tool schema tokens must be positive`)
  assert.ok(role.toolNames.length > 0, `${role.role}: request carried no tools`)
}
assert.ok(Number.isInteger(result.manualTokens) && result.manualTokens > 0, 'manual.md token estimate must be positive')
assert.ok(result.manualShareOfLeadMessages > 0 && result.manualShareOfLeadMessages <= 1, 'manual share of Lead messages out of range')
const lead = result.roles.find((role) => role.role === 'lead')
const scout = result.roles.find((role) => role.role === 'scout')
process.stdout.write(`PASS model-experience: Lead first request ${lead.total} tokens (tools ${lead.toolTokens}); Scout ${scout.total} tokens (tools ${scout.toolTokens}); manual.md ${result.manualTokens} tokens ≈ ${(result.manualShareOfLeadMessages * 100).toFixed(1)}% of Lead message tokens\n`)
