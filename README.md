# Copilot lab: an APM context supply chain on Azure DevOps

Turn copied AI guidance into reviewed, reusable, reproducible agent packages.
All workshop code, package sources, branches, pull requests, and builds live in
**Azure Repos and Azure Pipelines**. GitHub Copilot runs locally in VS Code.
No GitHub repository, GitHub Actions workflow, Azure subscription, database,
external MCP server, or paid application infrastructure is required.

## The assignment

You are a Northstar Commerce platform engineer. Teams have conflicting webhook
guidance and inconsistent Copilot setups. Consume a shared package, use it to
fix duplicate webhook deliveries, extend the package, reproduce its context in
another APM project, investigate drift, and establish an Azure DevOps release gate.

**This is a learner starter, not a finished application solution.**
The API deliberately creates duplicate dispatches. The 10 baseline tests pass;
the acceptance suite initially has 1 passing and 6 failing tests. Fixing those
failures is part of the workshop. No hidden solution is installed into Copilot.

## Start here

1. **Organizers:** publish the repository and prepare Azure DevOps using
   [hosting and permissions](docs/azure-devops.md) and the [instructor guide](docs/instructor.md).
2. **Learners:** complete [environment setup](labs/00-setup.md).
3. Follow the six labs in order. Each includes commands, expected observations,
  Copilot prompts, completion checks, and recovery guidance.

| Lab | Time | Outcome |
|---|---:|---|
| [1. Diagnose context sprawl](labs/01-diagnose.md) | 15 min | Establish an honest failing behavioral baseline. |
| [2. Consume context and fix the API](labs/02-consume.md) | 25 min | Use installed instructions, a skill, a prompt, and a reviewer agent. |
| [3. Trace and reproduce dependencies](labs/03-reproduce.md) | 20 min | Reproduce the same package content in two APM projects. |
| [4. Author and distribute](labs/04-author.md) | 35 min | Release version 1.1.0 and install a self-contained ZIP. |
| [5. Investigate drift and policy](labs/05-govern.md) | 30 min | Detect a deployed-file edit and reject an unreviewed manifest command. |
| [6. Gate the release in Azure DevOps](labs/06-release.md) | 25 min | Require acceptance, integrity, documentation, and graduation checks. |

Allow another 20-30 minutes for initial setup. Advanced users may work in pairs:
one drives the application task, the other reviews the context supply chain.

## Supported environment

- Windows x64, or Windows Arm64 with x64 application emulation.
- PowerShell 7, Git, VS Code, and a working GitHub Copilot entitlement.
- Node.js 24.11 or newer. Azure Pipelines uses Node.js 24 LTS.
- The lab downloads **APM 0.35.0**, verifies a pinned SHA-256, and keeps it local.
- Azure Repos access; pipeline and branch-policy permissions for the final lab,
  or an organizer who can perform those administrative steps.

The PowerShell commands in these guides are intentional. WSL, Bash, Codespaces,
and Linux agents are not the supported walkthrough environment.

## Quick local validation

From the repository root in PowerShell 7:

```powershell
& .\scripts\install-apm.ps1
npm ci --ignore-scripts
npm run check
npm run setup:context
npm run verify:reuse
npm run test:lab
```

Check `$LASTEXITCODE` after each native command; setup explains how.
`npm run test:lab` performs five real APM workflow tests in disposable,
named sandboxes. It does not repair the application or change learner sources.

Do **not** expect `npm run test:acceptance` or `npm run verify:graduation` to pass
on the untouched starter. The pipeline's default is explicitly **starter mode**.
Lab 6 changes the default to require the completed application and authored package.

## Repository map

```text
app\
  src\                       Small HTTP API; delivery.ts is the learner task
  test\                      Baseline and acceptance tests
packages\
  apm.yml                    Second, independent APM consumer manifest
  apm.lock.yaml              Second consumer's generated lockfile
  engineering-baseline\
    .apm\instructions\       Authoritative baseline source
  webhook-playbook\
    .apm\                    Authoritative skill, prompt, agent, instructions
labs\                        Detailed learner walkthroughs
docs\                        Architecture, hosting, instructor, troubleshooting
fixtures\                    Inert discussion and policy material
scripts\                     Pinned APM wrapper, checks, release staging, scenarios
.github\                     Root consumer's Copilot outputs and bootstrap rules
.agents\                     Root consumer's installed skill and references
apm.yml                      Root consumer manifest
apm.lock.yaml                Root consumer's generated lockfile
apm-policy.yml               Explicit local audit policy
azure-pipelines.yml          Azure Pipelines starter/graduation gate
```

The second APM project is the **packages folder itself**. Keeping the shared
sources underneath both consumer roots avoids machine-specific transitive paths
in the pinned APM release. There is only one authored copy of each package.
See [architecture and release constraints](docs/architecture.md).

## What is and is not guaranteed

- Lockfiles and audits verify configuration and integrity, not identical LLM answers.
- APM normalizes text line endings for its recorded text hashes.
- APM installation is not an agent runtime sandbox.
- This repository passes its local policy explicitly to `apm audit --ci`.
  Merely placing a policy file in the checkout does not establish a central
  install-time policy.
- Local development dependencies cannot be packed directly in APM 0.35.0.
  The lab creates an explicit, dependency-free curated release before packing.
- APM's local write receipts are not Git artifacts. Setup verifies and
  rematerializes only the locked skill trees before package-authoring work.
- A `.github` folder works as a local Copilot customization surface even though
  Azure Repos hosts the Git repository.
- The API is process-local, unauthenticated, and loopback-only by default.
  It is not a production webhook service.

The upstream APM binary is downloaded from its public GitHub release; npm
dependencies come from npm. These tool downloads do not move the lab repositories
to GitHub. Restricted-network organizers can pre-provision approved binaries.

## References

- [APM documentation](https://microsoft.github.io/apm/)
- [Pinned APM 0.35.0 release](https://github.com/microsoft/apm/releases/tag/v0.35.0)
- [Azure Repos authentication](https://learn.microsoft.com/azure/devops/repos/git/auth-overview)
- [Azure Repos PR build-validation policies](https://learn.microsoft.com/azure/devops/repos/git/branch-policies)
- [Troubleshooting](docs/troubleshooting.md)

No Azure DevOps organization, repository, pipeline, or remote credential is
created automatically by this checkout.
