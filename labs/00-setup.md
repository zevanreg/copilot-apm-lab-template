# Setup: prepare a clean, reproducible workstation

**Time:** 20-30 minutes before the timed labs.
**Starting directory:** a parent folder such as `C:\repos`.
**End state:** the starter checks pass and Copilot is available; no application
solution has been implemented.

## 1. Create an empty Azure Repos Git repository

1. Open the assigned Azure DevOps organization and project.
2. Open **Repos**, select the repository menu, and choose **New repository**.
3. Choose **Git** and name the repository, for example `copilot-apm-lab`.
4. Do not initialize a competing README or ignore file; this checkout already
   contains them.
5. Copy the repository's credential-free HTTPS clone URL.

For private repositories, use your approved Entra/Git Credential Manager flow.
Never put a PAT in a Git remote URL.

## 2. Open the correct shell and check tools

Open **PowerShell 7**, not Windows PowerShell 5.1. Run:

```powershell
$PSVersionTable.PSVersion
git --version
node --version
npm --version
```

Expected:

- PowerShell major version 7 or newer.
- A working Git installation.
- Node.js at least 24.11.0. Use the organizer's approved installation method
  if your version is older.
- npm available from the same Node installation.

For the PowerShell version, inspect `Major`. For Node, compare all three version
components if you are on version 24. A newer major version is supported.
If a command is not found, install that prerequisite and open a new shell before
continuing. Do not disable certificate checks or endpoint protection to proceed.

## 3. Clone the initialized GitHub starter and publish to Azure Repos

Use the initialized GitHub starter supplied by the organizer. It already contains
the lab files and Git history. Do not clone over an existing directory.

```powershell
Set-Location C:\repos
$CloneUrl = Read-Host 'Paste the GitHub starter HTTPS clone URL supplied by the organizer'
git clone $CloneUrl copilot-apm-lab
if ($LASTEXITCODE -ne 0) { throw 'Clone failed; resolve GitHub access or authentication first.' }
Set-Location .\copilot-apm-lab
$Repo = (Get-Location).Path
git --no-pager status --short
git ls-remote origin
if ($LASTEXITCODE -ne 0) { throw 'The GitHub starter remote is not accessible.' }
```

Use your approved Git Credential Manager or SSH setup. Do not embed a token in
the clone URL. Do not paste credentials into chat or documentation.

The initial status should be clean. The remote query should list refs from your
GitHub starter repository. If there are pre-existing changes, inspect them with
the organizer; do not reset or discard them.

The clone already has commits and an `origin` pointing to GitHub. Do not run
`git init` or create another initial commit. Keep GitHub as `upstream` and use the
empty Azure repository from step 1 for workshop branches, PRs, and builds:

```powershell
$AzureUrl = Read-Host 'Paste the empty Azure Repos HTTPS clone URL from step 1'
git remote rename origin upstream
if ($LASTEXITCODE -ne 0) { throw 'Could not preserve the GitHub remote; inspect existing remotes.' }
git remote add origin $AzureUrl
if ($LASTEXITCODE -ne 0) { throw 'Could not add the Azure remote; inspect existing remotes.' }
git push -u origin HEAD:main
if ($LASTEXITCODE -ne 0) { throw 'Publishing failed; resolve Azure Repos access or authentication.' }
git ls-remote origin
if ($LASTEXITCODE -ne 0) { throw 'The Azure remote is not accessible.' }
```

This publishes the existing history to Azure's `main` branch without changing
local files. Do not push workshop changes to the shared GitHub starter or
force-push over an existing Azure history. See the
[hosting guide](../docs/azure-devops.md) for pipeline and branch-policy setup.

## 4. Open the repository in VS Code

Run `code .` if the command is on your PATH, or use **File > Open Folder** and
select the repository root.

1. Review the repository before granting workspace trust.
2. Open the Extensions view and confirm GitHub Copilot is installed and enabled.
3. Sign in with the account that has your Copilot entitlement.
4. Open Chat and confirm you can select the approved model and Agent mode.

Do not install an extension or enable broad permissions solely because an agent
suggests doing so. The lab needs no external MCP server.

## 5. Install the pinned, repository-local APM

In the VS Code PowerShell 7 terminal at the repository root:

