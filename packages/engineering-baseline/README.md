# Engineering baseline

Reusable verification-first TypeScript engineering conventions.

- Canonical source: [.apm instructions](.apm/instructions/engineering.instructions.md).
- Manifest: [apm.yml](apm.yml).
- Consumers receive this package transitively through the webhook playbook.

Keep application-specific delivery semantics out of this package. The learner's
domain release does not require changing this baseline's version.
