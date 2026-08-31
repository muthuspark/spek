import { test } from "node:test";
import assert from "node:assert/strict";
import { isStarted, splitByProgress } from "./changeProgress.js";

const stats = (total: number, completed: number) => ({ taskStats: { total, completed } });

test("isStarted: at least one completed task counts as started", () => {
  assert.equal(isStarted(stats(12, 1)), true);
  assert.equal(isStarted(stats(12, 8)), true);
});

test("isStarted: all tasks complete is still started (archive is the next state, not 'done')", () => {
  assert.equal(isStarted(stats(9, 9)), true);
});

test("isStarted: zero completed tasks is not started", () => {
  assert.equal(isStarted(stats(9, 0)), false);
});

test("isStarted: no tasks.md is not started", () => {
  assert.equal(isStarted({ taskStats: null }), false);
});

test("isStarted: a tasks.md with no checkboxes is not started", () => {
  assert.equal(isStarted(stats(0, 0)), false);
});

test("splitByProgress: buckets by progress and preserves input order", () => {
  const a = { slug: "a", ...stats(12, 8) };
  const b = { slug: "b", ...stats(9, 0) };
  const c = { slug: "c", taskStats: null };
  const d = { slug: "d", ...stats(4, 4) };
  const { inProgress, notStarted } = splitByProgress([a, b, c, d]);
  assert.deepEqual(inProgress.map((x) => x.slug), ["a", "d"]);
  assert.deepEqual(notStarted.map((x) => x.slug), ["b", "c"]);
});

test("splitByProgress: empty input yields two empty groups", () => {
  const { inProgress, notStarted } = splitByProgress([]);
  assert.deepEqual(inProgress, []);
  assert.deepEqual(notStarted, []);
});
