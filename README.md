# Smoketest Skills

Agent Skills for discovering browser user flows and creating Smoketest tests.

## Skills

### smoketest-explore

`smoketest-explore` helps an agent inspect a local web app, optionally explore a live URL in a browser, draft reviewable Smoketest flow markdown, and apply approved flows through the Smoketest CLI.

It is draft-first by design:

- It does not create or edit Smoketest resources until the user approves.
- It does not run flows unless the user asks.
- It does not ask users to paste secrets into chat.
- Authenticated flows use Smoketest environments and masked CLI prompts for secrets.

## Install

Install from this repository after it is published:

```bash
npx skills add smoketest-sh/smoketest-skills
```

With GitHub CLI agent skills:

```bash
gh skill install smoketest-sh/smoketest-skills smoketest-explore --agent codex
gh skill install smoketest-sh/smoketest-skills smoketest-explore --agent claude-code
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
- Optional Smoketest CLI for applying approved drafts.
- A Smoketest environment for authenticated flows.

## Validate

```bash
uv run --with pyyaml python /Users/armin/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/smoketest-explore
gh skill publish --dry-run
```

## License

Apache-2.0. See [LICENSE](./LICENSE).
