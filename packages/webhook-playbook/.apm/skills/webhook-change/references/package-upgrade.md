## Upgrade

1. Identify the currently installed package version and resolved source revision
   in each consumer's generated lockfile. Compare them with the proposed release
   or source revision and its package manifest version; record what is changing.
2. Review the authored package diff, manifest dependencies, and customization
   metadata, including descriptions, scope, and tools. Check that skill-relative
   references resolve from the installed skill, not just from the source tree.
   Change authored package sources, never managed deployment copies.
3. Ensure authored source text uses LF line endings before generating new locks.
   Review any normalization changes as part of the source update.
4. Intentionally accept the reviewed update with a normal install, not a frozen
   install. Use the repository-local pinned `scripts/apm.ps1` wrapper to run
   `install --target copilot` first at the repository root and then in the
   independent `packages` consumer, invoking the same wrapper by its absolute
   path from that directory. This regenerates both locks and deploys the update.
5. Review the deployment diff alongside the authored changes: both lockfiles,
   both consumers' `.github` and `.agents` outputs, versions, metadata, and
   references must match the intended update without unrelated additions.
   Run `npm run verify:reuse` at the root and `compile --validate --target copilot`
   through the pinned wrapper in both consumers. Run `audit --ci` in both
   consumers with the local policy explicitly supplied: `--policy ./apm-policy.yml`
   at the root and `--policy ../apm-policy.yml` in `packages`. A local policy file
   is not automatically enforced during installation.
6. Run `npm run check` and `npm run test:acceptance` at the root. Check every
   command's exit status and stop if any required check fails. Repair the cause
   and rerun the checks; do not weaken tests, policy, or release gates to accept
   the update.

## Rollback

1. Select a previously reviewed package release or source revision and confirm
   its version and provenance. Point both consumers at that release, or restore
   only the affected authored package sources from that revision. Preserve
   unrelated work; do not reset the worktree.
2. Ensure the restored source text uses LF. Intentionally run a normal
   `install --target copilot` through the same pinned wrapper in each consumer
   to regenerate its lockfile and deploy the selected content. Do not hand-edit
   a lockfile or use frozen installation to accept changed source content.
3. Review both generated lockfiles and the deployment diff against the selected
   release or revision. Confirm versions, metadata, and skill-relative references
   are restored as intended, with no unrelated changes.
4. Rerun reuse verification, customization validation, both explicit-policy
   audits, `npm run check`, and `npm run test:acceptance` as described above.
   Stop if any required check fails; a rollback is not accepted until it passes.

## Limits

- Package integrity verifies reviewed content, not correct or deterministic
  model behavior.
- These application tests exercise an in-memory lab; they do not establish
  distributed exactly-once delivery.
- Package content must not contain secrets, including in manifests, prompts,
  references, or Git URLs.