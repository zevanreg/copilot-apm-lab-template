import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const managedPaths = [
  ".github/instructions/engineering.instructions.md",
  ".github/instructions/webhooks.instructions.md",
  ".github/prompts/review-webhook.prompt.md",
  ".github/agents/webhook-reviewer.agent.md",
  ".agents/skills/webhook-change/SKILL.md",
  ".agents/skills/webhook-change/references/delivery-contract.md",
];

export async function readYaml(filename) {
  return parse(await readFile(filename, "utf8"));
}

export function digest(contents) {
  return `sha256:${createHash("sha256").update(contents).digest("hex")}`;
}

export function apmTextDigest(contents) {
  return digest(contents.toString().replaceAll("\r\n", "\n"));
}

export function frontmatter(contents, filename) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(contents);
  assert.ok(match, `${filename}: missing YAML frontmatter`);
  const metadata = parse(match[1]);
  assert.ok(metadata && typeof metadata === "object", `${filename}: invalid metadata`);
  assert.ok(
    typeof metadata.description === "string" && metadata.description.trim().length > 15,
    `${filename}: supply a meaningful description`,
  );
  return metadata;
}

export async function walk(directory) {
  const ignored = new Set([
    ".git", ".tools", ".lab", ".apm-local", ".tsupgrader", "node_modules", "apm_modules", "dist", "build",
  ]);
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(filename));
    else if (entry.isFile()) files.push(filename);
  }
  return files;
}

export function apmExecutable(config, { platform = process.platform, architecture = process.arch } = {}) {
  assert.ok(["win32", "linux"].includes(platform), "Use Windows or the Linux dev container for this lab");
  assert.ok(["x64", "arm64"].includes(architecture), "APM requires an x64 or Arm64 runtime");
  const bundle = platform === "win32"
    ? "apm-windows-x86_64"
    : `apm-linux-${architecture === "x64" ? "x86_64" : "arm64"}`;
  return path.join(root, ".tools", "apm", config.apmVersion, bundle, platform === "win32" ? "apm.exe" : "apm");
}

export async function runApm(args, { cwd = root, failure = false } = {}) {
  const config = JSON.parse(await readFile(path.join(root, "lab.config.json"), "utf8"));
  const executable = apmExecutable(config);
  const result = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
    env: {
      ...process.env,
      APM_HOME: path.join(cwd, ".lab", "apm-home"),
      APM_CACHE_DIR: path.join(cwd, ".lab", "apm-cache"),
    },
  });
  if (result.error) throw result.error;
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  assert.equal(result.signal, null, `APM was terminated: ${output}`);
  if (failure) {
    assert.ok(result.status !== null && result.status !== 0, `APM unexpectedly passed: ${output}`);
  } else {
    assert.equal(result.status, 0, `apm ${args.join(" ")} failed:\n${output}`);
  }
  return { ...result, output };
}

export async function copyInputs(destination) {
  await mkdir(destination, { recursive: true });
  const entries = [
    "apm.yml", "apm.lock.yaml", "apm-policy.yml", "azure-pipelines.yml", ".gitignore",
    ".github", ".agents", "packages", "fixtures",
  ];
  for (const entry of entries) {
    await cp(path.join(root, entry), path.join(destination, entry), {
      recursive: true,
      filter: (filename) =>
        !path.relative(root, filename).split(path.sep).some((part) => ["apm_modules", "build", ".lab", ".apm-local"].includes(part)),
    });
  }
}

export async function makeSandbox(label) {
  const base = path.join(root, ".lab", "runs");
  await mkdir(base, { recursive: true });
  return mkdtemp(path.join(base, `${label}-`));
}

export async function removeSandbox(directory) {
  const base = path.join(root, ".lab", "runs");
  const relative = path.relative(base, directory);
  assert.ok(
    relative && !path.isAbsolute(relative) && !relative.startsWith("..") && path.dirname(relative) === ".",
    "Refusing to remove a path outside the named validation sandbox",
  );
  await rm(directory, { recursive: true, force: true });
}
