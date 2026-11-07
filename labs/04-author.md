# Lab 4: author version 1.1.0 and distribute a real bundle

**Time:** 35 minutes.
**Starting directory:** repository root.
**Prerequisites:** [Lab 3](03-reproduce.md); application acceptance tests pass.
**End state:** two consumers use your authored extension; a standalone ZIP installs
into an empty consumer.

## 1. Establish the source-of-truth boundary

Confirm you completed `npm run setup:context` during setup **before** editing
package sources. It creates local write receipts for the reviewed skill files.
If you skipped it, run it now while version 1.0.0 still matches both locks.
Do not use `--force` or run the helper against already changed/unlocked sources.

Open the webhook package's [manifest](../packages/webhook-playbook/apm.yml)
and [source skill](../packages/webhook-playbook/.apm/skills/webhook-change/SKILL.md).

Author changes under `packages\webhook-playbook\.apm`. Do not edit the installed
copies under the root or second consumer's `.github` and `.agents` directories.
The next install would overwrite or report those changes as drift.

Your feature is **safe package upgrades and rollback**, not another application
feature. The skill already covers implementation and testing; extend it with a
procedure that another team can reuse when changing its installed guidance.

## 2. Add an upgrade and rollback reference

Create `package-upgrade.md` beside the skill's existing delivery-contract
reference in the authored package.

The new document must contain these exact headings so the checkpoint can inspect
the agreed output structure:

```markdown
## Upgrade
## Rollback
## Limits
```

Under **Upgrade**, explain how a team:

- Identifies the current and proposed package versions.
- Reviews authored changes, metadata, and skill-relative references.
- Uses LF source text before generating locks.
- Intentionally installs the reviewed update in both consumers.
- Reviews the deployment diff and checks reuse, audits, and application tests.
- Stops if a required check fails instead of weakening the gate.

Under **Rollback**, explain how a team returns to a previously reviewed package
release or source revision, regenerates the lockfile with an intentional normal
install, reviews the deployment diff, and reruns the audit and application tests.
Do not prescribe hand-editing a lockfile or resetting unrelated work.

Under **Limits**, state that package integrity does not prove correct model
behavior, tests do not establish distributed exactly-once delivery, and package
content must not contain secrets.

You may ask Copilot to author the reference. Give it the scope and requirements
above; review the resulting content yourself. A long document is not inherently
better than a short, checkable contract.

## 3. Wire the reference into the skill

Edit the authored skill, adding a package-update step that links to:

```markdown
[package upgrade](./references/package-upgrade.md)
```

The relative link must be exactly usable from the installed skill, not only from
the monorepo's source location. Preserve the existing delivery-contract link and
the implementation workflow.

Do not paste the entire new reference into the skill body. This exercise should
demonstrate progressive loading: discovery metadata, a concise workflow, and
reference material loaded when needed.

## 4. Add one narrowly scoped package-review instruction

Create `package-review.instructions.md` in the package's authored instructions
directory. Use:

```yaml
---
description: "Use when reviewing package Markdown, upgrade procedures, or reusable Copilot guidance."
applyTo: "packages/**/*.md"
---
```

Write a concise body that tells a contributor to:

1. Change authored package source rather than deployed copies.
2. Keep skill-relative references valid after installation.
3. Review a version change, upgrade procedure, and deployment diff together.
4. Run required checks without claiming that passing audits ensures model determinism.

Do not use `applyTo: "**"` or add a new agent when one small instruction suffices.

## 5. Bump the package version and observe the frozen boundary

Change only the webhook package's source version from `1.0.0` to `1.1.0`.
Do not bump the baseline or root lab version for this domain-package feature.

Before accepting the change into the lock, run:

```powershell
& .\scripts\apm.ps1 install --frozen --target copilot
$FrozenExit = $LASTEXITCODE
if ($FrozenExit -eq 0) { throw 'Expected frozen mode to reject changed local package content.' }
```

Expected: an explicit local-content/locked-snapshot mismatch. This is the intended
reproducibility boundary. An authorization error or missing executable is not
the expected result.

## 6. Intentionally accept and deploy the reviewed source change

Now use a normal install because you intend to change the resolved content:

```powershell
& .\scripts\apm.ps1 install --target copilot
if ($LASTEXITCODE -ne 0) { throw 'Root package update failed.' }
$Repo = (Get-Location).Path
Push-Location .\packages
try {
    & "$Repo\scripts\apm.ps1" install --target copilot
    if ($LASTEXITCODE -ne 0) { throw 'Second-consumer update failed.' }
}
finally {
    Pop-Location
}
npm run verify:authoring
if ($LASTEXITCODE -ne 0) { throw 'The authoring checkpoint is incomplete.' }
npm run verify:reuse
if ($LASTEXITCODE -ne 0) { throw 'The second consumer is not on the same package content.' }
```

Expected: version 1.1.0, the new reference, and the scoped instruction appear in
both deployed trees. The baseline stays transitive and unchanged.

The authoring verifier checks structure and deployment. You must still review
the upgrade procedure itself; heading checks cannot prove its quality.

## 7. Validate and review the deployment diff

