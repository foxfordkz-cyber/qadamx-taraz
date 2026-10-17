param(
    [Parameter(Mandatory = $true)][string]$ApkPath,
    [ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedSha256,
    [string]$AdbPath,
    [string]$Serial,
    [switch]$Install
)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$packageName = 'kz.qadam.qadam_mobile'
$apk = (Resolve-Path -LiteralPath $ApkPath).Path
$hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant()
if ($ExpectedSha256 -and $hash -ne $ExpectedSha256.ToLowerInvariant()) {
    throw 'APK checksum mismatch. Download the published APK again; installation was not attempted.'
}
if (-not $AdbPath) {
    if ($env:ANDROID_HOME) {
        $AdbPath = Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe'
    } else {
        $AdbPath = (Get-Command adb -ErrorAction Stop).Source
    }
}
$adb = (Resolve-Path -LiteralPath $AdbPath).Path
$deviceOutput = (& $adb devices 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) { throw 'ADB could not list devices.' }
$devices = @([regex]::Matches($deviceOutput, '(?m)^([^\s]+)\s+device\s*$') |
    ForEach-Object { $_.Groups[1].Value })
if ($Serial) {
    if ($Serial -notin $devices) { throw 'Selected device is not connected and authorized.' }
} elseif ($devices.Count -eq 1) {
    $Serial = $devices[0]
} else {
    throw 'Connect and authorize one Android device, or select it with -Serial. No installation was attempted.'
}

function Read-AndroidProperty([string]$Name) {
    $value = (& $adb -s $Serial shell getprop $Name 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Could not read Android device properties.' }
    # Only allowlisted OS properties are requested. Never collect serial/IMEI,
    # account state, logcat, app data, tokens or unrelated package information.
    $safe = $value -replace '[\x00-\x1f]', ''
    return $safe.Substring(0, [Math]::Min(120, $safe.Length))
}
$report = [ordered]@{
    apk_file = [IO.Path]::GetFileName($apk)
    apk_bytes = (Get-Item -LiteralPath $apk).Length
    apk_sha256 = $hash
    published_checksum_checked = [bool]$ExpectedSha256
    device_type = if ($Serial -like 'emulator-*') { 'emulator' } else { 'physical' }
    manufacturer = Read-AndroidProperty 'ro.product.manufacturer'
    model = Read-AndroidProperty 'ro.product.model'
    android = Read-AndroidProperty 'ro.build.version.release'
    sdk = Read-AndroidProperty 'ro.build.version.sdk'
    abis = Read-AndroidProperty 'ro.product.cpu.abilist'
    package = $packageName
}
$packageInfo = (& $adb -s $Serial shell dumpsys package $packageName 2>&1 | Out-String)
$versionCode = [regex]::Match($packageInfo, '\bversionCode=(\d+)')
$versionName = [regex]::Match($packageInfo, '\bversionName=([a-zA-Z0-9.+_-]+)')
$report.installed_version_code_before = if ($versionCode.Success) { $versionCode.Groups[1].Value } else { $null }
$report.installed_version_name_before = if ($versionName.Success) { $versionName.Groups[1].Value } else { $null }
$report.install_result = 'NOT_ATTEMPTED'
if ($Install) {
    # -r preserves data. Never use uninstall, pm clear, downgrade, test-only,
    # grant-all-permissions or other bypass flags as an installer workaround.
    $installOutput = (& $adb -s $Serial install --no-streaming -r $apk 2>&1 | Out-String)
    $report.install_exit_code = $LASTEXITCODE
    $failure = [regex]::Match($installOutput, '\bINSTALL_(?:FAILED|PARSE_FAILED)_[A-Z0-9_]+\b')
    $report.install_result = if ($report.install_exit_code -eq 0 -and
        $installOutput -match '(?m)^Success\s*$') { 'SUCCESS' }
        elseif ($failure.Success) { $failure.Value }
        else { 'UNKNOWN_INSTALL_FAILURE' }
}
# Deliberately emit no raw ADB output or device identifier.
$report | ConvertTo-Json -Depth 3
if ($Install -and $report.install_result -ne 'SUCCESS') { exit 1 }
