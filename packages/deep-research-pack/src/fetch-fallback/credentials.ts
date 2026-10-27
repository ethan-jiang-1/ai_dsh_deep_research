/**
 * credentials.ts —— 回退腿的凭据解析（D31），纯函数 + 注入的环境。
 *
 * 优先级：mounted credentials 服务（Models 页写入的 ref）→ 启动环境变量。
 * 两者都没有 = 不回退（orchestrate 的 api 腿返回 undefined，错误里标 fallback unavailable）。
 * 账号登录 token 不在本解析面（vendor 的 account 解析未从包入口导出；见 D31 输掉的方案）。
 */

/** Minimal credentials-service shape the resolver needs. */
export interface CredentialsSource {
  resolve(ref: string): Promise<{ value: string } | undefined>
}

/**
 * Resolve one credential reference.
 * @param credentials - mounted credentials service, when the host has one.
 * @param env - launch environment map (production: `process.env`).
 * @param ref - credential reference, e.g. `DEEPSEEK_API_KEY`.
 * @returns the first non-empty value, or undefined when neither source has it.
 */
export async function resolveCredential(
  credentials: CredentialsSource | undefined,
  env: Readonly<Record<string, string | undefined>>,
  ref: string,
): Promise<string | undefined> {
  if (credentials !== undefined) {
    const resolved = await credentials.resolve(ref)
    if (resolved !== undefined && resolved.value.length > 0) return resolved.value
  }
  const ambient = env[ref]
  return ambient !== undefined && ambient.length > 0 ? ambient : undefined
}
