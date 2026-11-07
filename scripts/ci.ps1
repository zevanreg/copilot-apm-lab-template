[CmdletBinding()]
param(
    [switch] $RequireAcceptance
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Invoke-Checked {
    param([string] $Command, [string[]] $Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
    }
}

Push-Location $root
try {
    Write-Host $(if ($RequireAcceptance) { 'Validation mode: graduation (acceptance required)' } else { 'Validation mode: starter (acceptance not required)' })
    & (Join-Path $PSScriptRoot 'install-apm.ps1')
    Invoke-Checked -Command 'npm' -Arguments @('ci', '--ignore-scripts')
    Invoke-Checked -Command 'npm' -Arguments @('run', 'check')

    $wrapper = Join-Path $PSScriptRoot 'apm.ps1'
    $policy = Join-Path $root 'apm-policy.yml'
    foreach ($consumer in @($root, (Join-Path $root 'packages'))) {
        Push-Location $consumer
        try {
            # Audit before restoring so a reinstall cannot hide committed drift.
            Invoke-Checked -Command $wrapper -Arguments @('audit', '--ci', '--policy', $policy)
            Invoke-Checked -Command $wrapper -Arguments @('install', '--frozen')
            Invoke-Checked -Command $wrapper -Arguments @('audit', '--ci', '--policy', $policy)
        }
        finally {
            Pop-Location
        }
    }
    Invoke-Checked -Command 'npm' -Arguments @('run', 'verify:reuse')
    Invoke-Checked -Command 'npm' -Arguments @('run', 'test:lab')
    Invoke-Checked -Command 'node' -Arguments @((Join-Path $PSScriptRoot 'prepare-release.mjs'))
    Push-Location (Join-Path $root '.lab\release')
    try {
        Invoke-Checked -Command $wrapper -Arguments @('install', '--target', 'copilot')
        Invoke-Checked -Command $wrapper -Arguments @('pack', '--format', 'claude-plugin', '--archive', '--output', '.\build')
    }
    finally {
        Pop-Location
    }
    if ($RequireAcceptance) {
        Invoke-Checked -Command 'npm' -Arguments @('run', 'verify:graduation')
        Write-Host 'GRADUATION PASSED: acceptance and all graduation requirements were verified.'
    }
    else {
        Write-Warning 'STARTER MODE ONLY: acceptance and graduation have not been verified. This is not a graduation build.'
        Write-Host 'STARTER VALIDATION PASSED: acceptance and graduation remain unverified.'
    }
}
finally {
    Pop-Location
}
