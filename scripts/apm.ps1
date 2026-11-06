param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $ApmArguments
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$config = Get-Content -Raw -LiteralPath (Join-Path $root 'lab.config.json') | ConvertFrom-Json
$executable = Join-Path $root ".tools\apm\$($config.apmVersion)\apm-windows-x86_64\apm.exe"
if (-not (Test-Path -LiteralPath $executable)) {
    throw 'Pinned APM is missing. From the repository root, run: pwsh -NoProfile -File .\scripts\install-apm.ps1'
}

$previousHome = $env:APM_HOME
$previousCache = $env:APM_CACHE_DIR
try {
    $env:APM_HOME = Join-Path (Get-Location).Path '.lab\apm-home'
    $env:APM_CACHE_DIR = Join-Path (Get-Location).Path '.lab\apm-cache'
    & $executable @ApmArguments
    $code = $LASTEXITCODE
}
finally {
    $env:APM_HOME = $previousHome
    $env:APM_CACHE_DIR = $previousCache
}
exit $code
