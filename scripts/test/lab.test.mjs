import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { apmExecutable, apmTextDigest, digest, frontmatter, root } from "../lib.mjs";

test("content digests cover exact bytes, not just filenames", () => {
  assert.equal(digest("a"), digest(Buffer.from("a")));
  assert.notEqual(digest("a\n"), digest("a\r\n"));
});

test("APM's text hashes normalize Windows newlines", () => {
  assert.equal(apmTextDigest("a\n"), apmTextDigest(Buffer.from("a\r\n")));
  assert.notEqual(apmTextDigest("a\n"), apmTextDigest("b\n"));
});

test("customization metadata accepts CRLF and validates a description", () => {
  assert.equal(
    frontmatter("---\r\ndescription: 'Use when reviewing webhook changes.'\r\n---\r\nBody", "test.md").description,
    "Use when reviewing webhook changes.",
  );
  assert.throws(() => frontmatter("No frontmatter", "test.md"), /missing YAML/);
  assert.throws(() => frontmatter("---\nname: test\n---\nBody", "test.md"), /meaningful description/);
});

test("APM executable selection supports Windows and native Linux architectures", () => {
  const config = { apmVersion: "0.35.0" };
  for (const architecture of ["x64", "arm64"]) {
    assert.equal(
      apmExecutable(config, { platform: "win32", architecture }),
      path.join(root, ".tools", "apm", "0.35.0", "apm-windows-x86_64", "apm.exe"),
    );
    assert.equal(
      apmExecutable(config, { platform: "linux", architecture }),
      path.join(root, ".tools", "apm", "0.35.0", `apm-linux-${architecture === "x64" ? "x86_64" : "arm64"}`, "apm"),
    );
  }
  assert.throws(() => apmExecutable(config, { platform: "darwin", architecture: "arm64" }), /Linux dev container/);
  assert.throws(() => apmExecutable(config, { platform: "linux", architecture: "ia32" }), /x64 or Arm64/);
});
