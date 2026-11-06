import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { apmTextDigest, frontmatter, managedPaths, readYaml, root, runApm } from "./lib.mjs";

export async function verifyConsumer(directory) {
  const manifest = await readYaml(path.join(directory, "apm.yml"));
  assert.deepEqual(manifest.targets, ["copilot"], "Declare targets: [copilot] explicitly");
  const lock = await readYaml(path.join(directory, "apm.lock.yaml"));
  for (const name of ["webhook-playbook", "engineering-baseline"]) {
    const dependency = lock.dependencies?.find((item) => item.name === name);
    assert.ok(dependency, `${name} is missing from ${directory}'s lockfile`);
    assert.match(dependency.content_hash, /^sha256:[a-f0-9]{64}$/, `${name} needs a content hash`);
  }
  const baseline = lock.dependencies.find((item) => item.name === "engineering-baseline");
  assert.equal(baseline.depth, 2, "The engineering baseline must remain transitive");
  const hashes = Object.assign({}, ...lock.dependencies.map((item) => item.deployed_file_hashes));
  for (const filename of managedPaths) {
    assert.equal(
      apmTextDigest(await readFile(path.join(directory, filename))),
      hashes[filename],
      `${filename}: deployed bytes do not match the recorded hash`,
    );
  }
  return lock;
}

export async function verifyAuthoring() {
  const packageRoot = path.join(root, "packages", "webhook-playbook");
  const manifest = await readYaml(path.join(packageRoot, "apm.yml"));
  assert.equal(manifest.version, "1.1.0", "Lab 4 must release package version 1.1.0");
  const skill = await readFile(path.join(packageRoot, ".apm", "skills", "webhook-change", "SKILL.md"), "utf8");
  assert.match(skill, /\]\(\.\/references\/release-evidence\.md\)/, "Link the release-evidence reference from the skill");
  const reference = await readFile(
    path.join(packageRoot, ".apm", "skills", "webhook-change", "references", "release-evidence.md"),
    "utf8",
  );
  for (const heading of ["## Required evidence", "## Rollback", "## Limits"]) {
    assert.ok(reference.includes(heading), `The release reference needs ${heading}`);
  }
  const instruction = path.join(packageRoot, ".apm", "instructions", "package-review.instructions.md");
  const metadata = frontmatter(await readFile(instruction, "utf8"), instruction);
  assert.equal(metadata.applyTo, "packages/**/*.md", "Scope the new instruction to package Markdown");
  const lock = await verifyConsumer(root);
  const dependency = lock.dependencies.find((item) => item.name === "webhook-playbook");
  assert.equal(dependency.version, "1.1.0", "Reinstall after changing the package version");
  for (const filename of [
    ".agents/skills/webhook-change/references/release-evidence.md",
    ".github/instructions/package-review.instructions.md",
  ]) {
    const actual = await readFile(path.join(root, filename));
    assert.equal(apmTextDigest(actual), dependency.deployed_file_hashes[filename], `${filename} was not deployed correctly`);
  }
}

export async function verifyReuse() {
  const second = path.join(root, "packages");
  const firstLock = await verifyConsumer(root);
  const secondLock = await verifyConsumer(second);
  for (const dependency of firstLock.dependencies) {
    const other = secondLock.dependencies.find((item) => item.name === dependency.name);
    assert.ok(other, `The second consumer is missing ${dependency.name}`);
    assert.equal(other.content_hash, dependency.content_hash, `${dependency.name}: consumers have different source content`);
    for (const filename of Object.keys(dependency.deployed_file_hashes ?? {})) {
      assert.deepEqual(
        await readFile(path.join(root, filename)),
        await readFile(path.join(second, filename)),
        `${filename}: consumers have different deployed content`,
      );
    }
  }
}

export async function verifyGraduation() {
  await verifyAuthoring();
  await verifyReuse();
  const pipeline = await readYaml(path.join(root, "azure-pipelines.yml"));
  assert.equal(
    pipeline.parameters.find((parameter) => parameter.name === "requireAcceptance")?.default,
    true,
    "Lab 6 must change the acceptance-gate default to true",
  );
  await access(path.join(root, "evidence", "submission.md"));
  const evidence = await readFile(path.join(root, "evidence", "submission.md"), "utf8");
  assert.ok(!evidence.includes("REPLACE_ME"), "Complete the evidence template before graduation");
  for (const directory of [root, path.join(root, "packages")]) {
    await runApm(["audit", "--ci", "--policy", path.join(root, "apm-policy.yml")], { cwd: directory });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(root, "scripts", "verify.mjs")) {
  const modes = {
    starter: () => verifyConsumer(root),
    authoring: verifyAuthoring,
    reuse: verifyReuse,
    graduation: verifyGraduation,
  };
  const mode = process.argv[2];
  assert.ok(Object.hasOwn(modes, mode), "Use starter, authoring, reuse, or graduation");
  await modes[mode]();
  console.log(`Verified ${mode}. This check does not replace Copilot discovery or Azure DevOps build evidence.`);
}
