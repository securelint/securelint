import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { Rule, RuleContext, Diagnostic } from "@securelint/core";

const EXPRESS_METHODS = new Set(["get", "post", "put", "delete", "patch"]);
const APPROVED_GUARDS = new Set(["requireAuth"]);

function walkDir(dir: string, out: string[]) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === "dist" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p, out);
    else if (e.isFile() && (p.endsWith(".ts") || p.endsWith(".tsx")) && !p.endsWith(".d.ts")) out.push(p);
  }
}

function findContainingStatement(node: ts.Node): ts.Statement | null {
  let cur: ts.Node | undefined = node;
  while (cur) {
    if (ts.isStatement(cur)) return cur;
    cur = cur.parent;
  }
  return null;
}

function hasProtectedComment(sf: ts.SourceFile, node: ts.Node): boolean {
  const stmt = findContainingStatement(node) ?? (ts.isExpressionStatement(node.parent) ? node.parent : null);
  if (!stmt) return false;

  // 1) Check explicit JSDoc tags: /** @protected */
  // TypeScript parses tags in JSDoc blocks into structured nodes.
  const tags = ts.getJSDocTags(stmt);
  for (const t of tags) {
    if (t.tagName?.getText(sf) === "protected") return true;
  }

  // 2) Check raw leading comment text for "@protected" (covers inline and mixed tags)
  // Important: anchor at stmt.pos, not getFullStart().
  const text = sf.getFullText();
  const ranges = ts.getLeadingCommentRanges(text, stmt.pos) ?? [];
  for (const r of ranges) {
    const comment = text.slice(r.pos, r.end);
    if (comment.includes("@protected")) return true;
  }

  // 3) Fallback: check JSDoc node text (covers cases where tags aren't parsed as expected)
  const jsDocs = (stmt as any).jsDoc as ts.JSDoc[] | undefined;
  if (jsDocs) {
    for (const d of jsDocs) {
      const raw = d.getText(sf);
      if (raw.includes("@protected")) return true;
    }
  }

  return false;
}

function isExpressRouteCall(node: ts.CallExpression): { method: string } | null {
  const expr = node.expression;
  if (!ts.isPropertyAccessExpression(expr)) return null;

  const method = expr.name.getText();
  if (!EXPRESS_METHODS.has(method)) return null;

  // v0: accept app.get(...) or router.get(...), etc. We do not validate the receiver identifier.
  return { method };
}

function isStringLiteral(arg: ts.Expression): arg is ts.StringLiteral {
  return ts.isStringLiteral(arg);
}

function handlerListContainsApprovedGuard(args: readonly ts.Expression[]): boolean {
  // Express signature: (path, ...handlers)
  // v0: if any handler is an Identifier with approved name, pass.
  for (const a of args) {
    if (ts.isIdentifier(a) && APPROVED_GUARDS.has(a.text)) return true;
  }
  return false;
}

function toRelative(projectRoot: string, filePath: string): string {
  const rel = path.relative(projectRoot, filePath);
  return rel.startsWith("..") ? filePath : rel;
}

function posToLineCol(sf: ts.SourceFile, pos: number): { line: number; col: number } {
  const lc = sf.getLineAndCharacterOfPosition(pos);
  return { line: lc.line + 1, col: lc.character + 1 };
}

export const AuthRoute001: Rule = {
  id: "AUTH-ROUTE-001",
  async run(ctx: RuleContext): Promise<Diagnostic[]> {
    const projectRoot = ctx.projectRoot;
    const files: string[] = [];
    walkDir(projectRoot, files);

    const diagnostics: Diagnostic[] = [];

    for (const filePath of files) {
      const sourceText = fs.readFileSync(filePath, "utf8");
      const sf = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);

      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node)) {
          const routeInfo = isExpressRouteCall(node);
          if (routeInfo) {
            // Must have at least path + handler
            if (node.arguments.length >= 2) {
              const [pathArg, ...handlers] = node.arguments;
              if (pathArg && isStringLiteral(pathArg)) {
                const isProtected = hasProtectedComment(sf, node);
                if (isProtected) {
                  const ok = handlerListContainsApprovedGuard(handlers);
                  if (!ok) {
                    const relFile = toRelative(projectRoot, filePath);
                    const start = posToLineCol(sf, node.getStart(sf));
                    const end = posToLineCol(sf, node.getEnd());
                    diagnostics.push({
                      rule_id: "AUTH-ROUTE-001",
                      severity: "error",
                      message: "Protected route is missing requireAuth middleware.",
                      file: relFile,
                      range: {
                        start: { line: start.line, col: start.col },
                        end: { line: end.line, col: end.col },
                      },
                      fix_recipes: [
                        {
                          id: "insert-requireAuth",
                          description: "Insert requireAuth middleware as the first handler argument.",
                        },
                      ],
                    });
                  }
                }
              }
            }
          }
        }
        ts.forEachChild(node, visit);
      };

      visit(sf);
    }

    return diagnostics;
  },
};
