---
description: "Use when changing TypeScript application code or tests. Apply Northstar's evidence-first engineering baseline."
applyTo: "**/*.ts"
---
# Northstar engineering baseline

- Read the existing implementation and the relevant tests before editing.
- Keep the public API contract stable unless the task explicitly changes it.
- Use strict TypeScript and explicit validation at input boundaries.
- Do not add a runtime dependency when the existing standard library suffices.
- Run the smallest relevant test command, then run the regression suite.
- Report the exact commands run, their exit status, and any remaining failures.
- Never describe a skipped test or an expected failure as a passing acceptance gate.
