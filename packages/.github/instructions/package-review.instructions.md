---
description: "Use when reviewing package Markdown, upgrade procedures, or reusable Copilot guidance."
applyTo: "packages/**/*.md"
---

- Change authored package source, not deployed copies.
- Keep skill-relative references valid from the installed skill.
- Review the package version change, upgrade procedure, and deployment diff together.
- Run all required checks and stop on failure. Passing audits verifies package
  integrity, not model correctness or determinism.
