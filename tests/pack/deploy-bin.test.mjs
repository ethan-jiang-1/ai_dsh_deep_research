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

const PACK = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages', 'deep-research-pack');
const preflight = readFileSync(join(PACK, 'scripts', 'preflight.mjs'), 'utf8');
const scaffold = readFileSync(join(PACK, 'scripts', 'scaffold.mjs'), 'utf8');
const seedCore = readFileSync(join(PACK, 'scripts', 'lib', 'seed-core.mjs'), 'utf8');
const releaseSmoke = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'scripts', 'smoke', 'release-smoke.mjs'), 'utf8');
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));

test('preflight：检查清单在位（Node/版本/peer/团队层/手册+节点+判型+模板/构建产物/密钥）', () => {
  // record( 调用点级断言：钉运行时检查名，注释里的字样不算数（反证实测：只改 record 名、
  // 留注释 → 必须红——includes() 子串断言会被注释满足而假绿）。
  for (const name of ['Node 版本兼容', 'DSH 版本兼容', '平台 peer 包', '团队机制层', '研究工作区手册', '节点契约', '判型模式库', '工作区 .gitignore', 'run 模板', '工作区种子版本', '构建产物', '模型密钥']) {
    assert.match(preflight, new RegExp(`record\\([^)]*${name}`), `preflight 缺 record 检查项「${name}」——检查清单漂移`);
  }
  assert.match(preflight, /engines\?\.dsh/, 'preflight 版本判据须读 engines.dsh（宿主字段；兼容矩阵只是镜像）');
  assert.match(preflight, /engines\?\.node/, 'preflight 缺 Node engines.node 判据');
  assert.ok(preflight.includes('.credentials.yaml') && preflight.includes('DEEPSEEK_API_KEY'),
    'preflight 密钥检查须双源（环境变量 或 DSH 凭据文件）');
});

test('preflight：Node 范围检查覆盖 engines.node 的 ^/>= 形态', () => {
  assert.match(preflight, /function nodeSatisfies\(version, range\)/,
    'preflight 缺可测试的 nodeSatisfies——Node 检查会退化成硬编码');
  assert.ok(preflight.includes('\\^(\\d+)'), 'nodeSatisfies 未处理 ^ 范围');
  assert.ok(preflight.includes('>=(\\d+)'), 'nodeSatisfies 未处理 >= 范围');
  assert.ok(preflight.includes("split('||')"), 'nodeSatisfies 未处理 || 备选');
  assert.equal(pkg.engines?.node, '^22.19.0 || >=24.0.0', 'engines.node 变了——同步扩 nodeSatisfies 与测试');
});

test('preflight：fail-loud verdict + 失败给补救命令（缺什么说什么、怎么补也说什么）', () => {
  assert.match(preflight, /process\.exit\(hardFail\.length === 0 \? 0 : 1\)/, 'preflight 缺 fail-loud exit 判定——待补项会以退出码 0 溜走');
  assert.match(preflight, /→ \$\{r\.remedy\}/, 'preflight 失败项未打印补救命令（→ remedy）');
});

test('preflight：无 research 且多个 profile 时不按目录顺序任意推断 host', () => {
  assert.match(preflight, /const pick = names\.includes\('research'\) \? 'research' : names\.length === 1 \? names\[0\] : undefined/,
    '多个非 research profile 时必须不选 host，让包位置或显式 --host 决定解析锚');
});

test('preflight：未知 DSH 版本保留退出码 0，但总结必须显式标未验证', () => {
  assert.match(preflight, /const unknown = results\.filter\(\(r\) => r\.ok === null\)/,
    'preflight 未单独识别无法判定项');
  assert.ok(preflight.includes('通过（含未验证项：${unknown.map((r) => r.name).join(\'、\')}）'),
    '默认模式的总结未列出未验证项');
  assert.ok(preflight.includes('安装验收通过（不代表研究就绪；未验证项：${unknown.map((r) => r.name).join(\'、\')}）'),
    '安装模式的总结未列出未验证项');
  assert.match(preflight, /process\.exit\(hardFail\.length === 0 \? 0 : 1\)/,
    '未知项不得改变原 fail-loud 退出码合同（L2 无全局 dsh 时仍 exit 0）');
});

