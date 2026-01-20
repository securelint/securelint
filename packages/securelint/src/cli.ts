#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { AuthRoute001 } from "@securelint/rules-auth";
import type { DiagnosticReport, RuleContext, Diagnostic } from "@securelint/core";

const VERSION = "0.1.0";

function usageText() {
  return [
    "SecureLint",
    "",
    "Usage:",
    "  securelint check [path] [--format json|sarif|json-lines]",
    "  securelint --help",
    "  securelint --version",
    "",
    "Commands:",
    "  check          Analyze a project directory and report policy violations.",
    "",
    "Options:",
    "  --format        Output format (json|sarif|json-lines). Default: json",
    "  --help, -h      Show help",
    "  --version, -v   Show version",
    "",
    "Exit codes:",
    "  0: no violations",
    "  1: violations found",
    "  2: usage/runtime/config error",
    "",
  ].join("\n");
}

function usage(exitCode: 0 | 2 = 2): never {
  const out = usageText() + "\n";
  if (exitCode === 0) process.stdout.write(out);
  else process.stderr.write(out);
  process.exit(exitCode);
}

type Format = "json" | "sarif" | "json-lines";

function parseArgs(argv: string[]) {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    usage(0);
  }
  if (args.includes("--version") || args.includes("-v")) {
    process.stdout.write(VERSION + "\n");
    process.exit(0);
  }

  const cmd = args[0];
  if (!cmd) usage(2);

  let target: string | undefined;
  let format: Format = "json";

  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (!a) continue;

    if (a === "--format") {
      const v = args[i + 1];
      if (v !== "json" && v !== "sarif" && v !== "json-lines") usage(2);
      format = v as Format;
      i++;
      continue;
    }

    if (!target && !a.startsWith("--")) {
      target = a;
      continue;
    }

    usage(2);
  }

  return { cmd, target, format };
}

type RuleMeta = {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  helpMarkdown: string;
  defaultLevel: "error" | "warning";
};

const RULES: Record<string, RuleMeta> = {
  "AUTH-ROUTE-001": {
    id: "AUTH-ROUTE-001",
    name: "Protected routes require auth middleware",
    shortDescription: "Protected routes must include an approved authentication guard.",
    fullDescription:
      "If a route is marked as protected (e.g., via @protected in a leading JSDoc/comment), SecureLint requires an approved authentication middleware (such as requireAuth) to appear in the Express handler chain.",
    helpMarkdown:
      "Mark protected routes and include an approved guard in the handler chain.\n\nExample:\n\n```ts\n/** @protected */\napp.get(\"/me\", requireAuth, async (req, res) => {\n  res.json({ ok: true });\n});\n```\n",
    defaultLevel: "error",
  },
};

function toSarif(diagnostics: Diagnostic[], toolVersion: string) {
  const sarifRules = Object.values(RULES).map((r) => ({
    id: r.id,
    name: r.name,
    shortDescription: { text: r.shortDescription },
    fullDescription: { text: r.fullDescription },
    help: { text: r.helpMarkdown, markdown: r.helpMarkdown },
    defaultConfiguration: { level: r.defaultLevel },
  }));

  const results = diagnostics.map((d) => {
    const loc =
      d.range && d.file
        ? {
            physicalLocation: {
              artifactLocation: { uri: d.file },
              region: {
                startLine: d.range.start.line,
                startColumn: d.range.start.col,
                endLine: d.range.end.line,
                endColumn: d.range.end.col,
              },
            },
          }
        : d.file
          ? {
              physicalLocation: {
                artifactLocation: { uri: d.file },
              },
            }
          : undefined;

    return {
      ruleId: d.rule_id,
      level: d.severity === "error" ? "error" : "warning",
      message: { text: d.message },
      locations: loc ? [{ location: loc }] : [],
    };
  });

  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "securelint",
            version: toolVersion,
            informationUri: "https://securelint.com",
            rules: sarifRules,
          },
        },
        results,
      },
    ],
  };
}

async function main() {
  const { cmd, target, format } = parseArgs(process.argv);

  if (cmd !== "check") usage(2);

  const projectRoot = target ? path.resolve(process.cwd(), target) : process.cwd();

  const configPath = path.join(projectRoot, "securelint.config.json");
  const config = fs.existsSync(configPath)
    ? (JSON.parse(fs.readFileSync(configPath, "utf8")) as any)
    : undefined;

  const ctx: RuleContext = { projectRoot, config };

  const diagnostics = await AuthRoute001.run(ctx);

  if (format === "json-lines") {
    for (const d of diagnostics) {
      process.stdout.write(JSON.stringify(d) + "\n");
    }
    process.exit(diagnostics.length > 0 ? 1 : 0);
  }

  if (format === "sarif") {
    process.stdout.write(JSON.stringify(toSarif(diagnostics, VERSION), null, 2) + "\n");
    process.exit(diagnostics.length > 0 ? 1 : 0);
  }

  const report: DiagnosticReport = {
    tool: "securelint",
    version: VERSION,
    diagnostics,
  };

  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  process.exit(diagnostics.length > 0 ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write(String(err?.stack ?? err) + "\n");
  process.exit(2);
});
