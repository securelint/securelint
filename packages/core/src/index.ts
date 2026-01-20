export type Severity = "error" | "warning";

export type SourceLocation = {
  file: string;
  line: number;
  col: number;
};

export type TextRange = {
  start: { line: number; col: number };
  end: { line: number; col: number };
};

export type FixRecipe = {
  id: string;
  description: string;
  edits?: Array<{
    op: "insert" | "replace_range" | "delete_range";
    file: string;
    range?: TextRange;
    text?: string;
  }>;
};

export type Diagnostic = {
  rule_id: string;
  severity: Severity;
  message: string;
  file: string;
  range?: TextRange;
  fix_recipes?: FixRecipe[];
};

export type DiagnosticReport = {
  tool: "securelint";
  version: string;
  diagnostics: Diagnostic[];
};

export type SecurelintConfig = {
  baseline?: string;
  auth?: {
    approvedGuards?: string[];
  };
};

export type RuleContext = {
  projectRoot: string;
  config?: SecurelintConfig;
};

export type Rule = {
  id: string;
  run: (ctx: RuleContext) => Promise<Diagnostic[]>;
};
