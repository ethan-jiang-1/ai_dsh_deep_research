/**
 * credentials-status — preflight 的模型密钥判据（不读值，只判“有没有非空 key”）。
 *
 * DSH 的凭据分层（vendor/.../credentials-local/README）：存储文件 > 启动环境 > 项目 `.env`
 * > home `.env`。旧 preflight 只看 `.credentials.yaml` 是否存在，空文件也能全绿；也漏掉
 * 项目/home `.env`。本件按同一分层检查非空值，并在文件在场但无 key 时如实说“没有 key”，
 * 而不是“没有凭据文件”。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** DSH 存储凭据文件名（唯一字面量；调用方不要各写一份）。 */
export const CREDENTIALS_FILENAME = '.credentials.yaml'

/** 从 YAML 文本里找 key 的非空值；只认行首 key（注释行不匹配）。 */
function yamlValue(text, key) {
  for (const line of text.split(/\r?\n/)) {
    const match = new RegExp(`^\\s*${key}\\s*:\\s*(.*)$`).exec(line)
    if (match === null) continue
    const value = match[1].trim().replace(/^(['"])(.*)\1$/, '$2')
    if (value !== '' && value !== '~' && value !== 'null') return value
  }
  return null
}

/** 从 `.env` 文本里找 key 的非空值；忽略注释行。 */
function envValue(text, key) {
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue
    const match = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=\\s*(.*)$`).exec(line)
    if (match === null) continue
    const value = match[1].trim().replace(/^(['"])(.*)\1$/, '$2')
    if (value !== '') return value
  }
  return null
}

function readText(path) {
  try {
    return { text: readFileSync(path, 'utf8') }
  } catch (error) {
    return { error: error?.code ?? error?.message ?? String(error) }
  }
}

/**
 * 判模型密钥是否可用。
 * @param {{ env?: Record<string, string | undefined>, dshHome: string, workspace?: string | null, cwd?: string }} options
 * @returns {{ ok: boolean, source: string | null, detail: string, path?: string }}
 */
export function credentialStatus({ env = process.env, dshHome, workspace = null, cwd = process.cwd() } = {}) {
  const key = 'DEEPSEEK_API_KEY'
  if (typeof env?.[key] === 'string' && env[key].trim() !== '') {
    return { ok: true, source: 'env', detail: '启动环境变量已配置' }
  }

  const credentialsPath = join(dshHome, CREDENTIALS_FILENAME)
  let credentialsSawFile = false
  let credentialsError
  if (existsSync(credentialsPath)) {
    credentialsSawFile = true
    const read = readText(credentialsPath)
    if (read.error !== undefined) {
      // 文件存在但不可读：仍继续看 .env；若最后没有任何来源，给出不可读原因。
      credentialsError = read.error
    } else if (yamlValue(read.text, key) !== null) {
      return { ok: true, source: 'credentials', detail: `DSH 凭据文件含 ${key}`, path: credentialsPath }
    }
  }

  const envFiles = []
  if (typeof workspace === 'string' && workspace !== '') envFiles.push([join(workspace, '.env'), 'workspace-env'])
  if (typeof cwd === 'string' && cwd !== '' && cwd !== workspace) envFiles.push([join(cwd, '.env'), 'cwd-env'])
  envFiles.push([join(dshHome, '.env'), 'home-env'])
  for (const [path, source] of envFiles) {
    if (!existsSync(path)) continue
    const read = readText(path)
    if (read.error !== undefined) continue
    if (envValue(read.text, key) !== null) {
      return { ok: true, source, detail: `${path} 含 ${key}`, path }
    }
  }

  if (credentialsError !== undefined) {
    return { ok: false, source: null, detail: `凭据文件存在但不可读：${credentialsPath}（${credentialsError}）`, path: credentialsPath }
  }
  if (credentialsSawFile) {
    return { ok: false, source: null, detail: `凭据文件在场但没有非空 ${key}：${credentialsPath}`, path: credentialsPath }
  }
  return { ok: false, source: null, detail: `未找到 ${key}（环境变量 / $DSH_HOME/.credentials.yaml / 项目或 home .env）` }
}
