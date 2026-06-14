# Change Detection

Use this reference when deciding which recent project changes can create or update Smoketest flows.

## Diff Source

Default to branch-style comparison:

```bash
node skills/smoketest-changes/scripts/collect-changes.mjs --json
```

The collector chooses the first available base:

1. merge-base with `origin/main`
2. merge-base with `main`
3. `HEAD~1`

Use an explicit base when the user names one:

```bash
node skills/smoketest-changes/scripts/collect-changes.mjs --base origin/develop --json
```

Use an explicit range when the user gives a complete range:

```bash
node skills/smoketest-changes/scripts/collect-changes.mjs --range main...HEAD --json
```

Include staged, unstaged, and untracked relevant files in the analysis. State the comparison and working-tree additions in the response.

## Relevant Files

Prioritize changes that affect browser-visible journeys:

- routes, pages, layouts, navigation, menus, links, CTAs
- forms, validation, empty states, loading states, success states, error states
- auth guards, redirects, onboarding, billing, settings, checkout, account flows
- API calls or server actions directly used by changed UI
- existing browser/e2e tests, fixtures, seeds, and docs that describe product behavior

Usually ignore:

- lockfiles and package-manager metadata
- `.env`, private keys, and credential files
- generated files, snapshots, build output, coverage, caches
- formatting-only changes
- internal refactors that do not change UI, routing, validation, auth, or observable API behavior
- files under `.smoketest/` unless the user explicitly asks to apply existing drafts

## Flow Impact Heuristics

Map changes to Smoketest candidates:

- New route or page: propose a `create` flow when it exposes a meaningful user journey.
- Changed route or UI: propose an `update` when an existing exact-name flow covers that journey.
- Changed validation or success state: update the relevant flow outcome assertions.
- Changed auth guard or protected route: mark the flow `authenticated` and require an environment.
- Changed reusable setup: draft or update a subflow.
- Deleted route or removed journey: report stale coverage as `skip`; do not delete Smoketest resources.
- Unclear user impact: mark `confidence: low`, explain the evidence gap, and ask before applying.

Prefer business-critical journeys over broad page-load checks. Keep one user journey per flow.

## Evidence

Use concrete evidence in each manifest candidate:

```json
"evidence": {
  "browser": [],
  "code": [
    "app/(marketing)/pricing/page.tsx changed the plan CTA copy.",
    "tests/e2e/pricing.spec.ts now expects the annual billing toggle."
  ]
}
```

For this skill, `browser` evidence is usually empty unless the user explicitly asks for browser confirmation. Do not invent browser observations.
