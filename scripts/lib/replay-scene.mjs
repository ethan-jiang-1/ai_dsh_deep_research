// Replay manifest consumer: A replay is mandatory; these five B judges cannot be reduced.
import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, join, dirname, isAbsolute, relative, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const JUDGES = ['persona', 'headers', 'agent-instructions', 'skill-catalog', 'runtime-context'];

// Check each component with lstat: realpath alone would accept in-scene symlinks.
function scenePath(base, path, field, directory = false) {
  const fail = (rule) => { throw new Error(`Replay ${field} ${String(path)}: ${rule}; fix snapshot.json`); };
  if (typeof path !== 'string' || path.trim() === '' || isAbsolute(path) || win32.isAbsolute(path) || path.includes('\\') || path.includes('\0')) fail('path must be relative');
  const parts = path.split('/');
  if (parts.some((part) => part === '..' || part === '.' || part === '')) fail('path must stay within its root without traversal');
  const target = resolve(base, path);
  const rel = relative(base, target);
  if (rel.startsWith(`..${win32.sep}`) || rel.startsWith('../') || isAbsolute(rel) || rel === '') fail('path must stay within its root');
  let cursor = base;
  for (let i = 0; i < parts.length; i += 1) {
    cursor = join(cursor, parts[i]);
    let stat;
    try { stat = lstatSync(cursor); } catch (error) { fail(`path must exist (${error.code})`); }
    if (stat.isSymbolicLink()) fail('symlink paths are forbidden');
    if (i < parts.length - 1 || directory) {
      if (!stat.isDirectory()) fail('path must be a directory');
    } else if (!stat.isFile()) fail('path must be a regular file');
  }
  return target;
}

/** Load a snapshot.json scene. roles is the complete preset roster; only selects after validation. */
export function loadReplayScene(sceneDir, roles, { only } = {}) {
  const requested = resolve(sceneDir);
  const dirStat = lstatSync(requested);
  if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) throw new Error(`Replay scene ${requested}: scene must be a directory without symlink`);
  const dir = realpathSync(requested);
  const fail = (message) => { throw new Error(`Replay scene ${dir}: ${message}; fix snapshot.json`); };
  const manifestPath = scenePath(dir, 'snapshot.json', 'manifest');
  let manifest;
  try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); }
  catch (error) { fail(`cannot read snapshot.json: ${error.message}`); }
  const text = (value, field) => {
    if (typeof value !== 'string' || value.trim() === '') fail(`${field} must be a nonempty string`);
  };
  // Provenance must be checkable, not merely present: a garbage anchor makes the recording
  // identity useless. `unknown-historical` stays legal — it is the honest marker for recordings
  // whose origin was not captured, and is never a substitute for a real anchor.
  const provenance = (value, field, kind) => {
    text(value, field);
    if (value === 'unknown-historical') return;
    if (kind === 'hex' && !/^[0-9a-f]{40}$/.test(value)) fail(`${field} must be a 40-hex commit or 'unknown-historical'`);
    if (kind === 'date' && Number.isNaN(Date.parse(value))) fail(`${field} must be a parseable timestamp or 'unknown-historical'`);
  };
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) fail('manifest must be an object');
  if (manifest.version !== 1) fail('version must be 1');
  if (manifest.sessionFormat !== 4) fail('sessionFormat must be 4 (the supported replay format)');
  for (const field of ['scenario', 'profile', 'workspace']) text(manifest[field], field);
  scenePath(ROOT, manifest.workspace, 'workspace', true);
  if (!Array.isArray(roles) || roles.length === 0 || roles.some((role) => typeof role !== 'string' || role.trim() === '') || new Set(roles).size !== roles.length) {
    fail('roles must be a nonempty unique preset roster');
  }
  if (!Array.isArray(manifest.cases) || manifest.cases.length === 0) fail('cases must be nonempty');
  const ids = manifest.cases.map((item) => item?.id);
  if (new Set(ids).size !== ids.length) fail('duplicate case id');
  if (ids.length !== roles.length || ids.some((id) => !roles.includes(id))) fail('cases must match roles exactly');
  const cases = manifest.cases.map((item) => {
    if (item.preset !== item.id) fail(`case ${item.id} preset must match its role`);
    text(item.fixture, `case ${item.id} fixture`);
    if (item.id === 'lead' || item.renderExpected !== undefined) text(item.renderExpected, `case ${item.id} renderExpected`);
    if (!item.source || typeof item.source !== 'object' || Array.isArray(item.source)) fail(`case ${item.id} source must contain recording provenance`);
    for (const [field, kind] of [['codeAnchor', 'hex'], ['vendor', 'hex'], ['recordedAt', 'date'], ['recording', 'text']]) {
      if (kind === 'text') text(item.source[field], `case ${item.id} source.${field}`);
      else provenance(item.source[field], `case ${item.id} source.${field}`, kind);
    }
    if (item.judges !== undefined && (!Array.isArray(item.judges) || item.judges.length !== JUDGES.length || new Set(item.judges).size !== JUDGES.length || item.judges.some((judge) => !JUDGES.includes(judge)))) {
      fail(`case ${item.id} judges must include exactly ${JUDGES.join(', ')}`);
    }
    return {
      ...item, fixture: scenePath(dir, item.fixture, `case ${item.id} fixture`),
      renderExpected: item.renderExpected === undefined ? null : scenePath(dir, item.renderExpected, `case ${item.id} renderExpected`),
      judges: [...JUDGES],
    };
  });
  if (new Set(cases.map((item) => item.fixture)).size !== cases.length) fail('duplicate fixture paths cannot stand in for distinct role recordings');
  if (only !== undefined && !ids.includes(only)) fail(`only ${String(only)} does not name a case`);
  return {
    scenario: manifest.scenario, profile: manifest.profile, workspace: manifest.workspace, sessionFormat: manifest.sessionFormat,
    cases: cases.filter((item) => only === undefined || item.id === only),
  };
}
