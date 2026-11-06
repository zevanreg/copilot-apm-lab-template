import assert from "node:assert/strict";
import { constants } from "node:fs";
import { access, appendFile, copyFile, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { stringify } from "yaml";
import { copyInputs, readYaml, root, runApm } from "./lib.mjs";

const marker = "\nLab drift marker: hand-edited deployed output.\n";
const managed = path.join(root, ".github", "instructions", "webhooks.instructions.md");
const backup = path.join(root, ".lab", "scenarios", "webhooks.instructions.backup");
const policyConsumer = path.join(root, ".lab", "policy-consumer");
const scenario = process.argv[2];

switch (scenario) {
  case "drift":
    await runApm(["audit", "--ci", "--policy", path.join(root, "apm-policy.yml")]);
    await mkdir(path.dirname(backup), { recursive: true });
    await copyFile(managed, backup, constants.COPYFILE_EXCL);
    await appendFile(managed, marker);
    console.log("Injected a harmless deployed-file edit. Run the audit yourself; it must fail.");
    break;
  case "restore-drift": {
    const original = await readFile(backup, "utf8");
    assert.equal(
      await readFile(managed, "utf8"),
      original + marker,
      "The managed file changed after injection. Inspect it manually; restoration will not overwrite your edits.",
    );
    await writeFile(managed, original);
    await unlink(backup);
    console.log("Restored the exact pre-exercise bytes. Run the audit again.");
    break;
  }
  case "prepare-policy": {
    try {
      await access(policyConsumer);
      throw new Error("The policy sandbox already exists. Finish the exercise and use clear-policy before repeating.");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await copyInputs(policyConsumer);
    await writeFile(path.join(policyConsumer, ".northstar-sandbox"), "policy\n");
    const manifest = await readYaml(path.join(policyConsumer, "apm.yml"));
    const proposal = await readYaml(path.join(root, "fixtures", "proposed-scripts.yml"));
    manifest.scripts = proposal.scripts;
    await writeFile(path.join(policyConsumer, "apm.yml"), stringify(manifest));
    console.log(`Prepared ${policyConsumer}`);
    console.log("Install there, then audit with the repository's explicit local policy. Do not open this sandbox as a VS Code workspace.");
    break;
  }
  case "clear-policy":
    assert.equal(await readFile(path.join(policyConsumer, ".northstar-sandbox"), "utf8"), "policy\n");
    await rm(policyConsumer, { recursive: true });
    console.log("Removed only the marked .lab\\policy-consumer sandbox.");
    break;
  default:
    throw new Error("Use drift, restore-drift, prepare-policy, or clear-policy.");
}
