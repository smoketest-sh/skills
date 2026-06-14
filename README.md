# Smoketest Skills

Agent Skills and plugin packaging for discovering browser user flows and creating Smoketest tests.

## Skills

### smoketest-explore

`smoketest-explore` helps an agent inspect a local web app, optionally explore a live URL in a browser, draft reviewable Smoketest flow markdown, and apply approved flows through the Smoketest CLI.

It is draft-first by design:

- It does not create or edit Smoketest resources until the user approves.
- It does not run flows unless the user asks.
- It does not ask users to paste secrets into chat.
- Authenticated flows use Smoketest environments and masked CLI prompts for secrets.

## Install As A Plugin

### Codex

Add the Smoketest marketplace and install the plugin:

```bash
codex plugin marketplace add smoketest-sh/skills
codex plugin add smoketest@smoketest
```

The plugin exposes the `smoketest-explore` skill from `skills/smoketest-explore`.

### Claude Code

Add the Smoketest marketplace and install the plugin:

```text
/plugin marketplace add smoketest-sh/skills
/plugin install smoketest@smoketest
```

After installation, the skill is available as:

```text
/smoketest:smoketest-explore
```

## Install As A Standalone Skill

Install from this repository after it is published:

```bash
npx skills add smoketest-sh/skills --skill smoketest-explore
```

With GitHub CLI agent skills:

```bash
gh skill install smoketest-sh/skills smoketest-explore --agent codex
gh skill install smoketest-sh/skills smoketest-explore --agent claude-code
```

For local development, copy or symlink `skills/smoketest-explore` into the agent host skill folder:

```bash
# Codex
mkdir -p .agents/skills
ln -s ../../../smoketest-skills/skills/smoketest-explore .agents/skills/smoketest-explore

# Claude Code
mkdir -p .claude/skills
ln -s ../../../smoketest-skills/skills/smoketest-explore .claude/skills/smoketest-explore
```

## Example Prompts

```text
Use $smoketest-explore to discover public user flows from this repo and https://staging.example.com.
```

```text
Use $smoketest-explore without browser access to draft Smoketest flows from the local codebase.
```

```text
Use $smoketest-explore to continue with authenticated flow discovery using the staging Smoketest environment.
```

## Requirements

- Local repository access.
- Optional browser access for browser-first exploration.
- Smoketest CLI installed and signed in for the full workflow. The skill checks this upfront and helps the user install `@smoketest.sh/cli` and run `smoketest auth login` or `smoketest init` if needed.
- Draft-only mode can continue without CLI setup only when the user explicitly chooses that fallback.
- A Smoketest environment for authenticated flows.

## Draft And Apply

Validate generated draft manifests:

```bash
node skills/smoketest-explore/scripts/validate-manifest.mjs .smoketest/explore/manifest.json
```

Preview CLI changes without mutation:

```bash
node skills/smoketest-explore/scripts/apply-manifest.mjs .smoketest/explore/manifest.json --project "Production"
```

Apply after review:

```bash
node skills/smoketest-explore/scripts/apply-manifest.mjs .smoketest/explore/manifest.json --project "Production" --apply
```

## Validate

```bash
uv run --with pyyaml python /Users/armin/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/smoketest-explore
npx --yes skills add . --list
uv run --with pyyaml python /Users/armin/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
node skills/smoketest-explore/scripts/validate-manifest.mjs test/fixtures/explore/manifest.json
claude plugin validate . # optional, requires Claude Code
```

## License

Apache-2.0. See [LICENSE](./LICENSE).
