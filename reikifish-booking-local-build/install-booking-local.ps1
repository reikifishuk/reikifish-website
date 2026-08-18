$ErrorActionPreference = "Stop"

Write-Host "`n=== INSTALLING REIKIFISH BOOKING SYSTEM LOCALLY ===" -ForegroundColor Cyan

$packageFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectFolder = (Resolve-Path (Join-Path $packageFolder "..")).Path
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFolder = Join-Path $projectFolder "_local_backups\booking-system-$timestamp"

if (-not (Test-Path (Join-Path $projectFolder "index.html"))) {
    throw "Place this booking package folder directly inside the ReikiFish project before running it."
}

New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null

$installFiles = @(
    "booking.html",
    "booking-admin.html",
    "assets\css\booking.css",
    "assets\css\booking-admin.css",
    "assets\js\booking.js",
    "assets\js\booking-admin.js",
    "functions\api\booking\_shared.js",
    "functions\api\booking\config.js",
    "functions\api\booking\availability.js",
    "functions\api\booking\create-order.js",
    "functions\api\booking\capture-order.js",
    "functions\api\booking\webhook.js",
    "functions\api\booking\admin.js",
    "migrations\0001_booking_system.sql",
    "wrangler.jsonc",
    "package.json"
)

foreach ($relativePath in $installFiles) {
    $source = Join-Path $packageFolder $relativePath
    $destination = Join-Path $projectFolder $relativePath
    if (-not (Test-Path $source)) { throw "Package file missing: $relativePath" }
    if (Test-Path $destination) {
        $backup = Join-Path $backupFolder $relativePath
        New-Item -ItemType Directory -Path (Split-Path $backup -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $destination -Destination $backup -Force
    }
    New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination -Force
    Write-Host "INSTALLED: $relativePath" -ForegroundColor Green
}

$devVars = Join-Path $projectFolder ".dev.vars"
if (-not (Test-Path $devVars)) {
    Copy-Item (Join-Path $packageFolder ".dev.vars.example") $devVars
    Write-Host "CREATED: .dev.vars template" -ForegroundColor Yellow
}

$gitIgnore = Join-Path $projectFolder ".gitignore"
$ignoreLines = @(".dev.vars", ".wrangler/", "node_modules/")
$existingIgnore = if (Test-Path $gitIgnore) { [IO.File]::ReadAllText($gitIgnore) } else { "" }
foreach ($line in $ignoreLines) {
    if ($existingIgnore -notmatch "(?m)^$([regex]::Escape($line))$") { $existingIgnore += "`r`n$line" }
}
[IO.File]::WriteAllText($gitIgnore, $existingIgnore.TrimStart() + "`r`n", [Text.UTF8Encoding]::new($false))

$coachingPath = Join-Path $projectFolder "coaching.html"
$coachingContent = [IO.File]::ReadAllText($coachingPath)
$updatedCoaching = $coachingContent.Replace(
    '<a href="contact.html" class="btn btn-gold">Start a Conversation</a>',
    '<a href="booking.html" class="btn btn-gold">Book a Coaching Session</a>'
)
if ($updatedCoaching -ne $coachingContent) {
    Copy-Item $coachingPath (Join-Path $backupFolder "coaching.html") -Force
    [IO.File]::WriteAllText($coachingPath, $updatedCoaching, [Text.UTF8Encoding]::new($false))
    Write-Host "UPDATED: coaching.html booking button" -ForegroundColor Green
}

$requiredChecks = @(
    @{ Path="booking.html"; Text="Choose a time to" },
    @{ Path="assets\js\booking.js"; Text="create-order" },
    @{ Path="functions\api\booking\capture-order.js"; Text="COMPLETED" },
    @{ Path="migrations\0001_booking_system.sql"; Text="slot_locks" }
)
foreach ($check in $requiredChecks) {
    $content = [IO.File]::ReadAllText((Join-Path $projectFolder $check.Path))
    if ($content -notmatch [regex]::Escape($check.Text)) { throw "Validation failed: $($check.Path)" }
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw "Node.js is required for the local Cloudflare booking server." }
foreach ($script in @("assets\js\booking.js", "assets\js\booking-admin.js", "functions\api\booking\_shared.js", "functions\api\booking\create-order.js", "functions\api\booking\capture-order.js")) {
    node --check (Join-Path $projectFolder $script)
    if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax failed: $script" }
}

Push-Location $projectFolder
try {
    Write-Host "`nInstalling the local Cloudflare development runtime…" -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
    npm run booking:db:local
    if ($LASTEXITCODE -ne 0) { throw "Local booking database setup failed." }
}
finally { Pop-Location }

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host "LOCAL BOOKING SYSTEM INSTALLED" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Backup: $backupFolder"
Write-Host "`nNEXT: Open .dev.vars and add Sandbox credentials."
Write-Host "Then run: npm run booking:dev"
Write-Host "Customer page: http://127.0.0.1:8000/booking.html"
Write-Host "Private manager: http://127.0.0.1:8000/booking-admin.html"
Write-Host "Nothing was committed or pushed."