```powershell
& .\scripts\apm.ps1 compile --validate --target copilot
if ($LASTEXITCODE -ne 0) { throw 'Customization validation failed.' }
& .\scripts\apm.ps1 audit --ci --policy .\apm-policy.yml
if ($LASTEXITCODE -ne 0) { throw 'Root audit failed.' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'A source, test, or documentation check failed.' }
git --no-pager diff -- packages .agents .github apm.lock.yaml
```

Inspect the version, new files, description, relative link, and both lockfiles.
Do not accept unrelated agent tools, hooks, MCP entries, scripts, or broad
always-on guidance.

`apm compile --validate` validates without generating compiled instructions.
It is **not** how skills, prompts, and agents are deployed. `apm install` performs
that integration. A full compile is unnecessary for this native Copilot target
and could also change root instruction surfaces.

## 8. Prepare an explicit, standalone release source

APM 0.35.0 refuses to pack manifests with local development path dependencies.
Do not remove the dependency graph from the learner manifests to evade that
restriction.

Instead, prepare a curated source package containing the baseline and domain
primitives, with no external or local dependency paths:

```powershell
node .\scripts\prepare-release.mjs
if ($LASTEXITCODE -ne 0) { throw 'Release preparation failed.' }
Get-Content .\.lab\release\apm.yml
Get-ChildItem -LiteralPath .\.lab\release\.apm -Recurse -File
```

Expected: `northstar-webhook-kit`, version 1.1.0, `includes: auto`, an empty APM
dependency list, and all authored primitive files including your new reference.
This is an intentional curated distribution, not a transitive dependency lock.

The generator rejects colliding source filenames. On a repeat run it replaces
only its marked, generated release directory. Never author changes in that
generated directory.

## 9. Install the producer's own content, then pack the supported format

```powershell
$Repo = (Get-Location).Path
Push-Location .\.lab\release
try {
    & "$Repo\scripts\apm.ps1" install --target copilot
    if ($LASTEXITCODE -ne 0) { throw 'Producer installation failed.' }
    & "$Repo\scripts\apm.ps1" pack --format claude-plugin --archive --output .\build
    if ($LASTEXITCODE -ne 0) { throw 'Bundle packing failed.' }
}
finally {
    Pop-Location
}
$Bundle = Join-Path $Repo '.lab\release\build\northstar-webhook-kit-1.1.0.zip'
Get-Item -LiteralPath $Bundle
Get-FileHash -LiteralPath $Bundle -Algorithm SHA256
```

Expected: one ZIP containing a plugin manifest, primitive folders, and an embedded
integrity lockfile. Inspect its SHA-256 when comparing distributed copies.

The `claude-plugin` format name describes the supported bundle layout. APM can
deploy this bundle to the Copilot target; it does not require Claude to be
installed. Do **not** substitute `--format apm`: that legacy format is not accepted
by the `apm install <archive>` flow tested in this lab.

## 10. Install the ZIP into an empty consumer

Use the supplied empty manifest:

```powershell
$BundleConsumer = Join-Path $Repo '.lab\bundle-consumer'
if (Test-Path -LiteralPath $BundleConsumer) {
    throw 'The demo consumer already exists. Inspect it before choosing a new exercise directory.'
}
New-Item -ItemType Directory -Path $BundleConsumer | Out-Null
Copy-Item -LiteralPath .\fixtures\bundle-consumer.yml -Destination "$BundleConsumer\apm.yml"
Push-Location $BundleConsumer
try {
    & "$Repo\scripts\apm.ps1" install $Bundle --target copilot
    if ($LASTEXITCODE -ne 0) { throw 'The bundle could not be installed.' }
    & "$Repo\scripts\apm.ps1" audit --ci --policy "$Repo\apm-policy.yml"
    if ($LASTEXITCODE -ne 0) { throw 'Installed-bundle audit failed.' }
    Get-Content .\.agents\skills\webhook-change\references\package-upgrade.md
    Get-Content .\apm.yml
}
finally {
    Pop-Location
}
```

Expected: the new reference is available and the audit passes. The empty
consumer's manifest is **not** rewritten with a declarative package dependency:
bundle installation is an imperative distribution flow and records deployment
metadata in the lockfile. Keep the original ZIP as its source artifact.

Inspect the installed agent's read-only tools and the prompt as well. A skill
alone is not proof that all primitive types survived distribution.

## 11. Repeat discovery and validate the round-trip

Start a new root-workspace Copilot chat. Ask it to use the updated skill and
explain how to upgrade and roll back a reviewed package. Confirm it reads the new
installed reference and preserves the required checks and source boundaries.

Then run:

```powershell
npm run test:lab
if ($LASTEXITCODE -ne 0) { throw 'The updated package failed a real APM workflow.' }
npm run test:acceptance
if ($LASTEXITCODE -ne 0) { throw 'Package work must not regress application behavior.' }
```

The round-trip test compares normalized text content and audits the installed
bundle. ZIP bytes themselves need not be identical between independent builds;
archive metadata can differ. Compare the hash of the artifact actually shared.

## Completion checks

- Package version 1.1.0 is installed with matching content in both consumers.
- The new reference and scoped instruction are deployed in both consumers.
- Authoring, reuse, audit, and acceptance checks pass.
- The ZIP installs successfully into a clean consumer.
- Copilot can use the new installed reference.

**Checkpoint:** you can author and distribute a usable package, not merely create
a Markdown file. Continue to [Lab 5](05-govern.md).
