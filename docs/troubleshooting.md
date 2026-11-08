# Troubleshooting and safe recovery

Classify a failure before changing anything: environment, source behavior,
package integrity, policy, or discovery. Do not turn every nonzero exit into an
expected negative result.

## PowerShell script cannot run

Use PowerShell 7 and the organization's approved script policy. Do not set a
machine-wide execution-policy bypass. If scripts are blocked by a managed policy,
ask the organizer for an approved execution environment.

## APM version differs from the lab

Use [the wrapper](../scripts/apm.ps1), not a global `apm` from PATH:

```powershell
& ./scripts/install-apm.ps1
& ./scripts/apm.ps1 --version
```

Expected: 0.35.0. The installer does not upgrade global tools.
If a partial installation exists, inspect the exact version directory first.
Move that named version directory aside for diagnosis or remove only that
confirmed local tool installation, then rerun the installer. Do not delete the
whole repository, user profile, or global APM state.

## Installer checksum failure or missing runtime DLL

A checksum failure is a stop condition. Verify network/proxy and approved
software distribution with the organizer; never remove the hash check.

The Windows archive includes a directory with `apm.exe` and its runtime. Copying
only the executable causes Python DLL errors. Use the supplied full-archive
installer or extract the entire approved archive into the expected tool layout.

Windows Arm64 requires x64 application emulation for the pinned APM distribution.
If execution is blocked, use the organizer's supported Windows machine or agent.

## Dev container cannot run APM

The pinned Linux APM runtime requires glibc 2.38 or newer. Use the supplied
Debian Trixie container and **Dev Containers: Rebuild Container** if an older
image reports a missing glibc version. Do not replace system libraries manually.
Linux APM may append a build revision to its version; the installer accepts that
suffix while still requiring version 0.35.0 and the pinned archive checksum.

## npm restore or TypeScript fails

Check Node.js is at least 24.11 and run `npm ci --ignore-scripts` from the root.
Do not run npm from the source-package folders; they are APM packages, not npm
workspaces. Keep the npm lockfile and do not install arbitrary latest versions
as a troubleshooting shortcut.

If a corporate proxy or certificate blocks downloads, use the approved trust
configuration or mirror. Do not disable TLS verification.

For an organizer-approved, byte-equivalent mirror, you can retain the public
lockfile and use `npm ci --ignore-scripts --registry=<approved-mirror-url>
--replace-registry-host=always` on one line. Replace the placeholder first.
The mirror's bytes must still pass the original integrity pins. Do not delete
integrity fields or commit a workstation-specific authenticated feed URL.

If registry TLS negotiation fails on the host and in the container, use the
approved network or mirror rather than bypassing certificate checks. A preseeded
npm cache can be used offline only if it contains every dependency pinned in the
lockfile. In the container's PowerShell terminal:

```powershell
$env:npm_config_offline = 'true'
try {
  pwsh -NoProfile -File .devcontainer/setup.ps1
  if ($LASTEXITCODE -ne 0) { throw 'Offline container setup failed.' }
}
finally {
  Remove-Item Env:\npm_config_offline
}
```

## Acceptance tests fail on the untouched starter

That is expected only if the result is 7 executed tests, 1 passing and 6 failing,
for replay, conflict, normalization/replay, and concurrency assertions.

Type errors, missing modules, startup errors, or all tests failing are not the
intended learner baseline. After Lab 2 all 7 acceptance tests must pass.

## Frozen install reports changed local content

First ask whether a package source actually changed.

- Before Lab 4: unexpected; inspect your checkout, line-ending configuration,
  tool version, and any unreviewed source changes.
- During Lab 4 after authoring: expected; review source and version, then use a
  normal install to intentionally update both locks and deployments.
- In CI: do not regenerate locks automatically. Return the inconsistency to the
  author for a reviewed source/lock/deployment update.

Do not hand-edit a lockfile or add `--force` to make the failure disappear.

## A relocated nested project has an absolute path in its lock

Use the supplied second-consumer layout: its manifest is in the packages folder,
with shared sources underneath it. Do not move it to a sibling folder that must
reach outside its root in APM 0.35.0.

If you deliberately redesign the layout, generate a fresh reviewed lock through
APM and test a relocated cold checkout. Do not search-and-replace absolute
metadata inside a generated lock.

## Audit fails after a normal install

Read the named check and file. APM audit can report missing output, managed
modification, orphaned content, manifest/lock inconsistency, or explicit policy
violations.

For the controlled drift exercise, use `restore-drift`. If it refuses restoration,
the file acquired additional edits; inspect that file and backup rather than
overwriting them.

