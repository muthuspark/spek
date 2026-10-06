import { test } from "node:test";
import assert from "node:assert/strict";
import { splitFrontMatter } from "./frontMatter.js";

test("splitFrontMatter: extracts flat key/value fields and strips the block", () => {
  const md = "---\nauthor: abhishek_br_whatfix abhishek.br@whatfix.com\nstatus: \"draft\"\n---\n# Title\n";
  assert.deepEqual(splitFrontMatter(md), {
    fields: [
      { key: "author", value: "abhishek_br_whatfix abhishek.br@whatfix.com" },
      { key: "status", value: "draft" },
    ],
    body: "# Title\n",
  });
});

test("splitFrontMatter: no front matter leaves content untouched", () => {
  const md = "# Title\n\ntext\n";
  assert.deepEqual(splitFrontMatter(md), { fields: [], body: md });
});

test("splitFrontMatter: a later --- rule is not front matter", () => {
  const md = "# Title\n\n---\nkey: value\n---\n";
  assert.deepEqual(splitFrontMatter(md), { fields: [], body: md });
});

test("splitFrontMatter: CRLF line endings and nested YAML lines are tolerated", () => {
  const md = "---\r\nauthor: a\r\ntags:\r\n  - x\r\n---\r\nbody";
  assert.deepEqual(splitFrontMatter(md), { fields: [{ key: "author", value: "a" }], body: "body" });
});
