# Webhook playbook

A reusable set of Copilot primitives for Northstar webhook changes:

- [Scoped delivery instructions](.apm/instructions/webhooks.instructions.md).
- [Webhook-change skill](.apm/skills/webhook-change/SKILL.md) with a
  [delivery contract](.apm/skills/webhook-change/references/delivery-contract.md).
- [Focused review prompt](.apm/prompts/review-webhook.prompt.md).
- [Read-only reviewer agent](.apm/agents/webhook-reviewer.agent.md).

The [manifest](apm.yml) composes the sibling engineering baseline.
Version 1.0.0 is the learner starter. Lab 4 adds an upgrade/rollback reference and
a scoped package-review instruction, then intentionally releases version 1.1.0.

Author under `.apm`, not in a consumer's deployed files. Restore through the
consumer manifests at the repository root and the parent packages directory.
Do not pack this local-development dependency graph directly; follow the
[curated release exercise](../../labs/04-author.md).
