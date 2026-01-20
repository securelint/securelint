import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const CLI = path.join(ROOT, "packages/securelint/dist/cli.js");

test("CLI misuse: missing subcommand exits 2", () => {
  const res = spawnSync("node", [CLI], { encoding: "utf8" });
  assert.equal(res.status, 2);
});

test("CLI misuse: unknown subcommand exits 2", () => {
  const res = spawnSync("node", [CLI, "nope"], { encoding: "utf8" });
  assert.equal(res.status, 2);
});

test("CLI misuse: unsupported --format exits 2", () => {
  const res = spawnSync("node", [CLI, "check", ".", "--format", "text"], { encoding: "utf8" });
  assert.equal(res.status, 2);
});
