# Flow Authoring

Use this reference when drafting candidate Smoketest flows from browser and code evidence.

## Candidate Principles

- Draft one journey per flow.
- Prefer business-critical journeys over generic page checks.
- Use browser evidence for what users actually see.
- Use code evidence for route intent, auth boundaries, redirects, form names, success states, and hidden app areas.
- Do not fabricate observations. Mark uncertain inferences as `confidence: low`.
- Do not include destructive actions unless the user explicitly authorizes a sandbox target.

## Draft Artifact Layout

Create draft artifacts relative to the repository root:

```text
.smoketest/explore/
  manifest.json
  flows/
    homepage-pricing.md
    signup-entry.md
  subflows/
    login.md
```

Use stable lowercase hyphenated filenames. Avoid secrets in all generated files.

Validate the manifest before applying:

```bash
node skills/smoketest-explore/scripts/validate-manifest.mjs .smoketest/explore/manifest.json
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
      "action": "create",
      "confidence": "high",
      "evidence": {
        "browser": ["Login page has email and password fields."],
        "code": ["Auth route redirects to /dashboard after login."]
      },
      "notes": []
    }
  ],
  "candidates": [
    {
      "name": "Homepage to pricing",
      "file": "flows/homepage-pricing.md",
      "startUrl": "https://example.com",
      "device": "both",
      "scope": "public",
      "action": "create",
      "confidence": "high",
      "environment": null,
      "evidence": {
        "browser": ["Homepage nav exposes Pricing link."],
        "code": ["Route file confirms /pricing page."]
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
## Homepage to pricing

- Open the homepage.
- Use the main navigation to open pricing.
- Verify the pricing page shows available plans and a primary signup or trial CTA.
```

Rules:

- Start with a clear heading.
- Use sequential bullets.
- End with a concrete observable outcome.
- Reference visible UI text when it was observed.
- Use variable names such as `TEST_USER_EMAIL`; never include secret values.
- Keep each flow focused enough that failures are easy to diagnose.

## Public Flow Selection

Prefer:

- Homepage to pricing
- Homepage to product/features
- Docs/search/navigation
- Public signup entry without account creation
- Public contact/demo page reachability without form submission
- Blog/changelog/resource navigation only when it is product-relevant

Avoid:

- Account creation unless explicitly authorized
- Checkout/payment
- Admin/private/customer data pages
- Form submissions without explicit permission
- Flows that only verify the homepage loads, unless no stronger journey exists
