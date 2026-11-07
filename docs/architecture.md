# Architecture, ownership, and release constraints

## Application

The [application](../app/README.md) is deliberately small:

```text
HTTP request
  -> bounded JSON reader
  -> shape/value validation and normalization
  -> delivery decision
  -> process-local dispatch store
  -> JSON response
```

Parsing, validation, HTTP status envelopes, and store encapsulation are working
starter behavior. Duplicate handling in the delivery decision is the learner
task. Application tests start real HTTP servers on ephemeral loopback ports,
make requests, and close their own servers.

There are no runtime npm dependencies. Node runs erasable TypeScript directly.
The main TypeScript configuration checks both source and tests under the
application directory; the build configuration emits only source modules.
No browser, container, database, or Azure resource is needed.

## The package graph

Both APM projects resolve the same source graph:

```text
Consumer manifest
  -> webhook-playbook 1.0.0 (learner upgrades to 1.1.0)
       -> engineering-baseline 1.0.0
```

The root consumer declares `./packages/webhook-playbook`. The second consumer
is the packages directory and declares `./webhook-playbook`. The domain
package declares its sibling baseline with `../engineering-baseline`.

The second consumer is an APM project, not another Git repository. This provides
two deployment/lock scopes while keeping one authored copy of each package in
one Azure repository.

### Why not put the second project elsewhere?

APM 0.35.0 can record an absolute `anchored_local_path` for transitive sources
outside a nested project's root. A lock generated that way can fail frozen replay
after a checkout moves. Both consumers here contain the shared package sources
within their own roots, keeping generated metadata portable without editing locks.

The cold-checkout test copies reviewed inputs without caches into a different
location and runs both frozen installs. That is a stronger check than reinstalling
twice on the machine that generated the locks.

## Source versus deployed output

| Surface | Author here? | Commit? | Purpose |
|---|---|---|---|
| Package `.apm` sources | Yes | Yes | Canonical reusable guidance and resources. |
| Consumer manifests | Yes, intentionally | Yes | Explicit dependencies and Copilot targets. |
| Consumer lockfiles | Generate with APM | Yes | Resolution, integrity, ownership, and deployment metadata. |
| Consumer `.github` and `.agents` package outputs | No, except drift exercise | Yes | Reviewable, discoverable Copilot integration. |
| Root bootstrap Copilot instructions | Yes | Yes | Repository-owned workshop boundaries. |
| `apm_modules` | No | No | Derived package context restored by installation. |
| `.tools` | No | No | Pinned local APM binary. |
| `.lab` | No | No | Project-local APM state, scenarios, and generated releases. |
| `.apm-local` | No | No | Ignored installation identity, not portable overwrite authorization. |

Reviewable deployment files do not mean every installed package is self-contained.
Preserve package resources while agents follow their links.

### Local write receipts

The pinned release binds skill-overwrite authority to actual local deployment
writes. A copied lockfile is not that authority. Setup therefore uses the
[guarded materialization helper](../scripts/materialize-context.mjs) before
authoring changes: verify the exact locked skill tree, audit and frozen-restore,
move only those verified files to a backup, frozen-install real writes, then
audit again. Modified files, extra members, directories, or links are refused.

The wrapper isolates configuration/cache through documented environment
variables. Deployment receipts in APM 0.35.0 still use the OS user's `.apm`
directory; the helper does not delete or copy those receipts. Each generated
project identity remains ignored. This is not a user-profile sandbox.

## Copilot primitives

- Baseline instructions apply to TypeScript changes.
- Webhook instructions apply to application TypeScript.
- The webhook-change skill describes a multi-step workflow and links its own
  reference material.
- The review prompt is a single explicit review request.
- The reviewer agent has read/search tools only.
- Lab 4 adds a package-Markdown instruction and a package-upgrade/rollback reference.

No hook, external MCP server, lifecycle script, or privileged execution tool is
necessary. File discovery is a harness behavior; file existence and APM success
are not substitutes for observing actual Copilot use.

Opening the nested packages folder in VS Code does not guarantee isolation from
parent Git-repository customizations. Verify the actual scope, not an assumed
one.

## Install versus compile

`apm install` resolves packages, records locks, and integrates supported primitives
into the selected targets.

`apm compile` concerns instruction compilation. It is not a general deployment
step for prompts, skills, or agents. The learner uses `compile --validate` as a
non-emitting validation check, not as the installation mechanism.

All manifests select Copilot explicitly. The walkthrough does not rely on target
auto-detection from unrelated folders or user-global configuration.

## Curated release versus development dependency graph

APM 0.35.0 rejects packing manifests with local development path dependencies.
The [release generator](../scripts/prepare-release.mjs) therefore constructs a
separate **curated, self-contained source package**:

1. Copy the two packages' authored primitive trees, rejecting filename collisions.
2. Name the release `northstar-webhook-kit`.
3. Use the domain package's version.
4. Declare no APM dependencies, because both sets of primitives are now owned
   by this curated distribution.
5. Install the producer's own content and pack an explicit plugin-format ZIP.

This does not pretend to preserve a remote dependency graph or its provenance.
It is a reviewed distribution assembled from known local sources.

Use `--format claude-plugin --archive` for the tested imperative ZIP-install
flow. The format is deployable to Copilot through APM; Claude is not required.
The legacy `--format apm` output is not accepted by `apm install <archive>`.

An imperative bundle install does not rewrite the consumer's declaration list.
It records deployment metadata; retain the bundle as the distribution source.
Do not silently conflate it with a declarative, lock-replayed remote package.

APM normalizes text line endings in recorded text hashes. The round-trip tests
compare normalized text, preserve all primitive types and resources, and audit
the installed bundle. ZIP metadata is not assumed to be byte-reproducible across
independent builds.

## Governance

The local policy forbids manifest scripts and uses `enforcement: block`.
It is always supplied explicitly to `apm audit --ci`.

The controlled candidate adds only a harmless `node --version` script declaration.
No command is executed. A failing `scripts-policy` check is the required result;
an unrelated failure does not count.

The lab does not claim that a checked-out local policy is automatically discovered
or that every policy check is enforced at install time. Central Azure DevOps
policy discovery is an optional administrative extension.

CI audits committed deployment state **before** frozen restoration, preventing
an install from hiding a hand-edited output. It then restores and audits again.
Frozen installation separately verifies local source content.

Pipeline and policy files themselves need review and branch protection. This
repository is not an adversarial policy-enforcement product.

## Validation modes

| Mode | Purpose |
|---|---|
| `npm run check` | Type check, build, baseline tests, helper tests, documentation/frontmatter checks. |
| `npm run test:acceptance` | Required application behavior; intentionally fails on the starter. |
| `npm run test:lab` | Real APM cold replay, drift, frozen source, script-policy, and bundle cases. |
| `npm run verify:authoring` | Lab 4's agreed source/version/output structure. |
| `npm run verify:reuse` | Same package content and deployments in two APM projects. |
| `npm run verify:graduation` | Completed application, authoring, reuse, pipeline default, and audits. |
| Pipeline starter mode | Healthy lab scaffolding; explicitly not graduation. |
| Pipeline graduation mode | Completed exercise plus release artifact. |

CI writes its execution mode and completion status to the normal validation log;
the release ZIP is its only published artifact. Automated checks cannot verify
Copilot discovery or Azure UI configuration. Inspect those directly during the
workshop and PR review.
