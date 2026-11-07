---
name: review-webhook
description: "Review a Northstar webhook change against its observable delivery contract."
agent: agent
tools: [read, search]
---
Review the current webhook implementation and its tests without editing files or
running commands. Check first delivery, replay identity, conflict immutability,
normalization, validation-before-mutation, and single-process concurrency.

Return a table with: requirement, implementation location, test coverage, and gap.
Distinguish code-backed facts from unverified runtime assumptions. Do not claim
that tests ran successfully based only on reading their assertions.
