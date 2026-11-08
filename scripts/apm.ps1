param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $ApmArguments
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$config = Get-Content -Raw -LiteralPath (Join-Path $root 'lab.config.json') | ConvertFrom-Json
$architecture = [System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture.ToString()
if ($IsWindows) {
    $relativeExecutable = 'apm-windows-x86_64/apm.exe'
}
elseif ($IsLinux -and $architecture -in @('X64', 'Arm64')) {
    $bundle = if ($architecture -eq 'X64') { 'apm-linux-x86_64' } else { 'apm-linux-arm64' }
    $relativeExecutable = "$bundle/apm"
}
else {
    throw 'Use Windows or an x64/Arm64 Linux dev container for this lab.'
}
$executable = Join-Path (Join-Path $root ".tools/apm/$($config.apmVersion)") $relativeExecutable
if (-not (Test-Path -LiteralPath $executable)) {
    throw 'Pinned APM is missing. From the repository root, run: pwsh -NoProfile -File ./scripts/install-apm.ps1'
}

$previousHome = $env:APM_HOME
$previousCache = $env:APM_CACHE_DIR
try {
    $env:APM_HOME = Join-Path (Get-Location).Path '.lab/apm-home'
    $env:APM_CACHE_DIR = Join-Path (Get-Location).Path '.lab/apm-cache'
    & $executable @ApmArguments
    $code = $LASTEXITCODE
}
finally {
    $env:APM_HOME = $previousHome
    $env:APM_CACHE_DIR = $previousCache
}
exit $code
