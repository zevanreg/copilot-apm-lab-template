# Northstar APM workshop

The initialized starter is cloned from GitHub, then published to Azure Repos for
workshop branches, pull requests, and builds. The `.github` directory is a local
Copilot customization surface, not a GitHub Actions requirement.

- Read the current lab before changing files. Follow the learner's requested scope.
- The starter's duplicate-delivery defect is intentional. Baseline tests should
  pass; acceptance tests are expected to fail until the learner fixes the API.
- Preserve the acceptance tests and their required status codes.
- Author reusable customizations under `packages\<package>\.apm`, then use APM to
  deploy them. Do not hand-edit managed `.github` or `.agents` outputs, except
  when the learner explicitly runs the drift exercise.
- Use the repository-local pinned APM wrapper, `scripts\apm.ps1`.
- APM's local policy is passed explicitly to audit. Do not claim that a local
  policy file is automatically enforced at installation time.
- Keep secrets out of manifests, prompts, documentation, and Git URLs.
- The application is an in-memory lab, not a production webhook service.
