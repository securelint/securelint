# SecureLint

SecureLint is a policy compiler that blocks insecure or incomplete AI-generated code at build time.

It is designed for individuals and teams using agentic coding tools (such as Claude Code, Codex, and similar systems), as well as for "vibe coders" who want strong guarantees that their software meets minimum security and correctness standards before it can run or ship.

Instead of relying on best-effort prompting or post-hoc reviews, SecureLint makes critical requirements non-negotiable: if code violates declared security or intent policies, it simply does not compile.

## What SecureLint Enforces

SecureLint focuses on **semantic guarantees**, not style. Examples include:

* Secrets must never be logged, stored in plaintext, or transmitted insecurely.
* Passwords must be hashed using approved algorithms before persistence.
* Protected routes must be guarded by authentication and authorization middleware.
* Sensitive operations must emit audit events.
* Dependency supply chain must meet vulnerability and license policies.
* Declared features must include required error handling and tests.

Violations are reported as structured, machine-readable diagnostics so that agentic tools can automatically fix them and re-run the build until it passes.

## Why a "Policy Compiler"

Traditional linters and SAST tools:

* Are advisory.
* Can be disabled.
* Produce unstructured warnings.

SecureLint:

* Runs as a hard build gate.
* Encodes organizational policy as compile-time rules.
* Emits deterministic, fixable errors.
* Treats security and completeness as part of the language contract.

In short: SecureLint turns "this should be secure" into "this will not build unless it is secure."

## How It Works

SecureLint operates as a build-time analyzer:

1. Parses your TypeScript codebase.
2. Builds a semantic model of routes, data flows, and side effects.
3. Applies policy rules (e.g., auth, secrets, dependency posture).
4. Emits structured diagnostics and optional fix recipes.
5. Fails the build if any rule is violated.

Agentic tools can consume these diagnostics directly and converge to a passing build automatically.

## Status

SecureLint is in early development and subject to rapid breaking changes. It is not recommended for production at this time.

## License

See the [LICENSE](LICENSE) file for details.
