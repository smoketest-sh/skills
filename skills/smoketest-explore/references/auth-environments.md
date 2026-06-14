# Authenticated Flows And Environments

Use this reference when authenticated journeys are discovered or requested.

## Environment Purpose

Smoketest environments hold project-scoped variables for URLs, test accounts, feature flags, and secrets. Authenticated flows should attach an environment so the run agent can use test-user credentials without exposing secret values.

Recommended variable names:

```text
BASE_URL
TEST_USER_EMAIL
TEST_USER_PASSWORD
TEST_USER_NAME
TEST_OTP_EMAIL
```

Use project-specific names only when existing conventions are already present.

## Environment Setup

Inspect existing environments:

```bash
smoketest env list --project "<project>" --json
smoketest env get "<environment>" --project "<project>" --json
```

Create a new environment when none is suitable:

```bash
smoketest env create \
  --project "<project>" \
  --name staging \
  --var BASE_URL=https://staging.example.com \
  --var TEST_USER_EMAIL=test@example.com \
  --json
```

Set the password through the masked prompt:

```bash
smoketest env set staging TEST_USER_PASSWORD --secret
```

Do not ask the user to paste passwords, API keys, OTP seeds, or other secrets into chat.

## Auth Discovery Flow

1. Ask the user whether to continue with authenticated discovery.
2. Select or create the environment.
3. Ask the user to log in manually in the browser with a non-production test user.
4. Explore authenticated screens using the existing browser session.
5. Avoid destructive actions such as deleting data, sending invites, buying plans, changing billing, revoking keys, or submitting irreversible forms.
6. Draft a `subflows/login.md` file when multiple flows need login.
7. Attach `--env <environment>` when creating or updating authenticated flows.

## Authenticated Flow Markdown

Reference variable names, not values:

```markdown
## Log in

- Open the login page.
- Enter `TEST_USER_EMAIL` in the email field.
- Fill the password field from `TEST_USER_PASSWORD`.
- Submit the login form.
- Verify the dashboard appears.
```

For protected journeys:

```markdown
## Dashboard overview

- {{smoketest-subflow:Log in}}
- Open the dashboard.
- Verify the overview cards, recent runs, and navigation are visible.
```

If the product uses magic links or OTP, draft the flow only when Smoketest run-scoped email handling or a documented test inbox exists. Otherwise mark the candidate as blocked and explain what environment or inbox support is missing.
