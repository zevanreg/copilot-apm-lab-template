# Lab 6: establish an Azure DevOps release gate

**Time:** 25 minutes.
**Starting directory:** repository root.
**Prerequisites:** [Lab 5](05-govern.md), a personal lab repository or the
organizer's shared-repository workflow, and access to Azure Pipelines.
**End state:** a reviewed PR with explicit graduation evidence.

## 1. Inspect the starter pipeline before changing it

Open [the pipeline](../azure-pipelines.yml) and [its validation script](../scripts/ci.ps1).

Find:

1. The Windows hosted-agent selection and Node.js 24 task.
2. The `requireAcceptance` parameter, initially `false`.
3. The audit **before** frozen restoration, followed by restore and another audit.
4. Both APM projects, reuse verification, and the five workflow tests.
5. The conditional graduation check and its explicit starter-mode warning.
6. The published validation summary and generated package artifact.

The starter pipeline can pass while the seeded acceptance task is unfinished.
That is deliberate workshop scaffolding, not an acceptable final release gate.

Azure Repos PR validation is configured using a **branch-policy build validation**.
The YAML `pr: none` is explicit; changing it to a GitHub-style PR trigger would
not establish the required Azure Repos policy.

## 2. Require the completed exercise by default

Change the `requireAcceptance` parameter's default from `false` to `true`.
Preserve the rest of the supplied gate.

Review the diff:

```powershell
git --no-pager diff -- azure-pipelines.yml
```

The default ensures normal policy-triggered runs require graduation. It is not
tamper-proof by itself: protect pipeline, check scripts, and policy changes with
required reviewers. Manual runs that override the parameter to `false` must never
be presented as graduation evidence.

## 3. Complete the submission evidence

Open your evidence file and replace every `REPLACE_ME` value from
[the template](../evidence/TEMPLATE.md).

Include:

- Baseline and acceptance commands with actual counts.
- Installed primitive paths and the Copilot discovery method you observed.
- Both consumers' package versions and content hashes.
- New authored files and the deployment review outcome.
- Drift and policy negative results, their exact named checks, and successful repairs.
- Release ZIP name and archive SHA-256.
- Reviewer findings and your disposition.
- The Azure build and PR links once created.

Before a hosted build exists, explicitly write `pending first hosted build` in
the build-link field. Do not invent a URL or mark it verified. Update it after
the first real run and push that evidence update for a final build.

The local graduation check can verify files and configuration, not that an Azure
UI setting or claimed URL is genuine. A facilitator must review hosted evidence.

## 4. Run graduation locally

```powershell
npm run verify:graduation
if ($LASTEXITCODE -ne 0) { throw 'A graduation requirement is incomplete.' }
```

Expected:

- Strict type checking and production build pass.
- 10 baseline tests and 7 acceptance tests pass, without skips.
- Helper tests and documentation/customization checks pass.
- Authoring version 1.1.0, reference, scoped instruction, and both deployments pass.
- The pipeline default requires acceptance.
- The evidence file has no template placeholders.
- Both explicit-policy audits pass.

If a check fails, repair its actual cause. Do not remove the test, weaken the
policy, edit a generated lock by hand, or change the graduation script.

## 5. Run the same full script used by Azure Pipelines

```powershell
& .\scripts\ci.ps1 -RequireAcceptance
```

PowerShell errors from this script must be treated as failures; do not continue
if it throws. The script restores dependencies, validates the checkout, checks
both APM projects, runs negative cases and the bundle round-trip, creates a
release ZIP, and runs graduation.

Inspect:

```powershell
Get-Content .\.lab\reports\ci-summary.json
Get-ChildItem -LiteralPath .\.lab\release\build -File
```

Expected summary:

```json
{
  "outcome": "passed",
  "mode": "graduation",
  "acceptanceRequired": true
}
```

The JSON property order is not significant. A passing result in `starter` mode
does not satisfy this checkpoint.

## 6. Review exactly what will be committed

```powershell
git --no-pager status --short
git --no-pager diff --stat
git --no-pager diff -- app packages .github .agents apm.lock.yaml azure-pipelines.yml evidence
```

Expected changes include your focused API implementation, package version 1.1.0,
the new authored reference and instruction, updated managed files and both
lockfiles, the final pipeline default, and evidence.

