# Host and operate the lab in Azure DevOps

This guide is for the organizer. It describes actual Azure Repos and Azure
Pipelines setup; no GitHub repository is involved.

## Choose the workshop topology

Recommended: one Azure DevOps project with one copy of the lab repository per
learner or pair. Each repository can have its own pipeline and target-branch
policies, allowing independent final merges.

Lower-administration alternative: one shared repository with a branch per learner.
Keep the starter branch unchanged and leave learner PRs open for review rather
than merging incompatible workshop solutions into the common starter.

The core lab keeps package sources in the same repository and reuses them locally
after clone. A remote-package extension is described below.

## Required permissions

| Actor | Required capabilities |
|---|---|
| Learner | Read the repository; contribute branches; create/update PRs. |
| Pipeline user | Queue and view builds; access the approved agent pool. |
| Organizer | Create repositories/pipelines; configure target-branch policies and reviewer requirements. |
| Build identity | Read the lab repository and any optional remote package repositories. |

Azure DevOps project/repository permissions are separate from Copilot licensing.
No Azure Resource Manager service connection or Azure subscription is needed.

## 1. Create an empty Azure Repos Git repository

1. Open the assigned Azure DevOps organization and project.
2. Open **Repos**, select the repository menu, and choose **New repository**.
3. Choose **Git** and name the repository, for example `copilot-apm-lab`.
4. Do not initialize a competing README or ignore file; this checkout already
   contains them.
5. Copy the repository's credential-free HTTPS clone URL.

For private repositories, use your approved Entra/Git Credential Manager flow.
Never put a PAT in a Git remote URL.

## 2. Validate the local starter before publishing

From the local lab root:

```powershell
& .\scripts\install-apm.ps1
npm ci --ignore-scripts
if ($LASTEXITCODE -ne 0) { throw 'npm restore failed.' }
& .\scripts\ci.ps1 -RequireAcceptance:$false
```

Expected: starter mode passes, and the summary explicitly reports
`acceptanceRequired: false`.

Separately run the acceptance suite to confirm the seeded starting state:

```powershell
npm run test:acceptance
if ($LASTEXITCODE -eq 0) { throw 'Do not publish an already-completed starter by mistake.' }
```

Expected: 7 tests, 1 passing and 6 failing, for the deliberate duplicate/conflict
gap. A syntax or dependency failure is not an acceptable workshop baseline.

## 3. Create the initial commit and Azure remote

This repository may already have local Git initialized but no commits.
Inspect before changing source control:

```powershell
git --no-pager status --short
git remote -v
```

If Git is not initialized, run `git init --initial-branch=main` here.
If an unexpected remote or existing history is present, preserve it and resolve
the topology with the owner rather than overwriting it.

Stage only the reviewed starter content:

```powershell
git add -- .gitignore .gitattributes .npmrc .github .agents app docs evidence fixtures labs packages scripts README.md lab.config.json package.json package-lock.json tsconfig.json tsconfig.build.json apm.yml apm.lock.yaml apm-policy.yml azure-pipelines.yml
git --no-pager diff --cached --stat
git --no-pager diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Review staged whitespace errors before publishing.' }
git commit -m "Add the Copilot APM lab for Azure DevOps"
if ($LASTEXITCODE -ne 0) { throw 'Initial commit failed.' }
```

Follow your organization's commit-signing and attribution rules.
Inspect the staged inventory before the commit: no `.tools`, `.lab`, `apm_modules`,
`node_modules`, credentials, or completed application solution should be present.

For a checkout with no existing origin:

```powershell
$AzureUrl = Read-Host 'Paste the empty Azure Repos HTTPS clone URL'
git remote add origin $AzureUrl
if ($LASTEXITCODE -ne 0) { throw 'Remote setup failed; inspect existing remotes.' }
git push -u origin main
if ($LASTEXITCODE -ne 0) { throw 'Publishing failed.' }
git tag lab-start-v1.0.0
git push origin lab-start-v1.0.0
if ($LASTEXITCODE -ne 0) { throw 'Publishing the starter tag failed.' }
```

