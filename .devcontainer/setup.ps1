[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
if (-not $IsLinux) { throw 'Run this setup inside the Linux dev container.' }
$root = Split-Path -Parent $PSScriptRoot

Push-Location $root
try {
    $owner = "{0}:{1}" -f (& id -u), (& id -g)
    & sudo -n chown $owner (Join-Path $root 'node_modules')
    if ($LASTEXITCODE -ne 0) { throw 'Could not prepare the container dependency volume.' }
    & (Join-Path $root 'scripts/install-apm.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Pinned APM installation failed.' }
    & npm ci --ignore-scripts
    if ($LASTEXITCODE -ne 0) { throw 'npm dependency restore failed.' }
    & npm run setup:context
    if ($LASTEXITCODE -ne 0) { throw 'Locked context setup failed; preserve any reported backup.' }
    & npm run check
    if ($LASTEXITCODE -ne 0) { throw 'Starter checks failed.' }
    Write-Host 'Dev container ready. Acceptance tests remain the learner task.'
}
finally {
    Pop-Location
}