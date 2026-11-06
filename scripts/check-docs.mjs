import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { frontmatter, readYaml, root, walk } from "./lib.mjs";

let links = 0;
let primitives = 0;
const files = await walk(root);
for (const filename of files.filter((file) => file.endsWith(".md"))) {
  const contents = await readFile(filename, "utf8");
  let fenced = false;
  for (const line of contents.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    for (const match of line.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      let target = match[1].trim().replace(/^<|>$/g, "");
      if (/^(https?:|mailto:|data:|#)/.test(target)) continue;
      target = decodeURIComponent(target.split("#")[0]);
      assert.ok(target, `${filename}: empty link target`);
      const resolved = path.resolve(path.dirname(filename), target);
      const relative = path.relative(root, resolved);
      assert.ok(!relative.startsWith("..") && !path.isAbsolute(relative), `${filename}: local link escapes the repo`);
      try {
        await access(resolved);
      } catch (error) {
        throw new Error(`${path.relative(root, filename)}: broken local link ${target}`, { cause: error });
      }
      links++;
    }
  }
  const basename = path.basename(filename);
  if (basename === "SKILL.md" || /\.(instructions|prompt|agent)\.md$/.test(basename)) {
    const metadata = frontmatter(contents, filename);
    if (basename === "SKILL.md") {
      assert.equal(metadata.name, path.basename(path.dirname(filename)), `${filename}: skill name/folder mismatch`);
      assert.ok(metadata.description.length <= 1024, `${filename}: description too long`);
    }
    if (basename.endsWith(".agent.md")) {
      assert.deepEqual(metadata.tools, ["read", "search"], `${filename}: the lab reviewer must remain read-only`);
    }
    primitives++;
  }
}
const pipeline = await readYaml(path.join(root, "azure-pipelines.yml"));
assert.equal(pipeline.pool.vmImage, "windows-latest");
assert.equal(pipeline.pr, "none", "Azure Repos PR validation must use branch policies, not a YAML PR trigger");
console.log(`Checked ${links} local Markdown links and ${primitives} customization files; Azure Pipelines YAML parsed.`);