Do not force-push over a populated repository. Use a fresh repository or a reviewed
integration workflow when history already exists.

## 4. Create the Azure Pipeline

1. Open **Pipelines > New pipeline**.
2. Choose **Azure Repos Git**.
3. Select the lab repository.
4. Choose **Existing Azure Pipelines YAML file**.
5. Select `main` and the root pipeline YAML.
6. Save/run with the acceptance parameter left **false for the starter**.
7. Authorize the repository and agent pool if prompted.
8. Confirm the validation summary says starter, not graduation.
9. Confirm both published artifacts are available:
   `lab-validation` and `northstar-webhook-kit`.

The hosted image is Windows and the pipeline installs Node.js 24 LTS. It runs the
same PowerShell script used locally.

If hosted parallel jobs are unavailable, select an approved Windows self-hosted
pool and preflight PowerShell 7, Git, Node.js, network access, and disk permissions.
A missing hosted-job entitlement is an Azure DevOps organization constraint, not
an application failure.

## 5. Configure the PR workflow

For a personal learner repository:

1. Open **Repos > Branches > main > Branch policies**.
2. Add **Build validation** using the lab pipeline.
3. Choose **Automatic** and **Required**.
4. Leave path filters empty so all relevant changes are checked.
5. Require a fresh build when the target branch changes.
6. Add your reviewer requirements.
7. Add required reviewers for changes to pipeline definitions, scripts, and policy
   using the branch-policy UI's path filters.

YAML PR triggers do not establish Azure Repos build-validation policy. The
pipeline deliberately has `pr: none`; branch policies govern the PR check.

During Lab 6 the learner changes the pipeline parameter default to `true`.
Verify that the policy-triggered build uses graduation mode. Do not accept a
manually queued starter-mode build as equivalent.

For a shared workshop repository, establish the branch and PR review rules before
the event. Avoid letting the first completed PR change the common starter for
everyone else.

## 6. Run a fresh-clone rehearsal

Use an ordinary learner account or a clean machine:

1. Clone the Azure URL into a new directory.
2. Complete [setup](../labs/00-setup.md), not a shortcut from the organizer's caches.
3. Verify both frozen locks after relocation.
4. Observe actual skill, prompt, and agent discovery in the approved VS Code build.
5. Run starter CI and download both hosted artifacts.
6. Complete one sample learner branch and verify a graduation-mode PR build.

Do not claim remote authentication or hosted execution was verified merely
because local commands passed. Record the build URL and environment used.

## Optional remote package distribution

The core exercises do not need a second repository, but a real remote install
is a useful advanced extension.

### Option A: package subdirectory in the lab Azure repository

After publishing an approved tag or full commit, a separate consumer may declare:

```yaml
name: remote-northstar-consumer
version: 1.0.0
targets:
  - copilot
includes: []
dependencies:
  apm:
    - git: https://dev.azure.com/YOUR_ORG/YOUR_PROJECT/_git/YOUR_REPO
      path: packages/webhook-playbook
      ref: lab-start-v1.0.0
```

Replace organization, project, repository, and ref with real reviewed values.
Copy the actual Git clone URL from Azure DevOps rather than guessing URL escaping
for spaces. The `path` is relative to that Git repository's root.

The package has a same-repository sibling dependency. Rehearse this remote
subdirectory/sibling resolution with the pinned CLI in your organization before
assigning it. Do not convert a locally tested path example into a claim of tested
remote behavior.

### Option B: standalone kit in a dedicated Azure repository

This is the recommended remote-release extension when you want a simple remote
identity with no local sibling dependency:

1. Complete Lab 4's authored changes.
2. Run the release generator.
3. Review its dependency-free manifest and `.apm` sources.
4. Publish only that manifest and authored `.apm` tree into a new Azure repository.
   Do not copy its `.lab`, caches, deployment output, or build ZIP into source.
