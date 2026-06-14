# Distribution

Use this reference when preparing `smoketest-explore` for local use or public registries.

## Canonical Layout

The canonical package should stay at:

```text
skills/smoketest-explore/
  SKILL.md
  agents/openai.yaml
  references/
  license.txt
```

Keep generated exploration output outside the skill package under `.smoketest/explore/`.

## Local Discovery

In an application repository, expose this skill through symlinks or an installer-managed copy:

```text
.agents/skills/smoketest-explore -> ../../skills/smoketest-explore
.claude/skills/smoketest-explore -> ../../skills/smoketest-explore
```

For local development from a sibling checkout such as `../smoketest-skills`, point repo-local symlinks at `../../../smoketest-skills/skills/smoketest-explore` from `.agents/skills/` and `.claude/skills/`. Do not maintain independent copies in multiple agent folders; copies drift.

## Registry Notes

- Keep `SKILL.md` concise and portable.
- Do not depend on product-specific tool names in required instructions.
- Keep browser usage optional because not every agent host has browser tools.
- Keep CLI usage optional for draft mode and required only for apply mode.
- Add root registry metadata such as `skills.sh.json` later if a registry requires richer presentation than `README.md` and `SKILL.md`.

## Versioning

When publishing, tag releases and document compatibility in release notes:

- Codex: local `.agents/skills` or installed skill package
- Claude Code: local `.claude/skills` or installed skill package
- skills.sh: GitHub-backed skill install

The skill package license is Apache-2.0.
