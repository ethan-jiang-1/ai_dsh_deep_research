// port-reclaim-policy.mjs — 端口 listener 身份判定的纯判据（keyless 直测；无子进程依赖）。
//
// 只认**真正在跑 DSH web** 的命令行（BUG-104/113）：node + vendor/安装副本的 CLI 入口，
// 或 `dsh` 可执行；仓库路径子串、tail、任意 node 脚本都不算（否则仓库里的用户服务会被杀）。
const DSH_ENTRY = /(?:^|\s)(?:node|nodejs)\s+[^\n]*(?:vendor[\\/]dsh[\\/]apps[\\/]cli[\\/](?:src[\\/]bin\.ts|lib[\\/]bin\.js)|@deepseek-ai[\\/]dsh[\\/]apps[\\/]cli[\\/](?:src[\\/]bin\.ts|lib[\\/]bin\.js))/i
const DSH_BIN = /(?:^|\s)(?:\S*[\\/])?dsh\s+(?:web\b|--profile\b)/i
const NON_DSH = /^\s*(?:tail|cat|less|more|grep|rg|vim|nano|code|python|ruby|perl)\b/i

export const isOwnListener = (command) => {
  if (typeof command !== 'string' || command.trim() === '') return false
  if (NON_DSH.test(command)) return false
  return DSH_ENTRY.test(command) || DSH_BIN.test(command)
}
