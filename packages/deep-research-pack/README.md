---
description: "Deep Research bundle for DSH: five presets, a research cockpit, and traceable reports."
kind: "package-bundle"
---

# dsh-deep-research-pack

English | [中文](README.zh.md)

## Summary

This bundle adds a Deep Research capability to a DSH profile: five agent presets (Lead, Scout,
Analyst, Critic, Method Editor), methodology skills, a Web research cockpit, a fetch-fallback
provider, injected research content, and startup rows that register a workspace and open the first
Lead session. It is a bundle, not a profile or an application: it installs into a user-created
custom profile such as `deep-research`, and the user starts that profile with `dsh --profile`.
Research output stays in the user's workspace; the package itself carries no runtime, launcher, or
installer.

## Table of Contents

- [Use this package](#use-this-package)
  - [Install into a profile](#install-into-a-profile)
  - [Start a research](#start-a-research)
  - [Verify](#verify)
  - [Configure](#configure)
  - [Upgrade and rollback](#upgrade-and-rollback)
  - [Uninstall and data](#uninstall-and-data)
  - [Compatibility](#compatibility)
- [Data](#data)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)
- [License](#license)

## Use this package

### Install into a profile

**1. What it is and where it goes.** A **bundle**: `package.json` declares six patch files under
`dsh.bundle.patch`. It installs into a **custom profile** named `deep-research`; the profile is the
user's named assembly, not something this package ships. After installation the profile's
`dsh.profile.bundles` contains `dsh-deep-research-pack`, and the bundle inserts
`preset-{lead,scout,analyst,critic,method-editor}`, `research-content`, `research-client`,
`research-startup`, `research-fetch-fallback`, and `tool-present`. The team UI row
(`ui-agent-team`) comes from the team-mechanics layer, installed separately in the same profile;
this bundle does not insert it.

**2. How to install (current).** 0.3.0 is delivered as a local tarball; the npm/Plugins page path is
**staged** (no npm publication yet). Install the tarball into the profile:

```sh
dsh plugin --profile deep-research add file:/path/to/dsh-deep-research-pack-<version>.tgz
```

The Plugins page entry becomes available after the package is published to npm. On Desktop that page
manages the application-owned `desktop` profile; that is an interoperability form, not the
`deep-research` custom profile. This package is developed and verified against the Web surface.

**3. Create the custom profile first (only if it does not exist).** DSH has no UI for creating a
custom profile; the CLI is the documented path. `--from-default-profile` is a **destructive
replacement**, not an upgrade:

```sh
dsh --profile deep-research --from-default-profile web --dump-default-config
```

Do not run it on an existing profile: it replaces dependencies and the user patch. Existing
profiles install the current local tarball (npm/Plugins are staged).

**4. CLI installation (package-name form, post-publish; also Web automation or offline).**
`dsh plugin --profile` forwards to pnpm. For 0.3.0 the current install is the local tarball in
step 2; the package-name form below applies after npm publication and to Web automation/offline.
npm/source `dsh` refuses the `desktop` profile; the
Desktop application's own carrier can manage it, but third-party instructions should stay on
explicit non-`desktop` profiles:

```sh
dsh plugin --profile deep-research add dsh-deep-research-pack@<version>
dsh plugin --profile deep-research add @deepseek-ai/dsh-experimental-agent-team-profile@<exact dsh --version>
```

For headless, SDK, and ACP profiles there is no Plugins page; use the same `dsh plugin --profile`
form with that explicit profile. Offline, replace the package spec with
`file:/path/to/dsh-deep-research-pack-<version>.tgz`.

**5. The team layer.** The Agent Teams composition is a separate, official experimental bundle. Do
not use `@latest`: its `latest` does not track the running DSH version. Install the exact version
printed by `dsh --version`, or enable it from the same Plugins page. **Multi-role research needs this
layer**: without it the Lead preset loads but its team tools are absent, and `doctor` reports a
failure. A quick-factual-only profile can skip it.

**6. What “installed” means.** There are three independent states: pnpm exits 0, the dependency is
written, and the package appears in `dsh.profile.bundles`. Only the third activates the layer.
A package without `dsh.bundle.patch` is only a dependency: the CLI exits 0 with a warning, while the
in-app path fails with `not-bundle`. After a membership change, restart the profile.

**7. Runtime and version.** This package does not ship DSH. Use a DSH from npm or the official
Desktop; the bundle declares `engines.dsh` and the host checks it. Registry/path specs are rejected
before installation when incompatible; git/tarball specs can be judged after installation and
repaired, and boot checks every bundle again. Do not rely on a version exemption.

### Start a research

Open a session in the workspace and ask a research question. The Lead runs HITL1 (type, depth,
language, optional business brief), proposes a method and plan, then leads Scout, Analyst, and Critic
through the run. HITL2 is the final review before delivery. The full operating guide is
[`_dist/安装手册.md`](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/_dist/%E5%AE%89%E8%A3%85%E6%89%8B%E5%86%8C.md)
and the development-side run playbook is
[`docs/guides/61-run-playbook.md`](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/guides/61-run-playbook.md).

### Verify

```sh
dsh --profile deep-research --dump-config
dsh --profile deep-research --no-open --port 0
```

`--dump-config` must show the row ids listed above, and stderr must not contain
`patch: entry "…" not found`. A real start must print a `dsh web:` token URL without
`did not activate` or `ERR_MODULE_NOT_FOUND`. In the UI, the package appears as “Deep Research”
with an icon; the right sidebar gains research status, configuration, graph, and final-report tabs;
the main surface gains the method-library tab.

### Configure

- **Defaults** live in the bundle patch and ship with the package.
- **User overrides** live in the profile patch; machine-wide preferences live in
  `$DSH_HOME/cordis.patch.yml`; a one-shot diagnostic can use `--patch`.
- **Whole-entry replacement**: a patch replaces a row's entire `config`; restating only one field
  drops required fields and can fail a required plugin at boot.
- **Settings page**: only `research-fetch-fallback.enabled` is marked `.volatile()`, so it is the
  only field exposed by the Settings UI and it applies immediately. Timeouts and other fields need
  a profile patch or `--patch`.
- **Workspace and last session** live in `$DSH_HOME/deep-research/settings.json`, a package-owned
  home file, not DSH global settings. Resolution order:
  `DEEP_RESEARCH_WORKSPACE` → that file → first-screen chooser.
- **Credentials** come from DSH: the Models page, the credentials service, the environment, or
  `$DSH_HOME/.credentials.yaml`. The package never bundles or forwards a key. Search uses
  `DEEPSEEK_API_KEY`; the fetch fallback resolves the same ref and reports
  `fallback unavailable` when it is missing.

### Upgrade and rollback

For 0.3.0, update by installing the new tarball (the same command as step 2, pointing at the
new file); after npm publication the Plugins page Update or the package-name form also work.
Then **restart the profile** when bundle membership changes.
Configuration-only edits can hot-reload when HMR is enabled. DSH has no command-level rollback:
rollback is reinstalling the old exact version, and the old package must satisfy the running DSH's
`engines.dsh`. Workspace data does not roll back.

### Uninstall and data

```sh
dsh plugin --profile deep-research remove dsh-deep-research-pack
dsh plugin --profile deep-research remove @deepseek-ai/dsh-experimental-agent-team-profile
```

Removal deletes the package and its patch layer. It does not delete the workspace, the method
library, the profile, `$DSH_HOME/deep-research/settings.json`, session logs, credentials, or
Workspace registrations. Delete the profile and settings directory explicitly only when you want
them gone. The full per-fact table is [Data](#data).

### Compatibility

| Item | Value |
|---|---|
| `engines.dsh` | `>=0.2.1-rc.2 <=0.2.1-rc.5` (host authority; tested band only) |
| Tested baseline | `0.2.1-rc.2` (development pin, data plane + client) + `0.2.1-rc.3` (install shape + client mount) + `0.2.1-rc.5` (install + product first screen + client mount). `0.2.1-rc.4` is inside the range but was not separately exercised. |
| Node | `^22.19.0 || >=24.0.0` |
| Surface | Web; Desktop is interoperability only; headless/SDK/ACP are not supported by this package |

Dependency tiers: `remote.workspaceFiles` and `session.follow` are N0 core; `tool-present`,
`session-query-sqlite`, and `ctx.credentials` are N1 native plugins; the Agent Teams packages are
N2 experimental (`@deepseek-ai/dsh-experimental-agent-team-profile`, client peer `@deepseek-ai/dsh-experimental-client-ui-agent-team`) and may change or disappear; this package has no E1 community dependency. The
bundle does not write the team packages into `dependencies`.

## Data

One row per fact. Owner, authority, source, readers, and writers are separate roles; do not merge
them into one label.

| Fact | Owner | Authority | Source | Mechanism/path | Scope/key | Readers | Writers | Rebuildability | Retention/deletion |
|---|---|---|---|---|---|---|---|---|---|
| Presets, skills, manual, templates, startup rows | Package | Package version | Package build | Install copy `node_modules/dsh-deep-research-pack/` | Profile install | Model (injected), user | None at runtime | Reinstall | Removed with package |
| `deep-research` profile composition + team layer | User / DSH | Profile manifest | Profile init + plugin add | `$DSH_HOME/profiles/deep-research/` | Profile | DSH, user | DSH, plugin commands | Recreate profile | User deletes; package removal keeps it |
| Deep Research settings (workspace, last session) | Package / user | File | Startup row, user | `$DSH_HOME/deep-research/settings.json` | Home | Startup row, doctor, user | Startup row, user | Re-select workspace | Delete directory; package removal keeps it |
| Browser workspace hint | Browser | DSH Workspace registry | Client | `localStorage['dsh.deep-research.workspaceId.v1']` | Device/origin | Client | Client | Re-select workspace | Clear site data |
| Method library | User | File | User, Lead, Method Editor | `<workspace>/method-library.md` | Workspace | User, model | User, Lead, Method Editor tools | No (user data) | User deletes; package removal keeps it |
| Run bundle | User | Files + journal | Roles | `<workspace>/drt_<slug>/`, `archive/`, `_abandoned/` | Workspace + slug | Model, user | Roles, ops | No | User deletes; no automatic GC |
| Run state header | Run | Facts + journal | Roles | `<bundle>/run.md` | Run | Model, ops | Roles, ops | Derived | Follows bundle |
| Delivery and audit receipts | Run / ops | Files + session log | `present`, ops | `delivered.json`, `manifest.json`, `acceptance.md`, `audit.md`, `node-gate.md` | Run | User, ops | Ops | Ops re-run | Follows bundle; audit needs local sessions |
| Session logs | DSH | DSH session log | Session | `$DSH_HOME/sessions/` | Session | Model, user | DSH | No | DSH manages; package removal keeps it |
| Credentials | DSH / provider | Provider | User | `$DSH_HOME/.credentials.yaml`, environment | Home | Provider, plugin by reference | User, DSH | Re-enter | DSH manages; never exported |
| Agent Teams layer | Vendor experimental | Installed package | Plugins page / CLI | Profile dependency + bundle rows | Profile | User, plugin | User, DSH | Reinstall | User removes; package removal keeps it |
| Sidebar layout | Vendor / browser | Browser | Client | `localStorage['dsh.sidebar-right.v1.<sessionId>']` | Device | Client | Client | Reset | Clear site data |

**Secrets and portability.** Secrets exist only in DSH credentials; the package stores none and
forwards none. Run bundles and the method library travel with the workspace; delivery receipts
travel with the bundle; `audit.md`, `node-gate.md`, and session-derived evidence need the original
`$DSH_HOME/sessions` and do not travel. A shared `$DSH_HOME` shows other workspaces and sessions;
use a separate `DSH_HOME` for a clean environment.

## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

`cordis.patch.yml` is the bundle layer. It sets the preset roster default (`lead`), re-points
`web` (search + fetch selection), `llm-deepseek` (retry policy), `session-query-sqlite`
(`openAt: first-search`, `path: ':memory:'`), and `agent-preset-registry`, and inserts
`research-fetch-fallback`, `tool-present`, and the package's content, startup, and client rows.
The team UI row (`ui-agent-team`) belongs to the team-mechanics layer, not this patch. `presets/<role>.patch.yml` is
one `@deepseek-ai/dsh-agent-preset` row per role; `presets/<role>/skills/` holds the role's
methodology skills. `content/` is injected as runtime context, not written into the workspace.

| Path | Role |
|---|---|
| `cordis.patch.yml` | Host bundle rows and default preset |
| `presets/*.patch.yml` | Five preset rows |
| `presets/*/skills/` | Role-scoped methodology skills |
| `content/manual.md`, `content/templates/run/` | Injected manual and run templates |
| `src/content/`, `src/startup/`, `src/client/`, `src/fetch-fallback/` | Source for the injected content, startup row, cockpit, and fetch provider |
| `scripts/doctor.mjs` | Read-only `dsh-deep-research-doctor` |

</details>

## Further Exploration

- [Install and usage manual](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/_dist/%E5%AE%89%E8%A3%85%E6%89%8B%E5%86%8C.md)
- [Run-form contract](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/guides/65-run-forms.md)
- [Plugin-author entry](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/guides/62-plugin-authoring.md)
- [Research cockpit design](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/design/40-research-cockpit.md)
- [Release and versioning](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/guides/64-release-versioning.md)

## Model Experience

### Method Editor library operations

#### What the model sees

Only the Method Editor Agent sees `method_library_upsert`, `method_library_set_default`, and
`method_library_remove`. Each explicit page action is a durable user message beginning with
`【方法库操作】`; it carries one `operationId`, action and target name, plus an entry SHA-256 for
saves. The save tool also receives `operationHash` and `defaultAction`; the default and remove tools
receive only the operation-specific action/name. Successful responses give a short textual result,
while `presentationMeta` carries structured operation data for the Client. The default marker is not
part of `method-draft`; only explicit page actions can change it.

#### Token effect

A deterministic Method Editor Loader scenario prices the actual first request as the sum of its
model-visible messages and tool schemas with DSH's fixed-density estimator. It compares that request
with the same messages and the earlier upsert/remove schemas; the current fixture measures 6,778
first-turn input tokens, of which the schema change is +246. This is a comparative estimate, not
provider-specific tokenization or billing; each save request also includes its complete method entry
and command marker.

#### KV Cache effect

Tool schemas are stable within a Method Editor request series; a newly selected Agent receives its
composed schema in the request header. Per-operation command text and the method entry are appended
as user content, so they do not replace the preceding conversation prefix. The bundle's other rows
are composition carriers; their model-facing behavior is owned by the inserted row packages.

## Known Limitations and Deferred Work

- **First-screen workspace**: the default is the shared `$DSH_HOME`; a browser with a saved session
  may open the previous workspace. The client uses `dsh.sessions.current` and the workspace hint key
  to switch back; deterministic selection is deferred.
- **Workspace chooser**: the first-screen “choose project directory” uses the native chooser;
  browse-only deployments have no dedicated directory browser and report the error rather than
  pretending success.
- **Host session creation is best-effort**: the webserver listens before a readiness gate exists;
  the client falls back to a blank session or onboarding.
- **Method library scope**: it is workspace-local user data; it does not follow a different
  workspace and has no version history or cross-device sync. It is written only through the
  Method Editor Host tools or the Lead's explicit workspace edit.
- **Agent Teams**: the team packages are N2 experimental; the API may change or disappear, and the
  version must match the running DSH.
- **Fetch fallback**: it rescues only local failures (timeout, cross-origin redirect, unsupported
  content type, transport error, 5xx); it does not rescue 4xx, blocked URLs, invalid URLs, or user
  cancellation. API fallback text carries a source marker and hides the final URL.
- **Credentials**: the fallback reads an API-key ref only; a DeepSeek account session can drive chat
  and search but not the fallback.
- **Platform**: macOS is the tested baseline; Linux is expected through npm; Windows and the full
  Desktop path are not claimed.

## Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Repository docs, not package instructions: [plugin-author entry](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/guides/62-plugin-authoring.md),
[addition of a research role](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/.agents/skills/adding-a-research-role/SKILL.md),
[release and versioning](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/guides/64-release-versioning.md).
The install steps above are the verified path; package contents are generated by `pnpm build` and
`npm pack`.

</details>

## License

MIT — see [LICENSE](LICENSE).
