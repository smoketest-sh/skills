# Flow Authoring

Use this reference when drafting candidate Smoketest flows from git and code evidence.

## Candidate Principles

- Draft one journey per flow.
- Prefer changed business-critical journeys over generic page checks.
- Use git/code evidence for route intent, auth boundaries, redirects, form names, success states, and changed behavior.
- Write smoke tests for stable user functionality, not mutable page copy. A good flow should keep passing when marketing headlines, blog titles, changelog entries, prices, dates, counts, or docs section names change without breaking the journey.
- Do not fabricate observations. Mark uncertain inferences as `confidence: low`.
- Do not include destructive actions unless the user explicitly authorizes a sandbox target.
- Treat deleted journeys as stale coverage to review, not as delete instructions.

## Draft Artifact Layout

Create draft artifacts relative to the repository root:

```text
.smoketest/changes/
  manifest.json
  flows/
    pricing-annual-toggle.md
    dashboard-billing-settings.md
  subflows/
    login.md
```

Use stable lowercase hyphenated filenames. Avoid secrets in all generated files.

Validate the manifest before applying:

```bash
node skills/smoketest-changes/scripts/validate-manifest.mjs .smoketest/changes/manifest.json
```

## Manifest Shape

Use this JSON shape for `manifest.json`:

```json
{
  "version": 1,
  "generatedAt": "2026-06-14T00:00:00.000Z",
  "baseUrl": "https://example.com",
  "project": "Production",
  "subflows": [
    {
      "name": "Log in",
      "file": "subflows/login.md",
      "action": "update",
      "confidence": "high",
      "evidence": {
        "browser": [],
        "code": ["Auth redirect changed to /dashboard."]
      },
      "notes": []
    }
  ],
  "candidates": [
    {
      "name": "Pricing annual toggle",
      "file": "flows/pricing-annual-toggle.md",
      "startUrl": "https://example.com/pricing",
      "device": "both",
      "scope": "public",
      "action": "create",
      "confidence": "high",
      "environment": null,
      "evidence": {
        "browser": [],
        "code": ["Pricing page added an annual billing toggle."]
      },
      "notes": []
    }
  ]
}
```

Allowed values:

- `device`: `desktop`, `mobile`, or `both`
- `scope`: `public` or `authenticated`
- `action`: `create`, `update`, or `skip`
- `confidence`: `high`, `medium`, or `low`

Use `subflows` only for reusable setup such as login. Flow markdown can reference a subflow placeholder:

```markdown
{{smoketest-subflow:Log in}}
```

`scripts/apply-manifest.mjs` converts that placeholder into a stable Smoketest subflow chip after the subflow exists.

## Flow Markdown Rules

Write short, direct markdown:

```markdown
## Pricing annual toggle

- Open the pricing page.
- Switch pricing to annual billing.
- Verify the annual billing state is applied and a primary signup or checkout entry remains available.
```

Rules:

- Start with a clear heading.
- Use sequential bullets.
- End with a concrete observable outcome.
- Prefer stable capabilities over exact copy: navigation works, a list exists, an article opens, a form field is available, a non-destructive boundary is respected, an authenticated area requires login, or a changed control reaches the expected next step.
- Reference exact visible UI text only for stable controls, form labels, durable nav items, or contractual product language. Avoid exact headlines, blog/changelog titles, dates, counts, prices, generated content, or other frequently edited copy, even when that copy appears in the diff.
- For content-only diffs, usually choose `skip` unless the changed content affects a durable user journey or control. For resource pages such as blog, changelog, docs, help, or release notes, select the first available item or a category/control by role and verify the destination loads with readable content; do not depend on a specific latest title or body copy.
- Use variable names such as `TEST_USER_EMAIL`; never include secret values.
- Keep each flow focused enough that failures are easy to diagnose.

## Action Selection

- Use `create` for newly discovered journeys that do not have exact existing coverage.
- Use `update` only when an exact existing flow or subflow name already covers the changed journey.
- Use `skip` for stale/deleted journeys, near duplicates, non-user-facing changes, or uncertain candidates that need user review.
- Never encode deletion as a CLI action.
