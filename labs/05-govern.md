# Lab 5: investigate drift and enforce an explicit policy

**Time:** 30 minutes.
**Starting directory:** repository root.
**Prerequisite:** [Lab 4](04-author.md).
**Safety:** fixtures are harmless; no prompt injection, hidden Unicode, hooks,
credential access, or external tools are introduced.

## 1. Establish that the reviewed state is clean

```powershell
& ./scripts/apm.ps1 audit --ci --policy ./apm-policy.yml
if ($LASTEXITCODE -ne 0) { throw 'Start with a clean root audit.' }
npm run verify:authoring
if ($LASTEXITCODE -ne 0) { throw 'Finish the package-authoring checkpoint first.' }
npm run verify:reuse
if ($LASTEXITCODE -ne 0) { throw 'Synchronize both consumers before investigating drift.' }
```

Read [the local policy](../apm-policy.yml). It blocks manifest `scripts` declarations.
This deliberately small policy demonstrates a check with an observable result;
it is not a complete organizational allowlist.

## 2. Inject one controlled deployed-file edit

```powershell
node ./scripts/scenarios.mjs drift
if ($LASTEXITCODE -ne 0) { throw 'Drift scenario was not prepared.' }
git --no-pager diff -- .github/instructions/webhooks.instructions.md
```

The helper first requires a clean audit, backs up the exact managed file, and
appends a plain-text lab marker to the **deployed output**. It does not change
the authored package source or update the lockfile.

Inspect the diff. This is the one exercise where a managed file is intentionally
edited. Do not have Copilot "fix" the package or regenerate everything yet.

## 3. Require the drift audit to fail

```powershell
& ./scripts/apm.ps1 audit --ci --policy ./apm-policy.yml
$DriftExit = $LASTEXITCODE
if ($DriftExit -eq 0) { throw 'A modified managed instruction must not pass the audit.' }
```

Expected: nonzero exit and a finding naming the webhook instruction, content
integrity, or drift. A missing executable or policy-fetch error does not prove
the drift check worked.

Consider:

1. Why did the content lock not silently accept this change?
2. Why would running a repair install **before** the audit hide committed drift?
3. Where would you edit if the guidance change were intentional?
4. What would remain outside this check's guarantee?

## 4. Restore the exact previous deployed bytes

```powershell
node ./scripts/scenarios.mjs restore-drift
if ($LASTEXITCODE -ne 0) { throw 'Inspect the backup and managed file before restoring manually.' }
& ./scripts/apm.ps1 install --frozen --target copilot
if ($LASTEXITCODE -ne 0) { throw 'Frozen restoration failed.' }
& ./scripts/apm.ps1 audit --ci --policy ./apm-policy.yml
if ($LASTEXITCODE -ne 0) { throw 'The repaired state is still inconsistent.' }
```

Expected: the audit passes again. The restore helper refuses to overwrite a file
that acquired additional changes after the marker was injected. That refusal
protects work; it is not an invitation to add `--force`.

A legitimate guidance change follows Lab 4: change authored source, review it,
intentionally update the lock, redeploy both consumers, and retest.

## 5. Read a proposed manifest command without executing it

```powershell
Get-Content ./fixtures/proposed-scripts.yml
Get-Content ./apm-policy.yml
```

The proposal adds a named script whose command is just `node --version`. It is
harmless, but the reviewed lab policy does not permit manifest scripts at all.
Policy decisions can be stricter than "this one example looks safe."

Do not invoke `apm run` or manually run the proposed script as part of this test.
The point is to inspect and reject its declaration without executing it.

## 6. Prepare an isolated policy candidate

```powershell
node ./scripts/scenarios.mjs prepare-policy
if ($LASTEXITCODE -ne 0) { throw 'Policy sandbox preparation failed.' }
$Repo = (Get-Location).Path
$PolicyConsumer = Join-Path $Repo '.lab/policy-consumer'
Get-Content "$PolicyConsumer/apm.yml"
```

The helper copies reviewed package inputs and the lock into a marked sandbox,
then adds the proposed `scripts` mapping. It does not change the root consumer.
Do not open this candidate as a VS Code workspace or activate its customizations.

