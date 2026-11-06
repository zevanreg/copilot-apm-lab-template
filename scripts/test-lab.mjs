import assert from "node:assert/strict";
import { appendFile, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { stringify } from "yaml";
import {
  apmTextDigest, copyInputs, makeSandbox, managedPaths, readYaml, removeSandbox, runApm,
} from "./lib.mjs";
import { verifyConsumer } from "./verify.mjs";
import { prepareRelease } from "./prepare-release.mjs";
import { materializeConsumer } from "./materialize-context.mjs";

async function sandbox(context, label) {
  const directory = await makeSandbox(label);
  context.after(() => removeSandbox(directory));
  await copyInputs(directory);
  return directory;
}

test("a cold checkout audits and replays its lock without rewriting it", async (t) => {
  const directory = await sandbox(t, "cold");
  const lockPath = path.join(directory, "apm.lock.yaml");
  const before = await readFile(lockPath, "utf8");
  await runApm(["audit", "--ci", "--policy", "./apm-policy.yml"], { cwd: directory });
  await runApm(["install", "--frozen"], { cwd: directory });
  await runApm(["audit", "--ci", "--policy", "./apm-policy.yml"], { cwd: directory });
  assert.equal(await readFile(lockPath, "utf8"), before);
  await verifyConsumer(directory);
  const second = path.join(directory, "packages");
  await runApm(["install", "--frozen"], { cwd: second });
  await runApm(["audit", "--ci", "--policy", "../apm-policy.yml"], { cwd: second });
  for (const filename of managedPaths) {
    assert.deepEqual(
      await readFile(path.join(directory, filename)),
      await readFile(path.join(second, filename)),
    );
  }
});

test("audit rejects deployed drift and materialization preserves unowned skill files", async (t) => {
  const directory = await sandbox(t, "drift");
  await runApm(["install", "--frozen"], { cwd: directory });
  const filename = path.join(directory, ".github", "instructions", "webhooks.instructions.md");
  const original = await readFile(filename);
  await appendFile(filename, "\nHarmless test drift.\n");
  const result = await runApm(
    ["audit", "--ci", "--policy", "./apm-policy.yml"],
    { cwd: directory, failure: true },
  );
  assert.match(result.output, /drift|content-integrity/i);
  assert.match(result.output, /webhooks\.instructions\.md/);
  await writeFile(filename, original);
  await runApm(["audit", "--ci", "--policy", "./apm-policy.yml"], { cwd: directory });
  const note = path.join(directory, ".agents", "skills", "webhook-change", "references", "local-note.txt");
  const skillFile = path.join(directory, ".agents", "skills", "webhook-change", "SKILL.md");
  const skillBefore = await readFile(skillFile);
  await writeFile(note, "Preserve this unowned learner note.\n");
  await assert.rejects(materializeConsumer(directory), /extra or missing files/);
  assert.equal(await readFile(note, "utf8"), "Preserve this unowned learner note.\n");
  assert.deepEqual(await readFile(skillFile), skillBefore);
  await unlink(note);
});

test("frozen mode rejects source changes; a materialized consumer accepts a reviewed skill update", async (t) => {
  const directory = await sandbox(t, "source");
  await materializeConsumer(directory);
  await appendFile(
    path.join(directory, "packages", "engineering-baseline", ".apm", "instructions", "engineering.instructions.md"),
    "\nHarmless local source change.\n",
  );
  const baselineResult = await runApm(["install", "--frozen"], { cwd: directory, failure: true });
  assert.match(baselineResult.output, /engineering-baseline/);
  assert.match(baselineResult.output, /does not match|differs from its locked snapshot/i);
  const skill = path.join(directory, "packages", "webhook-playbook", ".apm", "skills", "webhook-change");
  await appendFile(path.join(skill, "SKILL.md"), "\nRead the [update check](./references/workflow-test.md) before handoff.\n");
  await writeFile(path.join(skill, "references", "workflow-test.md"), "# Update check\n\nRecord actual results.\n");
  const result = await runApm(["install", "--frozen"], { cwd: directory, failure: true });
  assert.match(result.output, /webhook-playbook/);
  assert.match(result.output, /does not match|differs from its locked snapshot/i);
  await runApm(["install", "--target", "copilot"], { cwd: directory });
  const lock = await verifyConsumer(directory);
  const updated = lock.dependencies.find((dependency) => dependency.name === "webhook-playbook");
  const reference = ".agents/skills/webhook-change/references/workflow-test.md";
  assert.equal(
    apmTextDigest(await readFile(path.join(directory, reference))),
    updated.deployed_file_hashes[reference],
    "The newly added skill reference must be recorded and deployed",
  );
  await runApm(["audit", "--ci", "--policy", "./apm-policy.yml"], { cwd: directory });
});

test("the explicit local policy rejects an unreviewed manifest command without executing it", async (t) => {
  const directory = await sandbox(t, "policy");
  const manifest = await readYaml(path.join(directory, "apm.yml"));
  manifest.scripts = { "unreviewed-report": "node --version" };
  await writeFile(path.join(directory, "apm.yml"), stringify(manifest));
  await runApm(["install"], { cwd: directory });
  const result = await runApm(
    ["audit", "--ci", "--policy", "./apm-policy.yml", "--format", "json"],
    { cwd: directory, failure: true },
  );
  const report = JSON.parse(result.stdout);
  assert.equal(report.checks.find((check) => check.name === "scripts-policy")?.passed, false);
  assert.equal(report.checks.filter((check) => !check.passed).length, 1);
});

test("an explicit plugin-format ZIP installs into an independent consumer", async (t) => {
  const directory = await sandbox(t, "bundle");
  const producer = path.join(directory, "release");
  await prepareRelease(producer, directory);
  await runApm(["install", "--target", "copilot"], { cwd: producer });
  await runApm(["pack", "--format", "claude-plugin", "--archive", "--output", "./build"], { cwd: producer });
  const archives = (await readdir(path.join(producer, "build"))).filter((name) => name.endsWith(".zip"));
  assert.equal(archives.length, 1, "Packing must produce exactly one ZIP in the fresh output directory");
  const consumer = path.join(directory, "bundle-consumer");
  await mkdir(consumer);
  await writeFile(
    path.join(consumer, "apm.yml"),
    stringify({
      name: "bundle-consumer", version: "1.0.0", targets: ["copilot"],
      includes: [], dependencies: { apm: [] },
    }),
  );
  await runApm(["install", path.join(producer, "build", archives[0])], { cwd: consumer });
  await runApm(["audit", "--ci", "--policy", "../apm-policy.yml"], { cwd: consumer });
  const lock = await readYaml(path.join(directory, "apm.lock.yaml"));
  const expectedFiles = new Set(
    lock.dependencies.flatMap((dependency) => Object.keys(dependency.deployed_file_hashes ?? {})),
  );
  for (const filename of expectedFiles) {
    assert.equal(
      apmTextDigest(await readFile(path.join(directory, filename))),
      apmTextDigest(await readFile(path.join(consumer, filename))),
      `${filename}: bundle round-trip changed the normalized text`,
    );
  }
});