5. Add a README, commit the reviewed source, and tag it, for example `v1.1.0`.
6. Install it from a separate consumer using its real Azure Git URL and tag or SHA.
7. Inspect the generated resolved commit and content hash, then run frozen
   installation and audit in a fresh checkout.

The package reference has the same object shape as above but omits `path` because
the standalone package is at its repository root.

### Authentication for Azure DevOps Services

APM supports an active Azure CLI sign-in and Git credential helpers, with a PAT
override available when required. For an approved interactive Entra flow:

```powershell
az login --tenant YOUR_TENANT_ID
```

Replace the placeholder before execution. Use the normal approved tenant
selection flow; do not capture its tokens in workshop evidence.

If a PAT is required, use a short-lived, narrowly scoped Code Read token, supply
it through a process environment or approved secret store as `ADO_APM_PAT`, and
clear it when finished. Do not put its value in commands saved to history,
manifests, screenshots, chat, source files, or clone URLs.

Azure DevOps Server additionally needs its host registered through APM's
documented `ADO_HOST` or `APM_ADO_HOSTS` mechanism; its authentication flow differs
from DevOps Services. The core lab targets Services.

### Pipeline access to private package repositories

Local path dependencies need no additional repository credential after checkout.
Remote private dependencies do.

- Give the project Build Service identity read access to each dependency repo.
- Respect **Limit job authorization scope** and **Protect access to repositories
  in YAML pipelines** settings.
- Declare/authorize additional repository resources where those settings require it.
- Use an approved credential mechanism: a scoped pipeline job token via Git
  credentials, or a separately approved short-lived secret.
- Do not assume checkout credentials automatically reach an arbitrary APM Git clone.
- Do not assume a `System.AccessToken` OAuth job token is a PAT or that placing it
  in a PAT-specific variable proves the authentication path is supported.
- Test the exact APM authentication path under the real Build Service identity.

Keep tokens out of diagnostics and ensure they cannot reach untrusted PR steps.
The supplied core pipeline does not need `persistCredentials` or extra token
variables.

## Optional central organizational policy

APM's pinned documentation describes Azure DevOps policy discovery from repository
`apm-policy` in project `apm`, with a legacy fallback. This requires organization
administration and the relevant read permissions.

Do not create a centrally authoritative policy repository merely to run a learner
exercise in an existing organization. Use an approved training organization or
have its administrators review the rollout.

Before claiming install-time enforcement, verify with real credentials:

1. Which policy was discovered.
2. Whether the Build Service can read it.
3. Which individual rules are enforced at install versus audit.
4. What happens when policy retrieval fails.
5. Which reviewers and branch policies protect the policy source.

The core lab instead supplies its local policy explicitly to every CI audit.

## Restricted networks

Lab repositories and PRs stay in Azure DevOps, but tool distribution normally uses
npm and APM's public GitHub release. If external downloads are disallowed:

- Mirror/pre-provision the approved Node and npm dependencies.
- For a byte-equivalent approved npm mirror, keep the canonical lockfile and use
  `npm ci --ignore-scripts --registry=<approved-mirror-url> --replace-registry-host=always`.
  This changes the download host while retaining the lockfile's integrity checks.
  If policy requires mirror URLs in source, the organizer can instead change the
  project registry and regenerate the lock through npm before the rehearsal.
  The distributed template uses public npm URLs, not a workstation-specific feed.
- Obtain the pinned APM archive through your approved software channel.
- Verify its SHA-256 against the reviewed value in the lab configuration.
- Extract the entire distribution into the local tool directory layout expected
  by the installer, including its runtime, before running the wrapper.
- Use an approved self-hosted agent with the same prerequisites.

Do not disable TLS, remove the checksum check, or commit a large tool binary to
the lab repository as a workaround.