If a previous policy sandbox exists, the helper stops rather than replacing it.
Finish or clear that named exercise before repeating.

## 7. Distinguish install success from policy acceptance

```powershell
Push-Location $PolicyConsumer
try {
    & "$Repo/scripts/apm.ps1" install --target copilot
    if ($LASTEXITCODE -ne 0) { throw 'Candidate installation failed before the intended local audit.' }
    & "$Repo/scripts/apm.ps1" audit --ci --policy "$Repo/apm-policy.yml"
    $PolicyExit = $LASTEXITCODE
    if ($PolicyExit -eq 0) { throw 'The unreviewed scripts declaration must fail the explicit policy.' }
}
finally {
    Pop-Location
}
```

Expected in the prepared lab organization: installation completes, then the
explicit audit reports a failing **scripts-policy** check and returns nonzero.
Confirm the named check. An unrelated failure does not satisfy this checkpoint.

Why can installation complete? The root policy file is passed explicitly to
audit; its presence in a checkout does not make it an automatically discovered
central policy. Also, policy checks have different enforcement points. This
exercise proves the actual CI audit rule, not a fictional runtime barrier.

If your organization already has a stricter central policy and installation is
blocked earlier, respect it. Ask the organizer to classify the result; do not
set a policy-disable environment variable or pass `--no-policy` to bypass it.
See the local and central-policy distinctions in [architecture](../docs/architecture.md#governance).

## 8. Repair the candidate, then prove the intended state passes

Open only the sandbox's `apm.yml` as a file in the existing editor. Remove the
entire proposed `scripts` mapping. Do not weaken the root policy.

Repeat:

```powershell
Push-Location $PolicyConsumer
try {
    & "$Repo/scripts/apm.ps1" install --target copilot
    if ($LASTEXITCODE -ne 0) { throw 'Repaired candidate installation failed.' }
    & "$Repo/scripts/apm.ps1" audit --ci --policy "$Repo/apm-policy.yml"
    if ($LASTEXITCODE -ne 0) { throw 'The repaired candidate still violates policy.' }
}
finally {
    Pop-Location
}
```

Expected: a passing audit. Compare rejected and accepted configurations.
The only necessary policy repair was removing the unwanted declaration.

## 9. Clean up the named policy scenario and rerun the automated cases

```powershell
node ./scripts/scenarios.mjs clear-policy
if ($LASTEXITCODE -ne 0) { throw 'Sandbox cleanup refused; inspect its marker and path.' }
npm run test:lab
if ($LASTEXITCODE -ne 0) { throw 'A workflow assertion failed.' }
& ./scripts/apm.ps1 audit --ci --policy ./apm-policy.yml
if ($LASTEXITCODE -ne 0) { throw 'The real consumer must end clean.' }
```

The cleanup command removes only its marked policy-consumer directory. It does
not remove the repository, the entire `.lab` folder, or unrelated caches.

The five workflow tests include a separate source-change case: frozen mode must
reject a modified local baseline package. That is distinct from editing a
deployed instruction. Check that the two cases fail for their respective reasons.

## 10. State the trust boundary accurately

Discuss:

- Local developer checks can be skipped; required Azure Repos build validation
  makes the reviewed check part of the merge workflow.
- Reviewers must protect policy, validation scripts, and pipeline definitions.
  A self-editable policy is not an adversarial security boundary.
- A package audit does not prove that an agent never reads an unrelated file.
- APM policy does not sandbox a running agent or guarantee safe model decisions.
- Remote source policy and central organizational governance require real
  repository identities, permissions, and a separately verified rollout.

## Completion checks

- The drift audit names the modified file and passes after repair.
- The `scripts-policy` check rejects the candidate and passes after repair.
- The proposed command was not executed.
- Automated workflow tests pass.
- Source drift, deployment drift, and runtime limitations are distinguished.

**Checkpoint:** negative cases fail for the intended reason and the real consumer
is healthy again. Continue to [Lab 6](06-release.md).
