# Examples

Use these examples to calibrate common `smoketest-changes` tasks.

## Branch Diff

User:

```text
Use smoketest-changes to sync flows from this branch.
```

Expected behavior:

- Check Smoketest CLI install/auth first.
- Inspect existing projects, flows, subflows, and environments.
- Run `scripts/collect-changes.mjs --json`.
- Read changed route/UI/test/doc files and surrounding code.
- Draft `.smoketest/changes/manifest.json` and flow markdown.
- Validate and dry-run the manifest.
- List candidates and ask before applying.
- Include a short dashboard tip when listing planned flow updates.

Example candidate:

```text
Update: Billing settings
Scope: authenticated
Confidence: high
Evidence: apps/web/app/dashboard/billing/page.tsx adds invoice download CTA; billing.spec.ts expects invoice history.
```

## Explicit Range

User:

```text
Use smoketest-changes for origin/main...HEAD.
```

Expected behavior:

- Run `scripts/collect-changes.mjs --range origin/main...HEAD --json`.
- State that the explicit range was used.
- Still include staged, unstaged, and untracked relevant files when present.

## Deleted Route

If a route was deleted:

- Do not delete Smoketest flows.
- Propose `skip` with a note such as `Route removed; possible stale flow needs human review`.
- Ask the user whether they want separate cleanup guidance.

## Authenticated Change

If changed files affect protected routes:

- Read `references/auth-environments.md`.
- Select or create an environment.
- Store secrets only through masked CLI prompts.
- Attach `environment` to authenticated candidates.

Example flow markdown:

```markdown
## Billing settings

- {{smoketest-subflow:Log in}}
- Open billing settings.
- Verify invoice history and the download invoice action are visible.
```

Example dashboard tip:

```text
Quick tip: after these updated flows are applied, the Smoketest web dashboard shows each run's verdict, step log, screenshots, and replayable recording from the flow history.
```
