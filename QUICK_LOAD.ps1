# EH Modern Reader - 快速加载脚本
# 用途：自动打开 Chrome 并加载扩展
# 使用：PowerShell -ExecutionPolicy Bypass -File QUICK_LOAD.ps1

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "EH Modern Reader - 快速加载脚本" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 获取当前脚本的目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$extensionPath = $scriptDir  # 扩展文件夹路径

Write-Host "`n📁 扩展路径: $extensionPath" -ForegroundColor Yellow

# 检查 manifest.json 是否存在
if (-not (Test-Path "$extensionPath\manifest.json")) {
    Write-Host "❌ 错误：找不到 manifest.json，请确保在正确的目录运行脚本" -ForegroundColor Red
    exit 1
}

# 获取 Chrome 路径
$chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)

$chromePath = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chromePath = $path
        break
    }
}

if (-not $chromePath) {
    Write-Host "❌ 找不到 Chrome 浏览器" -ForegroundColor Red
    Write-Host "   请检查是否安装了 Google Chrome" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 找到 Chrome: $chromePath" -ForegroundColor Green

# 构造加载扩展的参数
# 需要将路径转换为正斜杠格式
$extensionPathForChrome = $extensionPath -replace '\\', '/'

# Chrome 支持 --load-extension 参数加载未打包的扩展
$arguments = "--load-extension=`"$extensionPath`""

Write-Host "📂 准备加载扩展..." -ForegroundColor Yellow
Write-Host "   参数: $arguments`n" -ForegroundColor Gray

# 启动 Chrome（如果已运行则打开新窗口）
try {
    & $chromePath $arguments
    Write-Host "✅ Chrome 已启动，扩展加载中..." -ForegroundColor Green
    Write-Host "`n📝 下一步：" -ForegroundColor Cyan
    Write-Host "   1. 访问 https://e-hentai.org/g/1234567/（替换为实际 gallery ID）" -ForegroundColor White
    Write-Host "   2. 或访问任何 MPV 页面（如 https://e-hentai.org/mpv/123456789/）" -ForegroundColor White
    Write-Host "   3. 扩展会自动启动" -ForegroundColor White
    Write-Host "   4. 如有问题，检查 Chrome DevTools Console 查看错误信息" -ForegroundColor White
}
catch {
    Write-Host "❌ 启动 Chrome 时出错: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "✨ 祝你使用愉快！" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
