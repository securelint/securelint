import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const CLI = path.join(ROOT, "packages/securelint/dist/cli.js");

test("--version exits 0 and prints version", () => {
  const res = spawnSync("node", [CLI, "--version"], { encoding: "utf8" });
  assert.equal(res.status, 0);
  assert.ok((res.stdout ?? "").trim().length > 0);
});

test("--help exits 0 and prints usage", () => {
  const res = spawnSync("node", [CLI, "--help"], { encoding: "utf8" });
  assert.equal(res.status, 0);
  assert.ok((res.stdout ?? "").includes("Usage:"));
});

test("SARIF format: bad-express exits 1 and emits SARIF 2.1.0 JSON", () => {
  const res = spawnSync(
    "node",
    [CLI, "check", "fixtures/auth/bad-express", "--format", "sarif"],
    { encoding: "utf8" }
  );

  assert.equal(res.status, 1);

  const stdout = (res.stdout ?? "").trim();
  let sarif;
  try {
    sarif = JSON.parse(stdout);
  } catch {
    throw new Error("Expected SARIF JSON, got:\n" + stdout);
  }

  assert.equal(sarif.version, "2.1.0");
  assert.ok(Array.isArray(sarif.runs));
  assert.ok(Array.isArray(sarif.runs[0].results));
  assert.equal(sarif.runs[0].tool.driver.name, "securelint");

  const first = sarif.runs[0].results[0];
  assert.equal(first.ruleId, "AUTH-ROUTE-001");
});
