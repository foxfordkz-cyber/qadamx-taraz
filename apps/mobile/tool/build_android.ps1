param(
    [string]$PublicConfig = 'config/public.local.json',
    [switch]$Release
)
$ErrorActionPreference = 'Stop'
$appDirectory = Split-Path $PSScriptRoot -Parent
Push-Location $appDirectory
try {
    $configPath = (Resolve-Path -LiteralPath $PublicConfig).Path
    $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
    $required = @('API_BASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY')
    $allowed = $required + @('FRONTEND_BASE_URL')
    $names = @($config.PSObject.Properties.Name)
    if (@($required | Where-Object { $_ -notin $names }).Count -ne 0 -or @($names | Where-Object { $_ -notin $allowed }).Count -ne 0) {
        throw 'Only the three public connection fields and optional FRONTEND_BASE_URL are permitted.'
    }
    foreach ($name in $names) {
        if ($config.$name -isnot [string]) { throw 'Public config values must be strings.' }
    }
    if ($config.SUPABASE_URL -ne 'https://pdjjdqgoitnkpgkbqjtp.supabase.co') {
        throw 'Wrong Supabase project.'
    }
    $key = $config.SUPABASE_PUBLISHABLE_KEY
    if ($key -and $key -notmatch '^sb_publishable_[A-Za-z0-9_-]{16,}$') {
        # Build script deliberately accepts only modern publishable keys.
        # Runtime also supports a verified legacy anon key for team migration.
        throw 'Use the project publishable key, never a server key or account credential.'
    }
    if ($config.API_BASE_URL) {
        $api = [Uri]$config.API_BASE_URL
        if (-not $api.IsAbsoluteUri -or $api.Scheme -notin @('https', 'http') -or
            $api.UserInfo -or $api.Query -or $api.Fragment -or
            $api.AbsolutePath.TrimEnd('/') -ne '/api/v1' -or
            $api.Host -eq 'pdjjdqgoitnkpgkbqjtp.supabase.co') {
            throw 'API_BASE_URL must be the agreed FastAPI address ending in /api/v1.'
        }
        if ($Release -and $api.Scheme -ne 'https') { throw 'Release requires HTTPS.' }
    } elseif ($Release) {
        throw 'Release requires an agreed API_BASE_URL.'
    }
    if ($config.FRONTEND_BASE_URL) {
        $frontend = [Uri]$config.FRONTEND_BASE_URL
        if (-not $frontend.IsAbsoluteUri -or $frontend.Scheme -ne 'https' -or
            $frontend.UserInfo -or $frontend.Query -or $frontend.Fragment -or
            $frontend.AbsolutePath -ne '/') {
            throw 'FRONTEND_BASE_URL must be a plain HTTPS origin.'
        }
    }
    $buildMode = if ($Release) { '--release' } else { '--debug' }
    & flutter build apk $buildMode "--dart-define-from-file=$configPath"
    if ($LASTEXITCODE -ne 0) { throw 'Flutter APK build failed.' }
} finally {
    Pop-Location
}
