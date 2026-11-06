---
name: review-webhook
description: "Review a Northstar webhook change against its observable delivery contract."
agent: agent
tools: [read, search]
---
Review the current webhook implementation and its tests without editing files or
running commands. Check first delivery, replay identity, conflict immutability,
normalization, validation-before-mutation, and single-process concurrency.

Return a table with: requirement, source evidence, test evidence, and gap.
Distinguish verified facts from assumptions. Ask the developer to supply any
missing test output; do not invent a successful run.