For intentional source changes, review the source, regenerate both consumers,
and rerun audit. Keep the distinction between source, cache, deployed output,
and lock clear.

## A skill update says there is no trustworthy local deployment baseline

The pinned release requires local write receipts, not only a checked-out lock,
before overwriting changed skill files. Complete `npm run setup:context` before
authoring changes. It verifies and rematerializes the locked skill without
`--force`.

If you already changed source, preserve that work. Use a new checkout of the
reviewed starting revision, run setup and materialization there, then reapply
your reviewed source changes and intentionally regenerate both consumers.
Do not copy `.apm-local` or user-global receipts to manufacture overwrite authorization.
If the helper reports a backup after failing, preserve it until you inspect the
specific skill tree and decide how to restore it safely.

## A raw file SHA-256 differs from a recorded text hash

APM's recorded text hashes normalize Windows newlines. The supplied verifier uses
the same CRLF-to-LF normalization for text. A raw file hash is still appropriate
for checking that a frozen lockfile was not rewritten, or for identifying the
actual ZIP artifact shared.

Do not remove content checks because a raw comparison used the wrong semantics.

## Skills, prompt, or agent does not appear in Copilot

1. Confirm the workspace is the intended root, not a random subfolder.
2. Verify the deployed files, YAML frontmatter, and relative resources.
3. Run frozen installation and audit.
4. Start a new chat; reload the window if necessary.
5. Inspect VS Code's current customization diagnostics and organization settings.
6. Try **Chat: Run Prompt**, the agent picker, or explicit context attachment.
7. Verify the method that worked; explicit attachment is not automatic discovery.

Parent and nested repository customizations may both be discovered. The nested
folder is not a guaranteed isolation boundary.

## Pack rejects a local dependency or the archive cannot install

Use [Lab 4](../labs/04-author.md):

- Generate a dependency-free curated source.
- Install the producer's own primitives.
- Pack `--format claude-plugin --archive`.
- Install the ZIP with an explicit Copilot target.

Do not pack the development consumer's local path graph directly.
Do not use the legacy `--format apm` archive for `apm install <archive>`.
Do not assume the portable `agent-plugin` format accepts all instructions,
prompts, and agents in this lab.

## Policy candidate unexpectedly passes

Confirm you:

1. Prepared the candidate in the marked sandbox.
2. Installed that candidate, not the unchanged root.
3. Retained the proposed manifest `scripts` declaration.
4. Passed the root policy explicitly to `audit --ci --policy`.
5. Inspected the `scripts-policy` result.

A local policy file is not an automatically discovered central install policy.
The lab does not use a local-source denylist as a proxy for the tested scripts
rule. Do not claim a rule is enforced without observing its own negative case.

## Azure Repos clone or remote dependency fails

Verify the real clone URL and repository permissions. Use the approved Git
credential helper or APM's documented Azure authentication flow.
Remote package authentication is additional to the core local-path exercises.

Do not paste tokens into chat, manifests, documentation, URL userinfo, or debug logs.
For Azure DevOps Server, confirm the registered host and its distinct auth flow.

## Azure pipeline cannot access packages or agent pool

Check Build Service permissions, repository authorization, job authorization
scope, protected-repository settings, and hosted parallel-job availability.
Core local packages need no extra repository token after checkout.

For optional remote packages, do not assume checkout credentials automatically
authorize another clone. Test the actual noninteractive authentication path.

## CI is green but acceptance never ran

Inspect the validation log for the execution mode and `GRADUATION PASSED`.
Starter mode is not graduation.
Set the pipeline default to require acceptance and verify the actual build
parameter, step logs, and final PR commit. Protect changes to the gate itself.

## Port 3000 is already used

Use a different port in the terminal running your own foreground server:

```powershell
$env:PORT = '3100'
npm start
```

Use that same port for manual probes, then clear the process-level variable:

```powershell
Remove-Item Env:/PORT
```

Stop only your own server with Ctrl+C. Do not kill processes by name.
Automated application tests use their own ephemeral ports and should not collide.

## Windows access denied in APM state or scratch files

The wrapper isolates configuration and cache inside the current project's `.lab`
folder; this APM release still writes deployment receipts under the OS user's
`.apm` directory.
Confirm the checkout is writable and endpoint security is not blocking the
verified tool. Close only your own conflicting operation and rerun the failed
command after inspecting it.

Do not delete the user-global APM directory, disable endpoint protection, or hide
the failure with a blanket retry. Escalate a repeatable platform/tool issue with
the exact command and sanitized error.
