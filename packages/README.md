# Second APM consumer and shared source workspace

This directory is an independent APM project with its own [manifest](apm.yml)
and [generated lock](apm.lock.yaml).

It also contains the one canonical source copy of:

- [Engineering baseline](engineering-baseline/README.md).
- [Webhook playbook](webhook-playbook/README.md).

Both source packages are below this project root. That keeps the pinned CLI's
transitive local paths portable when the checkout is relocated.

From this directory:

```powershell
& ../scripts/apm.ps1 install --frozen --target copilot
& ../scripts/apm.ps1 audit --ci --policy ../apm-policy.yml
```

After an intentional source change in Lab 4, use a normal install instead of
frozen mode, then review the generated changes.

This is not a second Git repository or a security-isolated workspace. VS Code
may discover parent customizations as well as local ones.
