[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$config = Get-Content -Raw -LiteralPath (Join-Path $root 'lab.config.json') | ConvertFrom-Json

if (-not $IsWindows -or [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString() -notin @('X64', 'Arm64')) {
    throw 'This lab installer requires PowerShell 7 on Windows x64, or Windows Arm64 with x64 emulation. See labs\00-setup.md.'
}

$directory = Join-Path $root ".tools\apm\$($config.apmVersion)"
$executable = Join-Path $directory 'apm-windows-x86_64\apm.exe'
if (Test-Path -LiteralPath $executable) {
    $version = (& $executable --version) -join "`n"
    if ($LASTEXITCODE -ne 0 -or $version -notmatch "(?m)^Agent Package Manager \(APM\) CLI version $([regex]::Escape($config.apmVersion))`r?$") {
        throw "The existing executable at $executable does not report the required APM version."
    }
    Write-Output "Using $version at $executable"
    return
}

New-Item -ItemType Directory -Path $directory -Force | Out-Null
$archive = Join-Path $directory $config.apmWindowsArchive
$url = "https://github.com/microsoft/apm/releases/download/v$($config.apmVersion)/$($config.apmWindowsArchive)"
Write-Output "Downloading pinned APM $($config.apmVersion). No global installation is changed."
Invoke-WebRequest -Uri $url -OutFile $archive
$actualHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $config.apmWindowsSha256) {
    Remove-Item -LiteralPath $archive
    throw 'APM archive SHA-256 mismatch. Installation stopped; do not bypass this check.'
}

Expand-Archive -LiteralPath $archive -DestinationPath $directory -Force
Remove-Item -LiteralPath $archive
if (-not (Test-Path -LiteralPath $executable)) {
    throw "The verified archive did not contain the expected executable at $executable."
}
$version = (& $executable --version) -join "`n"
if ($LASTEXITCODE -ne 0 -or $version -notmatch "(?m)^Agent Package Manager \(APM\) CLI version $([regex]::Escape($config.apmVersion))`r?$") {
    throw 'The downloaded executable failed the pinned-version check.'
}
Write-Output "Installed $version at $executable"