test('scaffold：工作区忽略规则随安装下发（seed.json 的 .gitignore 条目 → 落地 .gitignore）', () => {
  // 为什么钉：种子是"装到就有"的唯一形态；npm pack **永不打包名为 .gitignore 的文件**
  // （files: ["workspace/**"] 也照删），所以包内名是 .gitignore.example，清单键是落地名 .gitignore。
  // 收集器从“只认 .md”改为“按 seed.json 清单”，映射归 seed-core（一处事实）。
  assert.match(seedCore, /destRel === '\.gitignore'\s*\?\s*'\.gitignore\.example'/,
    'seed-core 未把 .gitignore 映射到 .gitignore.example——工作区忽略规则不会随 scaffold 铺开');
  assert.ok(scaffold.includes('seed.json'), 'scaffold 未读取 seed.json 清单');
  assert.ok(scaffold.includes('seedSourceRel'), 'scaffold 未消费 seed-core 的源名映射');
});

test('scaffold：三态形状 + 收尾 preflight + workspace 必填 fail-loud', () => {
  assert.ok(scaffold.includes('--force') && scaffold.includes('--check') && scaffold.includes('--upgrade'),
    'scaffold 缺三态入口（--check / --upgrade / --force）');
  assert.ok(scaffold.includes('跳过'), 'scaffold 缺“跳过已存在”语义');
  assert.match(scaffold, /process\.exit\(2\)/, 'scaffold 缺 --workspace 必填的 exit(2) 前置拦截');
  assert.ok(scaffold.includes('preflight.mjs'), 'scaffold 收尾必须复核 preflight（准备完成 ≠ 检查通过）');
  assert.ok(scaffold.includes('agent-team-profile'), 'scaffold 团队层组合缺失——四角色协作主通道不可用');
});

test('scaffold：团队层版本从 engines.dsh 派生，不装未钉版最新层', () => {
  assert.match(scaffold, /const TEAM_VERSION = pkg\.engines\?\.dsh/,
    'scaffold 未从 engines.dsh 派生团队层版本——会装到与 DSH pin 不匹配的最新层');
  assert.match(scaffold, /const TEAM_SPEC = .*TEAM_VERSION/,
    'scaffold 未把团队层版本拼进安装 spec');
  assert.ok(scaffold.includes("'add', TEAM_SPEC"),
    'scaffold 的 plugin add 未使用带版本的 TEAM_SPEC');
});

test('scaffold：种子三态 + 状态文件 + 方法库保护形状在位', () => {
  assert.match(scaffold, /--check/, 'scaffold 缺只读 --check');
  assert.match(scaffold, /--upgrade/, 'scaffold 缺安全升级 --upgrade');
  assert.match(scaffold, /classifySeedEntry/, 'scaffold 未消费共享三态判据（seed-core）');
  assert.match(scaffold, /\.dsh-research-seed\.json/, 'scaffold 未写工作区种子状态文件');
  assert.ok(scaffold.includes('existsSync(methodSrc) && !existsSync(methodDst)'),
    'scaffold 方法库保护形态漂移——只应在缺失时铺种子');
  assert.ok(scaffold.includes('method-library.md'), 'scaffold 未点名方法库');
});

