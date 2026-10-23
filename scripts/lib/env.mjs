// scripts/lib/env.mjs — 子进程环境清洗（vendor docs/defensive-patterns.md §27-29 吸纳：
// "Never hand untrusted output the ambient environment"——spawn 出去的命令拿到洗过的 env，
// 丢掉 *KEY*/*SECRET*/*TOKEN*/*PASSWORD*，凭据不会漏进输出、`env` 或 spill 文件）。
//
// 纪律：**先洗，再显式加白**。唯一允许出现在子进程 env 里的密钥，是调用点写明的那一把
// （例如真模型档的 DEEPSEEK_API_KEY）——整体透传 `{...process.env}` 是本仓禁止的写法
// （repo-conventions 门禁机械检查）。
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const SECRET = /(KEY|SECRET|TOKEN|PASSWORD)/i;

/** 洗掉继承环境里的密钥类变量，再叠加调用点显式的白名单条目。 */
export function scrubbedEnv(explicit = {}) {
  const out = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (SECRET.test(k)) continue;
    out[k] = v;
  }
  return { ...out, ...explicit };
}

/** 真模型档专用：显式带白名单的那一把 key（未配置则不带，交由下层 fail-loud）。 */
export function withModelKey(explicit = {}, env = process.env) {
  const out = scrubbedEnv(explicit);
  if (typeof env.DEEPSEEK_API_KEY === 'string' && env.DEEPSEEK_API_KEY !== '') {
    out.DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;
  }
  return out;
}

/** dev home：DSH_HOME 优先，未设置退回 ~/.dsh（与各脚本既有约定一致）。 */
export function devHome(env = process.env) {
  return env.DSH_HOME ?? join(homedir(), '.dsh');
}

/** 凭据文件是否在场（纯判定；测试用）。 */
export function credentialsPresent(home) {
  return typeof home === 'string' && home !== '' && existsSync(join(home, '.credentials.yaml'));
}

/**
 * 真模型档前置：凭据文件缺席 → exit 2（未跑 ≠ 通过）。
 * 这是 8 个真模型档脚本唯一的前置检查实现；档位闭集检测器认本 helper 的调用。
 * @param label - 脚本名（错误消息前缀）。
 * @param opts.home - 已解析的 dev home；缺省用 devHome()。
 * @returns home。
 */
export function requireCredentials(label, { home = devHome() } = {}) {
  const path = typeof home === 'string' && home !== '' ? join(home, '.credentials.yaml') : '(DSH_HOME 未设置)';
  if (!credentialsPresent(home)) {
    console.error(`${label}: 真模型档前置缺席——${path} 不在（先配置 DEEPSEEK_API_KEY）；未跑 ≠ 通过`);
    process.exit(2);
  }
  return home;
}
