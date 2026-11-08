# Lab 2: consume a package and use its context to fix the API

**Time:** 25 minutes.
**Starting directory:** repository root.
**Prerequisite:** [Lab 1](01-diagnose.md).
**Allowed implementation scope:** application source; preserve the supplied tests.

## 1. Inspect the consumer manifest before installing

```powershell
Get-Content ./apm.yml
Get-Content ./packages/webhook-playbook/apm.yml
Get-Content ./packages/engineering-baseline/apm.yml
```

Observe that the root explicitly targets `copilot` and has `includes: []`.
The reusable package sources live under each package's `.apm` directory.
The webhook package declares the engineering baseline as a sibling dependency.

The paths resolve from the manifest that declares them, not from whichever
terminal directory happens to be open. Setup clones the GitHub starter and
publishes its history to Azure Repos; APM resolves these package dependencies
from the local checkout, not from a remote package host.

## 2. Restore the exact approved package content

```powershell
& ./scripts/apm.ps1 install --frozen --target copilot
if ($LASTEXITCODE -ne 0) { throw 'Do not continue with unexpected package drift.' }
& ./scripts/apm.ps1 deps tree
if ($LASTEXITCODE -ne 0) { throw 'Dependency inspection failed.' }
& ./scripts/apm.ps1 deps list
if ($LASTEXITCODE -ne 0) { throw 'Package inspection failed.' }
```

Expected: the webhook package is direct, and the engineering baseline is
transitive. Reinstalling an unchanged package may report files as adopted or
unchanged rather than newly created. That is normal.

Do not hand-edit the lockfile. Do not delete the package cache immediately after
installation: linked resources can still be needed while Copilot uses the package.

## 3. Inspect the four deployed customization surfaces

In the root workspace, inspect:

| Primitive | Deployed location | What to verify |
|---|---|---|
| Instructions | `.github\instructions` | File globs, normalized identity, status codes, and mutation rules. |
| Skill | `.agents\skills\webhook-change` | `SKILL.md`, its description, and its relative reference link. |
| Prompt | `.github\prompts\review-webhook.prompt.md` | A focused review task; read/search tools only. |
| Agent | `.github\agents\webhook-reviewer.agent.md` | Read/search tools only; no terminal, edit, or delegation tools. |

Compare these with the authored source under `packages\webhook-playbook\.apm`.
The root bootstrap file is repository-owned; the deployed package files are
APM-managed. The `.github` folder is meaningful to Copilot regardless of Git host.

Run:

```powershell
npm run verify:starter
if ($LASTEXITCODE -ne 0) { throw 'The required deployed context is missing or changed.' }
& ./scripts/apm.ps1 audit --ci --policy ./apm-policy.yml
if ($LASTEXITCODE -ne 0) { throw 'Context audit failed.' }
```

## 4. Verify discovery in Copilot, not just file existence

1. Start a **new chat** after restoring the context.
2. Type `/webhook-change`. Select the skill if your current VS Code build exposes
   skills as slash commands.
3. Type `/review-webhook` and confirm the review prompt is discoverable.
4. Open the agent picker and find **Webhook Reviewer**.
5. Open the skill's delivery-contract link and confirm the reference is available.

If slash-command discovery differs in your VS Code version, use **Chat: Run
Prompt**, the agent picker, or explicitly attach the installed skill file and
reference. Treat explicit attachment as an alternative; do not claim
automatic discovery worked.

Do not treat "the assistant says it loaded the skill" as sufficient proof.
Inspect the session's references/tool activity when available and verify the
actual installed path it read. Use [troubleshooting](../docs/troubleshooting.md)
if organization policy disables customization discovery.

## 5. Implement the behavioral task with the skill

Return to an implementation-capable Agent-mode chat, not the read-only reviewer.
Use this task:

