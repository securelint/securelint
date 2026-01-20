import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CLI = path.join(ROOT, "packages/securelint/dist/cli.js");

function runSecurelint(fixtureDir) {
  const res = spawnSync("node", [CLI, "check", fixtureDir], { encoding: "utf8" });

  const code = res.status ?? 2;
  const stdout = (res.stdout ?? "").trim();
  const stderr = (res.stderr ?? "").trim();

  // Exit 2 means CLI misuse or runtime/config error — fail the test immediately with stderr.
  if (code === 2) {
    throw new Error(`securelint exited 2 (usage/runtime error).\nfixture=${fixtureDir}\nstderr=${stderr}\nstdout=${stdout}`);
  }

  // For exit codes 0/1 we require valid JSON output.
  let json;
  try {
    json = stdout ? JSON.parse(stdout) : null;
  } catch (e) {
    throw new Error(
      `securelint did not emit valid JSON.\nfixture=${fixtureDir}\nexit=${code}\nstderr=${stderr}\nstdout=${stdout}`
    );
  }

  return { code, json, stderr, stdout };
}

function stableProjection(report) {
  assert.equal(report.tool, "securelint");
  assert.ok(typeof report.version === "string");

  const diags = Array.isArray(report.diagnostics) ? report.diagnostics : [];
  return {
    tool: report.tool,
    version: report.version,
    diagnostics: diags.map((d) => ({
      rule_id: d.rule_id,
      severity: d.severity,
      message: d.message,
    })),
  };
}

test("AUTH fixtures: bad-express fails with AUTH-ROUTE-001", () => {
  const fixture = "fixtures/auth/bad-express";
  const expected = JSON.parse(fs.readFileSync(path.join(fixture, "expected.json"), "utf8"));

  const { code, json, stderr } = runSecurelint(fixture);

  assert.equal(code, 1, `Expected exit code 1, got ${code}. stderr=${stderr}`);
  assert.deepEqual(stableProjection(json), expected);
});

test("AUTH fixtures: good-express passes", () => {
  const fixture = "fixtures/auth/good-express";
  const expected = JSON.parse(fs.readFileSync(path.join(fixture, "expected.json"), "utf8"));

  const { code, json, stderr } = runSecurelint(fixture);

  assert.equal(code, 0, `Expected exit code 0, got ${code}. stderr=${stderr}`);
  assert.deepEqual(stableProjection(json), expected);
});
