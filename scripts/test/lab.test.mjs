import assert from "node:assert/strict";
import test from "node:test";
import { apmTextDigest, digest, frontmatter } from "../lib.mjs";

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