> Use the installed webhook-change skill and its delivery contract. Fix duplicate
> order webhook deliveries in app/src. A first valid event must create one
> dispatch and return 201. An identical normalized repeat must return 200 and
> the original dispatch. A reused event identifier with a different order or
> quantity must return 409 without mutation. Invalid input must not reserve an
> identifier. Preserve the baseline behavior and pass concurrent identical
> requests in one process. Do not change or skip the supplied tests, rewrite
> managed Copilot files, add infrastructure, or claim durability. Show the failing
> behavior with the acceptance tests first, implement a focused change, then run
> baseline and acceptance tests.

Review the proposed edits before accepting them. In particular:

- Validation must still happen before delivery.
- A conflict must not replace the first event.
- Property order must not become part of event identity.
- An asynchronous gap between checking and creating can break concurrency.
- No external dependency is needed for this small in-memory exercise.

If the agent stops after a plausible explanation, explicitly request the actual
implementation and test execution. Do not accept invented test output.

## 6. Independently run the required checks

```powershell
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Type check failed.' }
npm run test:baseline
if ($LASTEXITCODE -ne 0) { throw 'Regression detected.' }
npm run test:acceptance
if ($LASTEXITCODE -ne 0) { throw 'The webhook task is not complete.' }
```

Expected after a correct implementation: **10 baseline tests and all 7 acceptance
tests pass**, with no skipped tests.

If only the sequential replay test passes, inspect the conflict, normalization,
and concurrent-delivery assertions. They are separate requirements, not optional
edge cases.

## 7. Observe the API manually

In terminal A, at the root:

```powershell
npm start
```

Keep that terminal open. In a separate PowerShell terminal B:

```powershell
$Base = 'http://127.0.0.1:3000'
Invoke-RestMethod "$Base/health"
$Body = @{ eventId = 'evt-manual'; orderId = 'order-manual'; quantity = 2 } | ConvertTo-Json
$First = Invoke-WebRequest "$Base/webhooks/orders" -Method Post -ContentType 'application/json' -Body $Body -SkipHttpErrorCheck
$Replay = Invoke-WebRequest "$Base/webhooks/orders" -Method Post -ContentType 'application/json' -Body $Body -SkipHttpErrorCheck
$ConflictBody = @{ eventId = 'evt-manual'; orderId = 'another-order'; quantity = 2 } | ConvertTo-Json
$Conflict = Invoke-WebRequest "$Base/webhooks/orders" -Method Post -ContentType 'application/json' -Body $ConflictBody -SkipHttpErrorCheck
$First.StatusCode
$Replay.StatusCode
$Conflict.StatusCode
$First.Content
$Replay.Content
Invoke-RestMethod "$Base/dispatches" | ConvertTo-Json -Depth 5
```

On a freshly started process, expect statuses **201, 200, 409** and one dispatch.
The replay must contain the same dispatch identifier. If you have already used
`evt-manual` in this process, restart terminal A's server and repeat.

Stop only this foreground server with **Ctrl+C** in terminal A when finished.
Do not terminate processes by name or stop an unrelated process using port 3000.

## 8. Request a bounded review

Select **Webhook Reviewer**, attach the edited files and relevant tests, and ask:

> Review this webhook change against the delivery contract. Use read/search only.
> Check replay identity, conflict immutability, validation order, and concurrency.
> Return concrete findings with implementation locations and test coverage.
> Do not implement fixes or claim you ran tests.

Run the `/review-webhook` prompt as a second way to invoke a focused review if
time permits. Resolve material findings and check any remaining assumptions.
Return to the implementation agent yourself if a fix is needed.

## Completion checks

- The deployed skill, prompt, instructions, and agent are usable.
- Baseline and acceptance tests pass.
- The manual status sequence is correct and creates one dispatch.
- Material reviewer findings are resolved.
- You can explain why the solution is process-local, not distributed.

**Checkpoint:** the API task is complete, but the package-authoring and governance
work remains. Continue to [Lab 3](03-reproduce.md).
