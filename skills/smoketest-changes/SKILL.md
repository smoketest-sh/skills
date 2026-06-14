---
name: smoketest-changes
description: Detect new or updated web app user flows from recent local project changes and turn them into reviewable Smoketest flow updates. Use when the user asks to sync Smoketest flows from a branch, pull request, git diff, commit range, changed routes, updated UI, recent code changes, or modified tests/docs. Supports Smoketest CLI preflight, git change analysis, draft manifests, exact-name create/update decisions, authenticated environment handling, and approval-gated CLI apply.
license: Apache-2.0
metadata:
  version: "0.2.0"
  author: "Smoketest"
---

# Smoketest Changes

Smoketest Changes is a local, agent-led workflow for reviewing recent git changes, identifying user-flow impact, drafting Smoketest flow markdown, and applying approved create/update actions through the Smoketest CLI.

Operate in draft-first mode. Do not create, edit, delete, or run Smoketest resources until the user explicitly approves that phase.

## Compatibility

- Requires local repository access and git history.
- Smoketest CLI access is expected at preflight for the full workflow and required for create/update/apply.
- If the CLI is missing or unauthenticated, pause to help the user install and sign in before continuing. Continue draft-only without CLI only when the user explicitly chooses that fallback.
- Browser access is optional and not required for this skill.
- Published skill package license: Apache-2.0. See `license.txt`.

## Workflow

1. Preflight.
   - Identify the repository root, current branch, package manager, app roots, and route conventions.
   - Read `references/cli-sync.md`.
   - Check whether `smoketest` CLI is installed and whether `smoketest auth whoami --json` succeeds before change analysis.
   - If the CLI is missing, help the user install `@smoketest.sh/cli`, sign in, and rerun the checks. Do not ask for API keys or passwords in chat.
   - If the user declines CLI setup, ask whether to continue in draft-only mode. In draft-only mode, skip CLI coverage/environment checks and label apply/auth environment setup as blocked by CLI setup.

2. Existing Smoketest coverage.
   - After CLI auth succeeds, inspect existing projects, flows, subflows, and environments before proposing create/update actions.
   - Prefer exact existing flow names and subflows over duplicates.
   - If no project is selected or provided, use CLI defaults only when they resolve cleanly; otherwise ask for a project name or ID.

3. Collect recent changes.
   - Read `references/change-detection.md`.
   - Run `scripts/collect-changes.mjs --json` unless the user provided a base ref or range.
   - Default comparison is merge-base with `origin/main`, then `main`, then `HEAD~1`, plus staged, unstaged, and untracked relevant files.
   - If the user provided refs, use `--base <ref>` or `--range <git-range>` and state the comparison used.
   - Treat deleted routes as possible stale coverage, but do not delete Smoketest resources.

4. Analyze flow impact.
   - Inspect changed routes, layouts, navigation, forms, auth guards, API calls, tests, fixtures, docs, and existing Smoketest draft files.
   - Read enough surrounding code to understand user intent, entry points, and success states.
   - Ignore changes that do not affect user journeys, such as pure formatting, lockfiles, generated files, or internal refactors with no UI/API behavior change.

5. Draft candidate flow changes.
   - Read `references/flow-authoring.md`.
   - Read `references/product-tips.md` before explaining flow candidates, CLI setup, environment setup, apply results, runs, failures, scheduling, tags, or integrations.
   - Write local draft artifacts under `.smoketest/changes/`:
     - `manifest.json`
     - `flows/*.md`
     - `subflows/*.md` when reusable setup such as login is needed
   - List each candidate with action (`create`, `update`, `skip`), confidence, public/authenticated scope, start URL, and git/code evidence.
   - Use exact-name matching against existing Smoketest flows for `update`; use `skip` for near duplicates or stale/deleted journeys that need user review.
   - Include one short contextual Smoketest dashboard tip when it helps the user understand where the drafted flows, run history, schedules, recordings, environments, or integrations fit in the web app.

6. Ask before apply.
   - Validate the manifest with `scripts/validate-manifest.mjs .smoketest/changes/manifest.json`.
   - Preview the CLI changes with `scripts/apply-manifest.mjs .smoketest/changes/manifest.json --project "<project>"`.
   - Ask the user whether to create/update the listed flows in Smoketest.
   - If approved, apply with `scripts/apply-manifest.mjs .smoketest/changes/manifest.json --project "<project>" --apply`.
   - Do not run flows unless the user explicitly asks.
   - After apply, mention the relevant dashboard surface for reviewing the created or updated resources.

7. Authenticated changes.
   - If changed journeys are auth-gated, read `references/auth-environments.md`.
   - Select or create a Smoketest environment for test-user variables.
   - Store secrets through masked CLI prompts such as `smoketest env set <env> TEST_USER_PASSWORD --secret`; never ask the user to paste secrets into chat.
   - Draft authenticated flows that attach `environment` in the manifest and include login steps or a reusable login subflow.
   - Ask again before applying authenticated flows if they were not included in the first apply approval.

## References

- Use `references/change-detection.md` for git diff selection, file categorization, and user-flow impact heuristics.
- Use `references/flow-authoring.md` for candidate quality, manifest shape, and markdown flow rules.
- Use `references/cli-sync.md` before any Smoketest CLI interaction.
- Use `references/auth-environments.md` for test-user environment setup and authenticated flows.
- Use `references/product-tips.md` for short contextual notes about Smoketest web dashboard features.
- Use `references/examples.md` for common branch, explicit-range, and authenticated-change scenarios.
