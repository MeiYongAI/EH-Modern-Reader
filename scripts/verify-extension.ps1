# Modern Gallery Reader - Extension Verification

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

Write-Host "Modern Gallery Reader - Directory Verification" -ForegroundColor Cyan
Write-Host "=============================================`n" -ForegroundColor Cyan

$basePath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$manifestPath = Join-Path $basePath "manifest.json"
$allGood = $true

function Fail($message) {
    Write-Host "  [FAIL] $message" -ForegroundColor Red
    $script:allGood = $false
}

function Pass($message) {
    Write-Host "  [OK]   $message" -ForegroundColor Green
}

$requiredFiles = @(
    "manifest.json",
    "i18n.js",
    "content.js",
    "gallery.js",
    "nhentai.js",
    "hitomi.js",
    "background.js",
    "popup.html",
    "popup.js",
    "options.html",
    "options.js",
    "welcome.html",
    "README.md",
    "LICENSE",
    "icons/icon16.png",
    "icons/icon48.png",
    "icons/icon128.png",
    "style/reader.css",
    "style/gallery.css",
    "_locales/en/messages.json",
    "_locales/zh_CN/messages.json"
)

Write-Host "Checking required files:" -ForegroundColor Yellow
foreach ($file in $requiredFiles) {
    $fullPath = Join-Path $basePath $file
    if (Test-Path $fullPath) {
        $size = (Get-Item $fullPath).Length
        Pass "$file ($size bytes)"
    } else {
        Fail "$file is missing"
    }
}

Write-Host "`nChecking manifest:" -ForegroundColor Yellow
if (Test-Path $manifestPath) {
    try {
        $manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json

        if ($manifest.manifest_version -eq 3) { Pass "manifest_version is 3" } else { Fail "manifest_version should be 3" }
        if ($manifest.name -eq "__MSG_extName__") { Pass "name uses Chrome i18n" } else { Fail "name should be __MSG_extName__" }
        if ($manifest.description -eq "__MSG_extDescription__") { Pass "description uses Chrome i18n" } else { Fail "description should be __MSG_extDescription__" }
        if ($manifest.default_locale -eq "en") { Pass "default_locale is en" } else { Fail "default_locale should be en" }
        if ($manifest.version -match '^\d+\.\d+\.\d+$') { Pass "version is $($manifest.version)" } else { Fail "version should be semantic x.y.z" }

        $hosts = @($manifest.host_permissions)
        foreach ($hostPermission in @("https://hitomi.la/*", "https://*.hitomi.la/*", "https://*.gold-usergeneratedcontent.net/*")) {
            if ($hosts -contains $hostPermission) { Pass "host permission present: $hostPermission" } else { Fail "missing host permission: $hostPermission" }
        }

        $scripts = @()
        foreach ($entry in @($manifest.content_scripts)) {
            foreach ($script in @($entry.js)) {
                if ($script) { $scripts += $script }
            }
        }
        foreach ($script in @("i18n.js", "content.js", "gallery.js", "nhentai.js", "hitomi.js")) {
            if ($scripts -contains $script) { Pass "content script present: $script" } else { Fail "missing content script: $script" }
        }
    } catch {
        Fail "manifest.json is not valid JSON: $($_.Exception.Message)"
    }
}

Write-Host "`nChecking locale messages:" -ForegroundColor Yellow
foreach ($localeFile in @("_locales/en/messages.json", "_locales/zh_CN/messages.json")) {
    $fullPath = Join-Path $basePath $localeFile
    if (Test-Path $fullPath) {
        try {
            $messages = Get-Content $fullPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($messages.extName.message -eq "Modern Gallery Reader") { Pass "$localeFile extName" } else { Fail "$localeFile extName is incorrect" }
            if ($messages.extDescription.message) { Pass "$localeFile extDescription" } else { Fail "$localeFile extDescription is empty" }
        } catch {
            Fail "$localeFile is not valid JSON: $($_.Exception.Message)"
        }
    }
}

Write-Host "`nChecking repository cleanup:" -ForegroundColor Yellow
$markdownFiles = Get-ChildItem $basePath -Recurse -File -Filter "*.md" |
    Where-Object { $_.FullName -notlike "*\dist\*" -and $_.Name -ne "README.md" }
if ($markdownFiles.Count -eq 0) {
    Pass "README.md is the only Markdown file"
} else {
    foreach ($file in $markdownFiles) {
        Fail "extra Markdown file found: $($file.FullName)"
    }
}

Write-Host ""
if ($allGood) {
    Write-Host "Verification passed." -ForegroundColor Green
    Write-Host "Load unpacked from: $basePath" -ForegroundColor Yellow
    exit 0
}

Write-Host "Verification failed." -ForegroundColor Red
exit 1
