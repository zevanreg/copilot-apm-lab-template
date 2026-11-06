import assert from "node:assert/strict";
import { access, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { stringify } from "yaml";
import { readYaml, root, walk } from "./lib.mjs";

export async function prepareRelease(destination, sourceRoot = root) {
  const relative = path.relative(path.join(root, ".lab"), destination);
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative), "Release staging must be beneath .lab");
  const marker = path.join(destination, ".northstar-release");
  let exists = true;
  try {
    await access(destination);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    exists = false;
  }
  if (exists) {
    assert.equal(await readFile(marker, "utf8"), "generated-release\n", "Refusing to replace an unmarked directory");
    await rm(destination, { recursive: true });
  }
  await mkdir(destination, { recursive: true });
  await writeFile(marker, "generated-release\n");
  const domain = await readYaml(path.join(sourceRoot, "packages", "webhook-playbook", "apm.yml"));
  const manifest = {
    name: "northstar-webhook-kit",
    version: domain.version,
    description: "Curated, self-contained Northstar baseline and webhook guidance.",
    license: "UNLICENSED",
    targets: ["copilot"],
    includes: "auto",
    dependencies: { apm: [] },
  };
  await writeFile(path.join(destination, "apm.yml"), stringify(manifest));
  const seen = new Set();
  for (const name of ["engineering-baseline", "webhook-playbook"]) {
    const source = path.join(sourceRoot, "packages", name, ".apm");
    for (const filename of await walk(source)) {
      const target = path.relative(source, filename);
      assert.ok(!seen.has(target), `Two source packages own ${target}; resolve the collision before releasing`);
      seen.add(target);
      const output = path.join(destination, ".apm", target);
      await mkdir(path.dirname(output), { recursive: true });
      await copyFile(filename, output);
    }
  }
  console.log(`Prepared ${destination} from ${seen.size} authored files; no local dependency paths are shipped.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(root, "scripts", "prepare-release.mjs")) {
  await prepareRelease(path.join(root, ".lab", "release"));
}
