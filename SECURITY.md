# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private
vulnerability reporting for this repository:

<https://github.com/ethan-jiang-1/ai_dsh_deep_research/security/advisories/new>

Include the affected package/version, a minimal reproduction or description, and
what an attacker could do. We will acknowledge the report and coordinate a fix and
disclosure.

## Scope

The distributed artifact is the `dsh-deep-research-pack` npm package. The pinned
DSH source under `vendor/dsh` is a separate upstream project; report upstream
harness issues to the DSH repository.

Never include real credentials, session logs, or user research data in a report.
The development setup keeps credentials in `runtime/harness-home/.credentials.yaml`,
which is gitignored and must stay uncommitted.
