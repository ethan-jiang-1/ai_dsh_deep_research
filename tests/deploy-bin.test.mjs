// 部署 bin 契约 — preflight / scaffold（D22 交付门面的静态形状；运行时真实路径归 L2
// release-smoke——tests/ 层禁子进程，故此处钉"检查清单 + fail-loud 形态 + 安全边界"，
// 机制 = 证据匹配面：清单漂移是静默失效面，正文逐字钉住）。
// 反证：①preflight 删任一检查名 → 清单断言红；②删 fail-loud exit 判定 → verdict 断言红；
// ③scaffold 引入 DEEPSEEK_API_KEY → 安全边界断言红；还原 → 绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACK = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'deep-research-pack');
const preflight = readFileSync(join(PACK, 'scripts', 'preflight.mjs'), 'utf8');
const scaffold = readFileSync(join(PACK, 'scripts', 'scaffold.mjs'), 'utf8');
const releaseSmoke = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'release-smoke.mjs'), 'utf8');
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));

test('preflight：六面检查清单在位（版本/peer/团队层/手册+模板/构建产物/密钥）', () => {
  // record( 调用点级断言：钉运行时检查名，注释里的字样不算数（反证实测：只改 record 名、
  // 留注释 → 必须红——includes() 子串断言会被注释满足而假绿）。
  for (const name of ['DSH 版本兼容', '平台 peer 包', '团队机制层', '研究工作区手册', 'run 模板', '构建产物', '模型密钥']) {
    assert.match(preflight, new RegExp(`record\\([^)]*${name}`), `preflight 缺 record 检查项「${name}」——检查清单漂移`);
  }
  assert.match(preflight, /dshReleases/, 'preflight 版本判据须读 dsh.compatibility.dshReleases（版本钉死正本）');
  assert.ok(preflight.includes('.credentials.yaml') && preflight.includes('DEEPSEEK_API_KEY'),
    'preflight 密钥检查须双源（环境变量 或 DSH 凭据文件）');
});

test('preflight：fail-loud verdict + 失败给补救命令（缺什么说什么、怎么补也说什么）', () => {
  assert.match(preflight, /process\.exit\(hardFail\.length === 0 \? 0 : 1\)/, 'preflight 缺 fail-loud exit 判定——待补项会以退出码 0 溜走');
  assert.match(preflight, /→ \$\{r\.remedy\}/, 'preflight 失败项未打印补救命令（→ remedy）');
});

test('scaffold：幂等形状 + 收尾 preflight + workspace 必填 fail-loud', () => {
  assert.ok(scaffold.includes('--force') && scaffold.includes('跳过已存在'), 'scaffold 缺幂等语义（已存在不覆盖，--force 才写）');
  assert.match(scaffold, /process\.exit\(2\)/, 'scaffold 缺 --workspace 必填的 exit(2) 前置拦截');
  assert.ok(scaffold.includes('preflight.mjs'), 'scaffold 收尾必须复核 preflight（准备完成 ≠ 检查通过）');
  assert.ok(scaffold.includes('agent-team-profile'), 'scaffold 团队层组合缺失——四角色协作主通道不可用');
});

test('scaffold 安全边界：零密钥面（不装 DSH 本体、不写密钥——有意不做的事钉死）', () => {
  assert.doesNotMatch(scaffold, /DEEPSEEK_API_KEY|credentials\.yaml/, 'scaffold 出现密钥面——安全边界（密钥永不落脚本）被破坏');
});

test('preflight：--install-only 跳过凭据门但保留默认研究就绪门', () => {
  assert.match(preflight, /installOnly|install-only/, 'preflight 缺显式安装验收模式');
  assert.match(preflight, /argv\.includes\(['"]--install-only['"]\)/, 'preflight 未从公开 CLI 参数读取 --install-only');
  assert.match(preflight, /安装验收通过（不代表研究就绪）/, '安装模式 verdict 不得宣称研究就绪');
  assert.match(preflight, /if \(installOnly\)[\s\S]{0,250}模型密钥 DEEPSEEK_API_KEY/, '安装模式未明确跳过模型密钥检查');
  assert.match(preflight, /withModelKey|process\.exit\(hardFail\.length === 0 \? 0 : 1\)/, '默认模式 verdict 约束缺失');
});

test('scaffold：--install-only 转发给 preflight', () => {
  assert.match(scaffold, /argv\.includes\(['"]--install-only['"]\)/, 'scaffold 未声明 --install-only CLI 模式');
  assert.match(scaffold, /--install-only/, 'scaffold 未把安装模式转发给 preflight');
});

test('release-smoke：L2 非模型命令使用 scrubbedEnv 并执行安装模式', () => {
  assert.ok(releaseSmoke.includes('scrubbedEnv'), 'release-smoke 缺 scrubbedEnv');
  assert.doesNotMatch(releaseSmoke, /scaffold\.mjs['\"\s\S]{0,500}withModelKey/, 'scaffold 非模型命令仍带 withModelKey');
  assert.doesNotMatch(releaseSmoke, /preflight\.mjs['\"\s\S]{0,500}withModelKey/, 'preflight 非模型命令仍带 withModelKey');
  assert.match(releaseSmoke, /scaffold\.mjs[\s\S]{0,300}--install-only/, 'scaffold 未使用安装验收模式');
  assert.match(releaseSmoke, /preflight\.mjs[\s\S]{0,300}--install-only/, 'preflight 未使用安装验收模式');
});

test('release-smoke：默认 preflight 缺凭据仍是拒绝证据', () => {
  assert.match(releaseSmoke, /默认 preflight|default preflight|缺凭据/, 'release-smoke 缺默认凭据拒绝断言');
  assert.match(releaseSmoke, /DEEPSEEK_API_KEY/, 'release-smoke 默认凭据拒绝未钉密钥名称');
  assert.match(releaseSmoke, /status !== 0|status === 1/, 'release-smoke 默认 preflight 未断言非零拒绝');
});

test('release-smoke：破坏性清理仅允许固定路径', () => {
  assert.match(releaseSmoke, /assert.*(tmp|profileDir|probeWs)|guard|startsWith/, 'release-smoke 缺固定清理路径保护');
  assert.match(releaseSmoke, /clean\('tmp', tmp\)/, 'release-smoke 未清理固定临时目录');
  assert.match(releaseSmoke, /clean\('profile', profileDir\)/, 'release-smoke 未清理固定 profile 目录');
  assert.match(releaseSmoke, /clean\('probe', probeWs\)/, 'release-smoke 未清理固定 probe 目录');
});

test('bin 入口：两条部署命令在 package.json bin 指向真实脚本', () => {
  assert.equal(pkg.bin?.['dsh-deep-research-preflight'], './scripts/preflight.mjs', 'bin 缺 preflight 映射');
  assert.equal(pkg.bin?.['dsh-deep-research-scaffold'], './scripts/scaffold.mjs', 'bin 缺 scaffold 映射');
});
