[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$config = Get-Content -Raw -LiteralPath (Join-Path $root 'lab.config.json') | ConvertFrom-Json

$architecture = [System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture.ToString()
if ($architecture -notin @('X64', 'Arm64')) {
    throw 'Use an x64 or Arm64 runtime on Windows or in the Linux dev container.'
}
if ($IsWindows) {
    $archiveName = $config.apmWindowsArchive
    $expectedHash = $config.apmWindowsSha256
    $relativeExecutable = 'apm-windows-x86_64/apm.exe'
}
elseif ($IsLinux) {
    $key = if ($architecture -eq 'X64') { 'x64' } else { 'arm64' }
    $archiveName = $config.apmLinux.$key.archive
    $expectedHash = $config.apmLinux.$key.sha256
    $bundle = if ($architecture -eq 'X64') { 'apm-linux-x86_64' } else { 'apm-linux-arm64' }
    $relativeExecutable = "$bundle/apm"
}
else {
    throw 'Use PowerShell 7 on Windows or in the Linux dev container. See labs/00-setup.md.'
}
if (-not $archiveName -or $expectedHash -notmatch '^[a-f0-9]{64}$') {
    throw 'The selected APM runtime has no valid pinned archive checksum.'
}

$directory = Join-Path $root ".tools/apm/$($config.apmVersion)"
$executable = Join-Path $directory $relativeExecutable
if (Test-Path -LiteralPath $executable) {
    $version = (& $executable --version) -join "`n"
    if ($LASTEXITCODE -ne 0 -or $version -notmatch "(?m)^Agent Package Manager \(APM\) CLI version $([regex]::Escape($config.apmVersion))(?: \([0-9a-f]{7,40}\))?`r?$") {
        throw "The existing executable at $executable does not report the required APM version."
    }
    Write-Output "Using $version at $executable"
    return
}

New-Item -ItemType Directory -Path $directory -Force | Out-Null
$archive = Join-Path $directory $archiveName
$url = "https://github.com/microsoft/apm/releases/download/v$($config.apmVersion)/$archiveName"
Write-Output "Downloading pinned APM $($config.apmVersion). No global installation is changed."
Invoke-WebRequest -Uri $url -OutFile $archive
$actualHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $expectedHash) {
    Remove-Item -LiteralPath $archive
    throw 'APM archive SHA-256 mismatch. Installation stopped; do not bypass this check.'
}

if ($IsWindows) {
    Expand-Archive -LiteralPath $archive -DestinationPath $directory -Force
}
else {
    & tar -xzf $archive -C $directory
    if ($LASTEXITCODE -ne 0) { throw 'Could not extract the verified Linux APM archive.' }
}
Remove-Item -LiteralPath $archive
if (-not (Test-Path -LiteralPath $executable)) {
    throw "The verified archive did not contain the expected executable at $executable."
}
if ($IsLinux) {
    & chmod u+x $executable
    if ($LASTEXITCODE -ne 0) { throw 'Could not make the verified Linux APM executable runnable.' }
}
$version = (& $executable --version) -join "`n"
if ($LASTEXITCODE -ne 0 -or $version -notmatch "(?m)^Agent Package Manager \(APM\) CLI version $([regex]::Escape($config.apmVersion))(?: \([0-9a-f]{7,40}\))?`r?$") {
    throw 'The downloaded executable failed the pinned-version check.'
}
Write-Output "Installed $version at $executable"
