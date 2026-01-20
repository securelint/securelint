import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const CLI = path.join(ROOT, "packages/securelint/dist/cli.js");

test("SARIF includes tool.driver.rules metadata", () => {
  const res = spawnSync(
    "node",
    [CLI, "check", "fixtures/auth/bad-express", "--format", "sarif"],
    { encoding: "utf8" }
  );
  assert.equal(res.status, 1);

  const sarif = JSON.parse((res.stdout ?? "").trim());
  const driver = sarif.runs[0].tool.driver;

  assert.equal(driver.name, "securelint");
  assert.ok(Array.isArray(driver.rules));
  assert.ok(driver.rules.length >= 1);

  const r = driver.rules.find((x) => x.id === "AUTH-ROUTE-001");
  assert.ok(r, "Expected AUTH-ROUTE-001 rule metadata in SARIF");
  assert.ok(r.shortDescription?.text?.length > 0);
  assert.ok(r.help?.markdown?.includes("requireAuth"));
});

test("json-lines emits one JSON object per diagnostic", () => {
  const res = spawnSync(
    "node",
    [CLI, "check", "fixtures/auth/bad-express", "--format", "json-lines"],
    { encoding: "utf8" }
  );

  assert.equal(res.status, 1);

  const lines = (res.stdout ?? "").trim().split("\n").filter(Boolean);
  assert.equal(lines.length, 1);

  const d = JSON.parse(lines[0]);
  assert.equal(d.rule_id, "AUTH-ROUTE-001");
  assert.equal(d.severity, "error");
});

test("json-lines emits no output on clean project", () => {
  const res = spawnSync(
    "node",
    [CLI, "check", "fixtures/auth/good-express", "--format", "json-lines"],
    { encoding: "utf8" }
  );

  assert.equal(res.status, 0);
  assert.equal((res.stdout ?? "").trim(), "");
});
