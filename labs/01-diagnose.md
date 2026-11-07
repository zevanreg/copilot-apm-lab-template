# Lab 1: diagnose context sprawl and observe the behavioral gap

**Time:** 15 minutes.
**Starting directory:** repository root.
**Prerequisite:** [setup](00-setup.md).
**Do not implement the fix in this lab.**

## 1. Create a learner branch

Use your organizer's branch naming convention. For example:

```powershell
git switch -c lab/my-alias
if ($LASTEXITCODE -ne 0) { throw 'Use an available feature-branch name before continuing.' }
```

Replace `my-alias` before running the command. Do not work on a shared `main`.
If you already created your branch during setup, remain on that branch instead.

## 2. Compare the conflicting copied guidance

Read both inert discussion files:

```powershell
Get-Content .\fixtures\legacy-guidance\team-a.txt
Get-Content .\fixtures\legacy-guidance\team-b.txt
```

These are plain text discussion fixtures. They are not installed instructions,
skills, hooks, or executable programs.

Consider:

1. Which statements conflict about repeated delivery?
2. What would happen if both were copied into always-on instructions?
3. Why is "the agent followed its instructions" not a sufficient success criterion?
4. Who should review and own the shared guidance?

## 3. Find the actual contract and implementation boundary

Open:

- [Delivery contract](../packages/webhook-playbook/.apm/skills/webhook-change/references/delivery-contract.md).
- [HTTP handler](../app/src/server.ts).
- [Validation](../app/src/validation.ts).
- [Delivery function](../app/src/delivery.ts).
- [Store](../app/src/store.ts).
- [Acceptance tests](../app/test/acceptance.test.ts).

Trace one request through parsing, validation, delivery, and response. Notice
that identifiers are normalized before delivery and that the store returns copies.
The defect is not a reason to rewrite the server or add a framework.

Check first delivery, replay, conflict, and invalid input against their expected
status, allowed mutation, and the test that observes each case.

## 4. Establish the passing regression baseline

```powershell
npm run test:baseline
if ($LASTEXITCODE -ne 0) { throw 'An unexpected baseline failure must be fixed or explained first.' }
```

Expected on the untouched starter: **10 tests pass, none fail or skip**.
These protect the health endpoint, initial dispatch, normalization, validation,
body limit, media type, response envelopes, and store encapsulation.

Confirm the result directly from the application test run, not from APM output.

## 5. Observe the intentional acceptance failures

```powershell
npm run test:acceptance
$AcceptanceExit = $LASTEXITCODE
if ($AcceptanceExit -eq 0) {
    throw 'The untouched starter should not already satisfy the acceptance task. Check your branch.'
}
```

Expected starter result: **7 tests run; 1 passes and 6 fail**.
Typical failures show `201 !== 200`, `201 !== 409`, or eight creates instead of
one create and seven replays.

Read the assertions, not only the summary. Identify:

- The first assertion that proves replay behavior is wrong.
- The assertions that prove conflicts must preserve the original event.
- Why comparing raw JSON text is insufficient for normalized business identity.
- The scope of the concurrency guarantee: one in-memory process.

The nonzero exit exposes the seeded task, not a command to suppress.
If you see a missing module, syntax error, or connection error instead, that is
an environment or implementation problem, not the expected learner failure.

## 6. Ask Copilot for a bounded explanation, not a fix

Start a new chat in the root workspace and use:

> Read the delivery contract, HTTP handler, validation, store, and acceptance
> tests. Explain why the starter fails replay and conflict behavior. Do not edit
> files, run installations, or implement the solution. Give source references and
> separate verified facts from assumptions.

Compare its answer with the tests you actually ran. Reject claims about
distributed exactly-once processing: this application has no durable or shared store.

If Copilot edits a file despite the requested read-only scope, stop, inspect that
specific change, and decide with the facilitator how to preserve or undo it.
Do not issue a blanket reset.

## 7. Decide what belongs in each customization primitive

Compare these customization choices:

| Knowledge or task | Appropriate primitive | Reason |
|---|---|---|
| Engineering conventions for TypeScript edits | File instruction | Narrow, persistent guidance when matching files are changed. |
| Multi-step webhook change workflow plus reference material | Skill | On-demand procedure with bundled resources. |
| One focused contract-review request | Prompt | Reusable explicit invocation. |
| Read-only reviewer with no terminal or edit tools | Custom agent | Separate role and tool boundary. |

Explain why none of these replaces automated acceptance tests.

## Completion checks

- The baseline tests pass.
- You can explain at least two named acceptance failures.
- Each delivery case has a defined status, mutation rule, and test.
- The customization choices match their scope and role.
- No application fix has been implemented yet.

**Checkpoint:** you can distinguish guidance quality, installed-content integrity,
and observable application correctness. Continue to [Lab 2](02-consume.md).