test('scaffold：收尾 preflight 使用 --profile 对应的 profile 解析锚', () => {
  assert.match(scaffold, /const explicitHost = argOf\('host'\)/,
    'scaffold 未单独保留显式 --host 参数');
  assert.match(scaffold, /const dshHome = resolve\(process\.env\.DSH_HOME \?\? join\(process\.env\.HOME \?\? '', '\.dsh'\)\)/,
    'scaffold 未从 DSH_HOME 或 $HOME/.dsh 确定 profile 根');
  assert.match(scaffold, /const targetHost = join\(dshHome, 'profiles', profile\)/,
    'scaffold 未从 --profile 推导目标 profile 目录');
  assert.match(scaffold, /const preflightHost = explicitHost \?\? \(existsSync\(join\(targetHost, 'package\.json'\)\) \? targetHost : null\)/,
    '未显式 --host 时，scaffold 应仅在目标 profile package.json 在场时推导 host');
  assert.match(scaffold, /const preflightHostArgs = preflightHost === null \? \['--no-host-inference'\] : \['--host', preflightHost\]/,
    '目标 profile 尚未初始化时未禁止 preflight 回退到 research 等其他 profile');
  assert.match(scaffold, /\.\.\.preflightHostArgs/,
    'scaffold 未将显式或推导出的目标 host 参数转发给 preflight');
  assert.match(preflight, /const noHostInference = argv\.includes\('--no-host-inference'\)/,
    'preflight 未识别 scaffold 禁止错误 profile 推断的参数');
  assert.match(preflight, /if \(host === null && !noHostInference && process\.env\.DSH_HOME !== undefined\)/,
    'preflight 仍会在 scaffold 禁止推断时选择其他 profile');
  assert.match(preflight, /const requireFrom = host === null\s*\? noHostInference \? null : createRequire\(import\.meta\.url\)/,
    '目标 profile 不存在时，preflight 仍可能从 pack 位置解析 peer 包');
  assert.match(preflight, /if \(requireFrom === null\) return false/,
    '目标 profile 不存在时，peer/团队检查未按无法解析处理');
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

test('release-smoke：安装域 client 半与 peers-only 断言在位（检查清单漂移是静默失效面）', () => {
  assert.match(releaseSmoke, /join\(installed, 'lib', 'client\.js'\)/, 'release-smoke 缺安装副本 lib/client.js 在场断言');
  assert.match(releaseSmoke, /dependencies === undefined/, 'release-smoke 缺 dependencies 缺席断言（peers-only 发布形状）');
  assert.match(releaseSmoke, /engines\?\.dsh === '0\.2\.1-rc\.2'/, 'release-smoke 缺安装副本 engines.dsh 断言（宿主字段必须随包）');
  assert.match(releaseSmoke, /boot 页模块表含本包 client 行|module-table|模块表/, 'preset-smoke 委托的模块表行断言未登记进 release-smoke 面');
});

test('release-smoke：进程卫生三件在位（超时/锁/释放验证）', () => {
  assert.match(releaseSmoke, /timeoutMs/, 'release-smoke run() 缺超时预算');
  assert.match(releaseSmoke, /release-smoke\.lock|lockDir/, 'release-smoke 缺并发锁');
  assert.match(releaseSmoke, /reclaimPort/, 'release-smoke 缺端口释放验证（释放到静默）');
  assert.match(releaseSmoke, /did not stop; leave runtime files intact/, 'release-smoke 缺退出确认回收的 fail-loud');
});

test('preset-smoke：模块表行断言与请求预算在位', () => {
  const presetSmoke = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'scripts', 'smoke', 'preset-smoke.mjs'), 'utf8');
  assert.match(presetSmoke, /boot 页模块表含本包 client 行/, 'preset-smoke 缺模块表行断言（company postmortem 0002 guardrail）');
  assert.match(presetSmoke, /dsh-deep-research-pack\/client\.js/, '模块表行断言未钉本包 client 路径');
  assert.match(presetSmoke, /AbortSignal\.timeout\(REQUEST_TIMEOUT_MS\)/, 'preset-smoke rpc/boot 页 fetch 缺请求预算');
});

test('bin 入口：两条部署命令在 package.json bin 指向真实脚本', () => {
  assert.equal(pkg.bin?.['dsh-deep-research-preflight'], './scripts/preflight.mjs', 'bin 缺 preflight 映射');
  assert.equal(pkg.bin?.['dsh-deep-research-scaffold'], './scripts/scaffold.mjs', 'bin 缺 scaffold 映射');
});
