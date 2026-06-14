# Examples

Use these examples as patterns when applying the skill in real repositories.

## Public Browser Plus Code

User prompt:

```text
Use $smoketest-explore to discover public user flows from this repo and https://staging.example.com.
```

Expected behavior:

- Check that `smoketest` is installed and signed in before exploration. If not, help install `@smoketest.sh/cli` and run `smoketest auth login` or `smoketest init` before continuing.
- Inspect the live site first if browser access is available.
- Read code routes, navigation, forms, and tests second.
- Draft `.smoketest/explore/manifest.json` and flow markdown.
- List candidates and ask before applying.

Example candidate:

```markdown
## Homepage to pricing

- Open the homepage.
- Use the main navigation to open pricing.
- Verify the pricing page shows plan tiers and a primary signup CTA.
```

## Code-Only Fallback

User prompt:

```text
Use $smoketest-explore without browser access to draft Smoketest flows from the local codebase.
```

Expected behavior:

- Check CLI setup first. If unavailable and the user chooses draft-only mode, continue without CLI coverage checks.
- Skip browser reconnaissance.
- Read routes, tests, docs, app shell navigation, auth guards, and forms.
- Label browser evidence as absent in the manifest.
- Use lower confidence for flows that lack runtime confirmation.

Example evidence:

```json
{
  "browser": [],
  "code": ["Route file defines /pricing.", "Header component links homepage to /pricing."]
}
```

## Authenticated Discovery

User prompt:

```text
Use $smoketest-explore to continue with authenticated flow discovery using the staging Smoketest environment.
```

Expected behavior:

- Read `references/auth-environments.md` and `references/security.md`.
- Require working Smoketest CLI auth before selecting or creating environments.
- Confirm or create a Smoketest environment.
- Store `TEST_USER_PASSWORD` through a masked CLI prompt.
- Ask the user to log in manually with the non-production test user.
- Explore authenticated screens without destructive actions.
- Draft a reusable login subflow and protected flows using `{{smoketest-subflow:Log in}}`.

Example flow:

```markdown
## Dashboard overview

- {{smoketest-subflow:Log in}}
- Open the dashboard.
- Verify the overview cards, recent runs, and main navigation are visible.
```

Apply after review:

```bash
node skills/smoketest-explore/scripts/apply-manifest.mjs .smoketest/explore/manifest.json --project "Production" --apply
```
