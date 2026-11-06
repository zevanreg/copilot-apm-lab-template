# Lab 3: trace transitive dependencies and reproduce the context

**Time:** 20 minutes.
**Starting directory:** repository root.
**Prerequisite:** [Lab 2](02-consume.md).
**Application behavior:** preserve the passing implementation.

## 1. Identify declarations, resolution, deployment, and cache

Read the root [manifest](../apm.yml) and [lockfile](../apm.lock.yaml).

Find these fields in the lockfile:

| Field | Meaning in this lab |
|---|---|
| `repo_url` | Package identity, such as `_local/webhook-playbook`. |
| `source` / `local_path` | Local package source and declared path. |
| `content_hash` | Resolved package-content integrity value. |
| `depth` / `resolved_by` | Evidence that the baseline is transitive. |
| `deployed_files` / `deployed_file_hashes` | Recorded target files and text hashes. |
| `deployments` | Target ownership and placement information. |

Do not assume local packages have Git commit pins. Their source is reviewed in
the Azure repository and their content is hashed. A remote Git dependency can
add resolved commit provenance.

Explain in your evidence why `apm_modules` is derived installation state while
the manifest, lockfiles, authored sources, and reviewable deployed files belong
in Git.

## 2. Prove frozen replay does not rewrite the root lockfile

```powershell
$Before = (Get-FileHash -LiteralPath .\apm.lock.yaml -Algorithm SHA256).Hash
& .\scripts\apm.ps1 install --frozen --target copilot
if ($LASTEXITCODE -ne 0) { throw 'Frozen replay failed.' }
$After = (Get-FileHash -LiteralPath .\apm.lock.yaml -Algorithm SHA256).Hash
if ($Before -ne $After) { throw 'The lockfile changed during a frozen install.' }
```

Expected: the command succeeds and the two hashes match.

This hashes the lockfile as a file, not a particular package entry. APM's recorded
text hashes normalize CRLF/LF; a raw `Get-FileHash` over a deployed text file may
therefore differ from a recorded normalized text hash. Use the supplied verifier
or APM audit rather than inventing a raw-hash comparison.

## 3. Inspect the independent consumer

Open [the second manifest](../packages/apm.yml). The **packages directory is also
a complete APM project**, separate from the root consumer.

Its package path is `./webhook-playbook`, not `./packages/webhook-playbook`, because
its manifest has a different location. Both refer to the same authored source.
The webhook package's baseline dependency remains `../engineering-baseline`.

Why this layout? APM 0.35.0 can record absolute transitive metadata when a nested
consumer reaches outside its root. Keeping both package sources inside both
consumer scopes allows cold frozen replay after the entire checkout is relocated.
The lab tests this behavior rather than hand-editing generated locks.

This is an independent **APM project**, not an independent Git repository or
security boundary.

## 4. Restore the second consumer from its own lock

```powershell
$Repo = (Get-Location).Path
Push-Location .\packages
try {
    $Before = (Get-FileHash -LiteralPath .\apm.lock.yaml -Algorithm SHA256).Hash
    & "$Repo\scripts\apm.ps1" install --frozen --target copilot
    if ($LASTEXITCODE -ne 0) { throw 'Second-consumer frozen replay failed.' }
    & "$Repo\scripts\apm.ps1" deps tree
    if ($LASTEXITCODE -ne 0) { throw 'Second-consumer dependency inspection failed.' }
    & "$Repo\scripts\apm.ps1" audit --ci --policy "$Repo\apm-policy.yml"
    if ($LASTEXITCODE -ne 0) { throw 'Second-consumer audit failed.' }
    $After = (Get-FileHash -LiteralPath .\apm.lock.yaml -Algorithm SHA256).Hash
    if ($Before -ne $After) { throw 'The second lockfile changed during frozen replay.' }
}
finally {
    Pop-Location
}
```

Expected: the same package names and content versions, with the baseline still
transitive. The second consumer writes to its own `.github`, `.agents`, and
`apm_modules` paths under the packages folder.

## 5. Compare the content, not the entire lockfile text

From the root:

```powershell
npm run verify:reuse
if ($LASTEXITCODE -ne 0) { throw 'Investigate the differing consumer content.' }
```

This verifies the required deployed files against their recorded text hashes,
checks the transitive baseline, compares package-content hashes across consumers,
and compares their deployed package files.

The whole lockfiles need not be identical: their declarations and deployment
ownership use different project-relative paths. Do not "fix" that legitimate
difference by copying one lockfile over the other.

In your evidence, record both package content hashes and one legitimate
project-relative difference between the lockfiles.

## 6. Observe the second consumer in a separate VS Code window

Use **File > New Window**, then **File > Open Folder** and select the `packages`
directory. Start a new chat. Locate its installed skill, prompt, and reviewer.
Inspect which physical file path appears in the chat's references.

Because both APM projects live in one Git repository, some VS Code versions or
settings may also discover parent customizations. Record the observed scope;
do not claim a separate folder is an isolation or security boundary. The
deterministic proof of two installations is the distinct deployed trees and
their validated content.

Close the second window or return to the root window before the next exercise.

## 7. Test a relocated cold checkout

```powershell
npm run test:lab
if ($LASTEXITCODE -ne 0) { throw 'A real APM workflow failed; inspect the named test.' }
```

Expected: **five workflow tests pass**. The first copies only reviewed inputs
into a new sandbox, deliberately omits caches, audits cold, replays frozen installs
in both APM projects, and verifies that the lockfile was not rewritten.

Other tests assert expected drift, source-change, policy, and bundle outcomes.
They fail if the negative case passes unexpectedly. Named sandboxes are removed
after each test, without changing your application implementation.

## 8. Separate local reuse from remote distribution

The core exercise reused package sources already obtained from Azure Repos by
Git clone. It did not download packages from GitHub.

For an actual Azure-hosted remote package install, use the optional, organizer-led
[remote distribution extension](../docs/azure-devops.md#optional-remote-package-distribution).
That extension requires a real Azure URL, published tag or commit, and verified
private-repository authentication. Do not substitute fictional URLs and claim a
successful remote installation.

## Completion evidence

- A dependency graph with direct and transitive edges.
- Matching before/after hashes for each frozen lockfile.
- Passing reuse verification.
- Both package-content hashes and a legitimate lockfile path difference.
- Your observed Copilot discovery scope in the second window.
- Passing cold-replay workflow test.

**Checkpoint:** you have demonstrated reproducible context, not reproducible LLM
wording. Continue to [Lab 4](04-author.md).
