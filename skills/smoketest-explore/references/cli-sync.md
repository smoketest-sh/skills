# CLI Sync

Use this reference before any Smoketest CLI interaction. The full explore workflow starts by checking CLI availability and authentication. Draft-only discovery can proceed without the CLI only when the user explicitly chooses that fallback; create/update/apply always requires the CLI.

## Safety Rules

- Ask for explicit approval before creating or editing Smoketest resources.
- Do not delete flows, subflows, environments, or runs as part of this skill.
- Do not run flows unless the user explicitly asks.
- Prefer `--json` for machine-readable output.
- Use `--description @file` for generated flow markdown.
- Do not pass secret values in command arguments unless the user explicitly chooses automation; prefer masked prompts.

## Manifest Scripts

Validate generated drafts:

```bash
node skills/smoketest-explore/scripts/validate-manifest.mjs .smoketest/explore/manifest.json
```

Preview CLI changes without mutation:

```bash
node skills/smoketest-explore/scripts/apply-manifest.mjs .smoketest/explore/manifest.json --project "<project>"
```

Apply after explicit user approval:

```bash
node skills/smoketest-explore/scripts/apply-manifest.mjs .smoketest/explore/manifest.json --project "<project>" --apply
```

The apply script performs exact-name upserts to avoid duplicate flows and subflows. It creates missing resources and updates existing exact-name matches.

## CLI Setup Gate

Run this gate before browser or code reconnaissance:

```bash
command -v smoketest
smoketest --version
smoketest auth whoami --json
```

If `command -v smoketest` fails, pause and help the user install the CLI. Prefer a global install so later `smoketest` commands and `scripts/apply-manifest.mjs` work without extra wrappers:

```bash
npm install --global @smoketest.sh/cli
smoketest init
```

If the user only wants a one-shot setup command, offer:

```bash
npx @smoketest.sh/cli init
```

After any one-shot setup, still recheck `command -v smoketest`. If the binary is not on `PATH`, explain that full apply/sync steps need the installed `smoketest` command and ask whether to install globally or continue draft-only.

If the CLI is installed but `smoketest auth whoami --json` fails, help the user sign in:

```bash
smoketest auth login
smoketest auth whoami --json
```

For local use, prefer the interactive `smoketest auth login` prompt. Do not ask the user to paste API keys into chat; if they choose API-key auth, let the CLI collect it through its prompt or documented masked path.

Continue the workflow only after `smoketest auth whoami --json` succeeds, unless the user explicitly chooses draft-only mode.

## Preflight Commands

After the setup gate succeeds, inspect the active workspace and projects:

```bash
smoketest auth whoami --json
smoketest projects list --json
```

If a project is not specified, use the active default only if the CLI resolves it cleanly. Otherwise ask the user for the project name or ID.

Inspect current coverage:

```bash
smoketest flows list --project "<project>" --json
smoketest subflows list --project "<project>" --json
smoketest env list --project "<project>" --json
```

## Create Or Update Flows

Create a new flow:

```bash
smoketest flows create \
  --project "<project>" \
  --name "Homepage to pricing" \
  --url "https://example.com" \
  --description @.smoketest/explore/flows/homepage-pricing.md \
  --device both \
  --json
```

Update an existing flow by exact name or ID:

```bash
smoketest flows edit "Homepage to pricing" \
  --project "<project>" \
  --url "https://example.com" \
  --description @.smoketest/explore/flows/homepage-pricing.md \
  --device both \
  --json
```

Attach an environment for authenticated flows:

```bash
smoketest flows create \
  --project "<project>" \
  --name "Dashboard overview" \
  --url "https://example.com/login" \
  --description @.smoketest/explore/flows/dashboard-overview.md \
  --device both \
  --env "<environment>" \
  --json
```

## Duplicate Handling

- Match existing flows by exact name first.
- If an exact name exists, propose `update`.
- If a near duplicate exists, propose `skip` or ask the user.
- Keep existing schedules, tags, and environment assignments unless the user approves changes.

## Apply Summary

After apply, report:

- Created flows
- Updated flows
- Skipped flows
- Environment used
- Any commands that failed and why
