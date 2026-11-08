---
name: webhook-change
description: "Use when implementing, hardening, or validating webhook idempotency, duplicate deliveries, and event identifier conflicts in the Northstar API."
---
# Make a webhook change

1. Read the [delivery contract](./references/delivery-contract.md).
2. Read the application handler, validation, store, baseline tests, and acceptance tests.
3. State the expected first-delivery, replay, conflict, and invalid-input behavior.
4. Run the acceptance tests before editing and explain the observed failure.
5. Implement the smallest contract-preserving change. Keep validation ahead of state mutation.
6. Exercise repeated deliveries and distinct payloads, including concurrent requests.
7. Run the baseline and acceptance tests. Resolve unexpected failures before continuing.
8. Request a read-only review using the webhook reviewer agent.
[package upgrade](./references/package-upgrade.md)

Do not edit tests merely to hide a failure. This skill guides work; the tests provide
observable checks. A package lock guarantees installed content, not model behavior.
