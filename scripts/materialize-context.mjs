import assert from "node:assert/strict";
import { lstat, readFile, readdir, rename } from "node:fs/promises";
import path from "node:path";
import { apmTextDigest, makeSandbox, removeSandbox, root, runApm } from "./lib.mjs";
import { verifyConsumer } from "./verify.mjs";

async function skillEntries(directory, prefix = "") {
  const entries = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert.ok(!entry.isSymbolicLink(), `Refusing to move a skill containing a link: ${relative}`);
    assert.ok(entry.isFile() || entry.isDirectory(), `Unexpected skill member: ${relative}`);
    entries.push({ relative, directory: entry.isDirectory() });
    if (entry.isDirectory()) {
      entries.push(...await skillEntries(path.join(directory, entry.name), relative));
    }
  }
  return entries;
}

export async function materializeConsumer(directory) {
  const policy = path.join(root, "apm-policy.yml");
  const lock = await verifyConsumer(directory);
  const prefix = ".agents/skills/webhook-change/";
  const files = Object.assign({}, ...lock.dependencies.map((item) => item.deployed_file_hashes));
  const expectedFiles = new Set(
    Object.keys(files).filter((filename) => filename.startsWith(prefix)).map((filename) => filename.slice(prefix.length)),
  );
  const skill = path.join(directory, ".agents", "skills", "webhook-change");
  const metadata = await lstat(skill);
  assert.ok(metadata.isDirectory() && !metadata.isSymbolicLink(), "The managed skill must be a regular directory");
  for (const filename of expectedFiles) {
    assert.equal(
      apmTextDigest(await readFile(path.join(skill, filename))),
      files[prefix + filename],
      `Refusing to move a modified skill file: ${filename}`,
    );
  }
  const entries = await skillEntries(skill);
  assert.deepEqual(
    new Set(entries.filter((entry) => !entry.directory).map((entry) => entry.relative)),
    expectedFiles,
    "Refusing to move a skill with extra or missing files; preserve and inspect your changes",
  );
  for (const entry of entries.filter((entry) => entry.directory)) {
    assert.ok(
      [...expectedFiles].some((filename) => filename.startsWith(`${entry.relative}/`)),
      `Refusing to move an unowned skill directory: ${entry.relative}`,
    );
  }
  await runApm(["audit", "--ci", "--policy", policy], { cwd: directory });
  await runApm(["install", "--frozen", "--target", "copilot"], { cwd: directory });
  await verifyConsumer(directory);
  const backup = await makeSandbox("materialize");
  const original = path.join(backup, "webhook-change");
  await rename(skill, original);
  try {
    await runApm(["install", "--frozen", "--target", "copilot"], { cwd: directory });
    await verifyConsumer(directory);
    await runApm(["audit", "--ci", "--policy", policy], { cwd: directory });
  } catch (error) {
    console.error(`Context materialization failed. Original verified skill preserved at ${original}. Inspect before restoring; do not overwrite new work.`);
    throw error;
  }
  await removeSandbox(backup);
  console.log(`Materialized locked skill files with local write receipts: ${directory}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(root, "scripts", "materialize-context.mjs")) {
  await materializeConsumer(root);
  await materializeConsumer(path.join(root, "packages"));
  console.log("Both contexts are ready for a reviewed package update. No lockfile or authored source was changed.");
}