Do not commit `node_modules`, `.tools`, `.lab`, `apm_modules`, credentials, or
generated ZIPs. ZIPs belong in pipeline artifacts, not in the source history.
Do not stage unrelated changes or use a blanket reset.

Stage the reviewed paths explicitly:

```powershell
git add -- app\src packages .github .agents apm.lock.yaml azure-pipelines.yml evidence\submission.md
git --no-pager diff --cached --stat
git --no-pager diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Resolve staged whitespace errors before committing.' }
git commit -m "Complete the APM context supply-chain lab"
if ($LASTEXITCODE -ne 0) { throw 'Commit failed.' }
git push -u origin HEAD
if ($LASTEXITCODE -ne 0) { throw 'Push failed; resolve Azure Repos permissions or authentication.' }
```

Follow any additional commit requirements your organization applies.

## 7. Create or select the Azure pipeline

If the organizer already created the pipeline, open it and select your branch.
Otherwise:

1. Open your Azure DevOps project.
2. Go to **Pipelines > New pipeline**.
3. Choose **Azure Repos Git**, not GitHub.
4. Select your assigned repository.
5. Choose **Existing Azure Pipelines YAML file**.
6. Select your branch and the root pipeline YAML.
7. Review the definition and save/run it.
8. Leave **Require completed application and lab graduation** enabled.
9. Authorize the pipeline's repository and agent-pool access if requested.

If the organization has no Microsoft-hosted parallel-job capacity, use the
organizer's approved Windows self-hosted pool. Do not create a cloud subscription
or service connection just to work around that organization setting.

## 8. Inspect the real build evidence

Open the validation step and confirm:

- The pinned APM version is used.
- Both consumer audits and frozen restores pass.
- The expected negative cases are asserted by the tests, not ignored by
  `continueOnError`.
- Acceptance and graduation actually ran.
- The final summary says graduation, not starter.

Download or inspect the `lab-validation` artifact and its CI summary.
Inspect the `northstar-webhook-kit` artifact for the release ZIP.
Record the build link and the artifact name in your evidence.

If the build fails only on Azure, classify it:

- Authentication or permission failure: organizer/environment issue.
- Missing Windows/Node/PowerShell prerequisite: agent configuration issue.
- Frozen-content mismatch or drift: review source/deployment consistency.
- Failing acceptance test: incomplete application behavior.

Do not report a local run as a hosted build.

## 9. Configure required Azure Repos validation

This step needs branch-policy permissions. Ask the organizer to perform it if
you do not have them; record that dependency rather than claiming success.

1. Open **Repos > Branches**.
2. Open the target branch's menu and select **Branch policies**.
3. Under **Build validation**, add the lab pipeline.
4. Set the trigger to **Automatic** and the policy to **Required**.
5. Use no path filter, so application, package, policy, evidence, and pipeline
   changes all trigger the check.
6. Choose an expiration policy that requires validation after target-branch changes.
7. Add required reviewers for changes to pipeline definitions, scripts, and policy.
8. Save and confirm the policy appears on a test PR.

Policies on the target branch govern merging. Merely running a pipeline manually
does not establish required PR validation.

## 10. Open the pull request and finish the evidence loop

Create an Azure Repos pull request from your learner branch to the assigned target.
Include:

- The original behavioral gap.
- The package/deployment change and version.
- Links to passing graduation-mode builds and their artifacts.
- Reviewer findings and remaining limitations.
- Confirmation that no secrets or tool caches were committed.

Update the evidence file with the real PR and build links, commit it, and push.
Wait for the policy-triggered build on that final commit. A prior build on an
earlier commit is not the final result.

If learners share one starter repository, follow the organizer's instruction to
leave the PR open rather than merging competing workshop solutions into `main`.

## Completion checklist

- [ ] Correct API behavior: all acceptance tests pass.
- [ ] Package version 1.1.0 and the new reference/instruction are deployed twice.
- [ ] Frozen replay, audit, reuse, negative cases, and bundle installation pass.
- [ ] Default pipeline mode requires graduation.
- [ ] Hosted build artifact says `mode: graduation`.
- [ ] A release ZIP is available as an Azure Pipeline artifact.
- [ ] Required Azure Repos build validation is visible on the PR.
- [ ] Final evidence references the actual final commit and build.

**Finish:** ask a facilitator to review the evidence against the
[instructor rubric](../docs/instructor.md). This is a package supply-chain lab,
not a claim that the in-memory API or agent runtime is production-secure.
