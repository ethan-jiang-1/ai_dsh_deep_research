#!/usr/bin/env node
// Keyless real-Loader composition smoke for Method Library Host tool writes.
import assert from 'node:assert/strict'
import { mkdir, lstat, symlink } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runLoaderSmoke } from '@deepseek-ai/dsh-loader-smoke'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const DRIVER = join(ROOT, 'tests/fixtures/method-library-tool/driver.ts')
const PATCH = join(ROOT, 'tests/fixtures/method-library-tool/cordis.patch.yml')
const packDirectory = resolve(ROOT, 'packages/deep-research-pack')
const { stdout, stderr } = await runLoaderSmoke({
  label: 'method-library-tool',
  tempDirPrefix: 'method-library-tool-smoke-',
  binScript: DRIVER,
  libBinScript: DRIVER,
  configPath: PATCH,
  binArgs: [PATCH],
  mode: 'src',
  sourceImport: 'tsx/esm',
  tsconfigPath: join(ROOT, 'tsconfig.json'),
  processTimeoutMs: 60_000,
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
assert.equal(stderr, '', `method-library-tool smoke wrote stderr: ${stderr}`)
const lines = stdout.trim().split('\n')
const result = JSON.parse(lines.at(-1) ?? 'null')
assert.equal(result?.type, 'method-library-tool-smoke')
assert.ok(Number.isInteger(result?.checks) && result.checks >= 10)
assert.equal(typeof result?.methodToolSchemaTokenEstimate?.before, 'number')
assert.equal(typeof result?.methodToolSchemaTokenEstimate?.after, 'number')
assert.ok(result.methodToolSchemaTokenEstimate.delta > 0, 'method-tool schema token estimate did not increase for the new operation contract')
assert.ok(result.firstTurnInputTokenEstimate.after > result.firstTurnInputTokenEstimate.before, 'first-turn input estimate omitted the changed tool schema')
assert.equal(result.firstTurnInputTokenEstimate.delta, result.methodToolSchemaTokenEstimate.delta, 'first-turn estimate and tool-schema delta disagree')
process.stdout.write(`PASS method-library-tool: registered tool, durable owner command, workspace effects; first-turn estimate +${result.firstTurnInputTokenEstimate.delta} tokens (${result.firstTurnInputTokenEstimate.after} total)\n`)
