# Flow Authoring

Use this reference when drafting candidate Smoketest flows from browser and code evidence.

## Candidate Principles

- Draft one journey per flow.
- Prefer business-critical journeys over generic page checks.
- Use browser evidence for what users actually see.
- Use code evidence for route intent, auth boundaries, redirects, form names, success states, and hidden app areas.
- Write smoke tests for stable user functionality, not mutable page copy. A good flow should keep passing when marketing headlines, blog titles, changelog entries, prices, dates, counts, or docs section names change without breaking the journey.
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
- Verify the pricing page loads and exposes plan or subscription options.
- Follow a primary signup, trial, or get-started call to action.
- Verify the public auth entry loads without entering credentials.
```

Rules:

- Start with a clear heading.
- Use sequential bullets.
- End with a concrete observable outcome.
- Prefer stable capabilities over exact copy: navigation works, a list exists, an article opens, a form field is available, a non-destructive boundary is respected, an authenticated area requires login, or a CTA reaches the expected next step.
- Reference exact visible UI text only for stable controls, form labels, durable nav items, or contractual product language. Avoid exact headlines, blog/changelog titles, dates, counts, prices, generated content, or other frequently edited copy.
- For resource pages such as blog, changelog, docs, help, or release notes, select the first available item or a category/control by role and verify the destination loads with readable content; do not depend on a specific latest title or body copy.
- Use variable names such as `TEST_USER_EMAIL`; never include secret values.
- Keep each flow focused enough that failures are easy to diagnose.

## Resilient Examples

Prefer this:

```markdown
## Blog article navigation

- Open the blog index.
- Verify a list of published articles is visible.
- Open the first available article without relying on a specific title.
- Verify the article page loads with readable content.
- Return to the blog index and verify the article list is still reachable.
```

Avoid this:

```markdown
## Blog latest article

- Open the blog index.
- Verify the page says `Our new launch headline`.
- Open the latest article, `Exact Article Title`.
- Verify the article explains a specific paragraph from today's post.
```

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
