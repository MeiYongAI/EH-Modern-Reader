# PowerShell Script to Generate Simple Icons using .NET
Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param(
        [int]$Size,
        [string]$OutputPath
    )
    
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    # 渐变背景
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $brush1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(102, 126, 234))
    $graphics.FillRectangle($brush1, $rect)
    
    # 白色圆角矩形
    $padding = [int]($Size * 0.15)
    $innerSize = [int]($Size * 0.7)
    $innerRect = New-Object System.Drawing.Rectangle($padding, $padding, $innerSize, $innerSize)
    $brush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 255, 255, 255))
    $graphics.FillRectangle($brush2, $innerRect)
    
    # 绘制书本左页
    $leftPoints = @(
        New-Object System.Drawing.Point([int]($Size * 0.3), [int]($Size * 0.35)),
        New-Object System.Drawing.Point([int]($Size * 0.3), [int]($Size * 0.75)),
        New-Object System.Drawing.Point([int]($Size * 0.48), [int]($Size * 0.7)),
        New-Object System.Drawing.Point([int]($Size * 0.48), [int]($Size * 0.3))
    )
    $brush3 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(102, 126, 234))
    $graphics.FillPolygon($brush3, $leftPoints)
    
    # 绘制书本右页
    $rightPoints = @(
        New-Object System.Drawing.Point([int]($Size * 0.52), [int]($Size * 0.3)),
        New-Object System.Drawing.Point([int]($Size * 0.52), [int]($Size * 0.7)),
        New-Object System.Drawing.Point([int]($Size * 0.7), [int]($Size * 0.75)),
        New-Object System.Drawing.Point([int]($Size * 0.7), [int]($Size * 0.35))
    )
    $brush4 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(118, 75, 162))
    $graphics.FillPolygon($brush4, $rightPoints)
    
    # 中线
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(85, 85, 85), [int]($Size * 0.02))
    $graphics.DrawLine($pen, [int]($Size * 0.5), [int]($Size * 0.3), [int]($Size * 0.5), [int]($Size * 0.7))
    
    # 保存
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # 清理
    $graphics.Dispose()
    $bitmap.Dispose()
    $brush1.Dispose()
    $brush2.Dispose()
    $brush3.Dispose()
    $brush4.Dispose()
    $pen.Dispose()
}

Write-Host "Generating icons..." -ForegroundColor Cyan

Create-Icon -Size 16 -OutputPath "icons\icon16.png"
Write-Host "Created icon16.png" -ForegroundColor Green

Create-Icon -Size 48 -OutputPath "icons\icon48.png"
Write-Host "Created icon48.png" -ForegroundColor Green

Create-Icon -Size 128 -OutputPath "icons\icon128.png"
Write-Host "Created icon128.png" -ForegroundColor Green

Write-Host "All icons generated successfully!" -ForegroundColor Green
