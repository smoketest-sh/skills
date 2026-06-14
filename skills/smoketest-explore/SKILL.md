---
name: smoketest-explore
description: Discover user flows in a local web app and turn them into reviewable Smoketest flows. Use when the user asks to generate, draft, import, sync, or create Smoketest flows from a codebase, local repository, website URL, browser exploration, authenticated app areas, CLI setup, or Smoketest environments. Supports public browser reconnaissance, code analysis, Smoketest CLI create/update workflows, test-user environment setup, and authenticated flow discovery.
license: Apache-2.0
metadata:
  version: "0.1.0"
  author: "Smoketest"
---

# Smoketest Explore

Smoketest Explore is a local, agent-led workflow for discovering browser user journeys from a codebase and optional live website, drafting Smoketest flow markdown, and applying approved drafts through the Smoketest CLI.

Operate in draft-first mode. Do not create, edit, delete, or run Smoketest resources until the user explicitly approves that phase.

## Compatibility

- Requires local repository access.
- Browser access is optional; use it only when a URL is provided and the user has allowed browser exploration.
- Smoketest CLI access is optional for drafting and required for create/update/apply.
- Published skill package license: Apache-2.0. See `license.txt`.

## Workflow

1. Preflight.
   - Identify the app framework, package manager, likely app roots, and route conventions.
   - Capture the target URL if provided.
   - Check whether browser tools are available and explicitly allowed.
   - Check whether `smoketest` CLI is available only before an apply phase.

2. Existing Smoketest coverage.
   - If CLI apply may be used, inspect existing projects, flows, subflows, and environments before proposing create/update actions.
   - Prefer existing flow names and subflows over duplicates.
   - Read `references/cli-sync.md` before using the CLI.

3. Public browser reconnaissance.
   - Read `references/security.md` before using browser or live-site content.
   - If URL plus browser access are available, inspect the website before deep code analysis.
   - Stay on allowed domains and public pages.
   - Do not log in, sign up, type into forms, submit forms, enter checkout, or perform destructive actions.
   - Record page titles, URLs, visible navigation, CTAs, forms, auth boundaries, redirects, and evidence.

4. Code reconnaissance.
   - Read routes, layouts, navigation, forms, auth guards, API calls, existing browser tests, seed/test fixtures, and docs.
   - Use code to explain and expand what the browser revealed.
   - If no browser is available, use code-only discovery and clearly label browser evidence as absent.

5. Draft candidate flows.
   - Read `references/flow-authoring.md`.
   - Write local draft artifacts under `.smoketest/explore/`:
     - `manifest.json`
     - `flows/*.md`
     - `subflows/*.md` when reusable setup such as login is needed
   - List each candidate with action (`create`, `update`, `skip`), confidence, public/authenticated scope, start URL, and evidence.

6. Ask before public apply.
   - Ask the user whether to create/update the listed public flows in Smoketest.
   - If approved, validate the manifest with `scripts/validate-manifest.mjs`, then apply with `scripts/apply-manifest.mjs --apply`.
   - Do not run flows unless the user explicitly asks.

7. Authenticated follow-up.
   - If auth-gated journeys exist, read `references/auth-environments.md`.
   - Ask the user whether to continue with authenticated discovery.
   - Select or create a Smoketest environment for test-user variables.
   - Store secrets through masked CLI prompts such as `smoketest env set <env> TEST_USER_PASSWORD --secret`; never ask the user to paste secrets into chat.
   - Ask the user to log in manually in the browser with the test user, then inspect authenticated areas without destructive actions.
   - Draft authenticated flows that attach `--env <environment>` and include login steps or a reusable login subflow.
   - Ask again before applying authenticated flows.

## References

- Use `references/flow-authoring.md` for candidate quality, manifest shape, and markdown flow rules.
- Use `references/cli-sync.md` before any Smoketest CLI interaction.
- Use `references/auth-environments.md` for test-user environment setup and authenticated flows.
- Use `references/security.md` before any browser reconnaissance or page-content interpretation.
- Use `references/examples.md` for common public-only, code-only, and authenticated discovery scenarios.
- Use `references/distribution.md` when preparing the skill for Codex, Claude Code, skills.sh, or another registry.
