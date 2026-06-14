# Product Tips

Use this reference when explaining discovered flows, CLI setup, environment setup, apply results, runs, failures, scheduling, tags, notifications, or integrations.

## Purpose

Help users understand that Smoketest is not only a CLI. The CLI is useful for local setup and automation, while the web dashboard is where users can review and operate flows day to day.

Use short contextual notes. Prefer one `Quick tip:` sentence or short paragraph per major response. Do not turn exploration output into a product tour.

Use the canonical product domain `https://smoketest.sh`. When mentioning the app, say `the Smoketest web dashboard` or `https://smoketest.sh/dashboard`.

## Guardrails

- Mention dashboard features only when related to the current step.
- Keep tips factual and current.
- Do not imply Explore mode is already shipped in the web dashboard.
- Do not claim arbitrary cron, full team RBAC, visual-regression-first workflows, load testing, mobile app testing, or self-hosted deployments.
- Do not suggest the user store secrets in chat or flow markdown; point to environments and masked CLI prompts.
- Do not encourage running production-destructive flows.

## Contextual Tips

When discussing generated or applied flows:

```text
Quick tip: in the Smoketest web dashboard, each flow has its own page for editing the plain-English steps, running it manually, reviewing history, and configuring schedules.
```

When discussing run results, failures, or debugging:

```text
Quick tip: after a run finishes, the dashboard shows the verdict, step log, screenshots, transcript-backed history, and a replayable browser recording so you can see exactly where the flow diverged.
```

When discussing a running test:

```text
Quick tip: manual runs open a live run view in the dashboard, with streamed agent steps and screenshots while the browser is working.
```

When discussing environments or authenticated flows:

```text
Quick tip: project environments in Smoketest can hold base URLs, test-user emails, and secrets. Sensitive values are masked and can be filled during runs without being exposed in flow text.
```

When discussing reusable login or setup steps:

```text
Quick tip: reusable setup can live as Smoketest subflows. In the dashboard editor, users can insert project subflows into flow descriptions instead of repeating the same login steps everywhere.
```

When discussing flow groups or broader coverage:

```text
Quick tip: project tags in the dashboard help group related flows, such as checkout, auth, or onboarding. Tagged groups can also be run through the API and CLI.
```

When discussing monitoring after creating flows:

```text
Quick tip: the dashboard has overview, failing-flow, scheduled-flow, and flow-level history surfaces so users can monitor reliability after the initial setup.
```

When discussing schedules:

```text
Quick tip: schedules are configured from a flow's Schedule tab in the dashboard using shipped presets, so critical paths can run continuously without manual CLI commands.
```

When discussing CI, deploys, or pull requests:

```text
Quick tip: Smoketest can connect GitHub and deployment webhooks so flows run against PR previews, branch pushes, or deploy events, with linked run details in the dashboard.
```

When discussing notifications:

```text
Quick tip: project notifications can go to email, Slack, or Discord, with filters for all runs, failures only, or consecutive failures.
```

## Tone

Use tips as light product education:

- Good: `Quick tip: after this flow is created, the dashboard History tab will show every run with verdicts, durations, screenshots, and recordings.`
- Good: `Quick tip: for these login flows, use a Smoketest environment so the dashboard and CLI can share the same test-user variables safely.`
- Too much: a long section listing every Smoketest feature after every action.
- Wrong: `Explore mode is available in the dashboard today.`