```powershell
& .\scripts\install-apm.ps1
& .\scripts\apm.ps1 --version
if ($LASTEXITCODE -ne 0) { throw 'The pinned APM is not runnable.' }
```

Expected version: `0.35.0`.

The installer verifies the release archive's pinned SHA-256 and extracts the
entire Windows distribution, including its Python runtime. It does not change
your global APM, PATH, or PowerShell profile.

Use the wrapper in every exercise, even if a different `apm` is already installed.
The wrapper keeps APM configuration and cache in the current project's ignored
`.lab` folder for the duration of the process. It restores your shell's prior
environment values afterward. In this pinned release, deployment write receipts
still live in the OS user's `.apm` directory, with an ignored `.apm-local`
installation identity in each project. Git authentication and central policy
discovery are not disabled by the configuration/cache isolation.

If script execution is blocked, use your organization's approved policy or ask
the organizer. Do not set a machine-wide execution-policy bypass.

## 6. Restore npm dependencies without running package scripts

```powershell
npm ci --ignore-scripts
if ($LASTEXITCODE -ne 0) { throw 'Dependency restore failed.' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'Starter checks failed; stop and diagnose.' }
```

This restores the exact development dependencies in the npm lockfile, type-checks
and builds the API, runs baseline and helper tests, parses the pipeline YAML, and
checks local documentation links and customization frontmatter.

Expected: all selected checks pass. This command deliberately does not run the
unfinished application's acceptance suite.

## 7. Restore the locked Copilot context

The deployed customization files are already committed so they can be reviewed
in Azure Repos. Installation restores their package context and verifies the
local package sources.

```powershell
& .\scripts\apm.ps1 install --frozen --target copilot
if ($LASTEXITCODE -ne 0) { throw 'The root context did not match its lockfile.' }
& .\scripts\apm.ps1 audit --ci --policy .\apm-policy.yml
if ($LASTEXITCODE -ne 0) { throw 'The root context failed audit.' }
```

Restore the second APM project as well:

```powershell
$Repo = (Get-Location).Path
Push-Location .\packages
try {
    & "$Repo\scripts\apm.ps1" install --frozen --target copilot
    if ($LASTEXITCODE -ne 0) { throw 'The second context did not match its lockfile.' }
    & "$Repo\scripts\apm.ps1" audit --ci --policy "$Repo\apm-policy.yml"
    if ($LASTEXITCODE -ne 0) { throw 'The second context failed audit.' }
}
finally {
    Pop-Location
}
npm run verify:reuse
if ($LASTEXITCODE -ne 0) { throw 'Consumers do not contain the same package content.' }
```

Expected: two package identities, including the transitive engineering baseline,
are available to each consumer. Both audits and the reuse check pass.
Your working directory ends at the repository root.

Before any package-authoring edits, materialize the reviewed skill files locally:

```powershell
npm run setup:context
if ($LASTEXITCODE -ne 0) { throw 'Context materialization failed; preserve the reported backup and diagnose.' }
```

Why this additional step? APM 0.35.0 does not treat copied lock metadata as trusted
local overwrite authorization for a changed skill. A fresh clone's committed skill
files can be audited, but a later update needs local write receipts.

The helper first checks every skill file against its lock and rejects extra files
or links before invoking an installer. It audits and frozen-restores each consumer,
then moves only that verified skill
tree to a named backup, and frozen-installs it again to create real local writes.
It audits the result before deleting the verified backup. No source or lock is
changed, and `--force` is not used. If a failure occurs, the original is preserved
at the reported backup path.

Do not skip this step and then edit package sources. Do not copy `.apm-local`
or user-global receipts into another checkout.

Do not use a normal install to hide an unexpected frozen-install failure.
First distinguish a real source change from an incomplete checkout or unsupported
tool version using [troubleshooting](../docs/troubleshooting.md).

## 8. Check your starting state

```powershell
npm run verify:starter
if ($LASTEXITCODE -ne 0) { throw 'Starter context verification failed.' }
git --no-pager status --short
```

The working tree should still be clean. Ignored tools, caches, build output,
and `apm_modules` must not appear as files to commit.

**Checkpoint:** tools are available, both locked contexts restore, and starter
checks pass. Continue to [Lab 1](01-diagnose.md).
