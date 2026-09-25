// scripts/lib/env.mjs — 子进程环境清洗（vendor docs/defensive-patterns.md §27-29 吸纳：
// "Never hand untrusted output the ambient environment"——spawn 出去的命令拿到洗过的 env，
// 丢掉 *KEY*/*SECRET*/*TOKEN*/*PASSWORD*，凭据不会漏进输出、`env` 或 spill 文件）。
//
// 纪律：**先洗，再显式加白**。唯一允许出现在子进程 env 里的密钥，是调用点写明的那一把
// （例如真模型档的 DEEPSEEK_API_KEY）——整体透传 `{...process.env}` 是本仓禁止的写法
// （repo-conventions 门禁机械检查）。
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
