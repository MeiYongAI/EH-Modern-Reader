# EH Modern Reader - Create GitHub Release Script
# 依赖：GitHub CLI (gh) 已登录，git 已配置远端

# 强制 UTF-8 输出（Windows PowerShell 5.1）
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

Write-Host "EH Modern Reader - Create Release" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# 路径与版本
$rootDir = Join-Path $PSScriptRoot ".."
$manifestPath = Join-Path $rootDir "manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version
$tag = "v$version"

# 产物路径
$distDir = Join-Path $rootDir "dist"
$zipName = "eh-modern-reader-$tag.zip"
$zipPath = Join-Path $distDir $zipName

# 检查 gh
$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  Write-Host "未检测到 GitHub CLI (gh)。" -ForegroundColor Yellow
  Write-Host "请安装 gh 并登录：winget install GitHub.cli; gh auth login" -ForegroundColor Yellow
  Write-Host "或者手动前往 Releases 创建 $tag，并上传 $zipName，备注使用 RELEASE_NOTES.md。" -ForegroundColor Yellow
  exit 1
}

# 确保有打包产物
if (-not (Test-Path $zipPath)) {
  Write-Host "未找到 $zipName，先执行打包..." -ForegroundColor Yellow
  & (Join-Path $PSScriptRoot "build.ps1") | Out-Host
}

if (-not (Test-Path $zipPath)) {
  Write-Host "仍未发现打包产物，发布中止。" -ForegroundColor Red
  exit 1
}

# 读取 release notes
$notesFile = Join-Path $rootDir "RELEASE_NOTES.md"
if (-not (Test-Path $notesFile)) {
  Write-Host "未找到 RELEASE_NOTES.md，将使用简短说明。" -ForegroundColor Yellow
  $tempNotes = New-TemporaryFile
  "EH Modern Reader $tag 发布。详见 CHANGELOG.md。" | Set-Content -Path $tempNotes -Encoding UTF8
  $notesFile = $tempNotes
}

# 切换到仓库根目录
Push-Location $rootDir

# 判断 release 是否已存在
$exists = $false
try {
  gh release view $tag | Out-Null
  $exists = $true
} catch {}

if ($exists) {
  Write-Host "Release $tag 已存在，尝试上传/替换资源..." -ForegroundColor Yellow
  # 尝试删除同名资产后再上传
  try { gh release delete-asset $tag $zipName -y | Out-Null } catch {}
  gh release upload $tag $zipPath --clobber | Out-Host
  Write-Host "已更新发布资产：$zipName" -ForegroundColor Green
} else {
  Write-Host "创建 Release $tag ..." -ForegroundColor Yellow
  gh release create $tag $zipPath -F $notesFile -t "EH Modern Reader $tag" --latest | Out-Host
  Write-Host "Release 创建完成：$tag" -ForegroundColor Green
}

Pop-Location

Write-Host "\n完成。" -ForegroundColor Cyan
