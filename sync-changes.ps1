param(
  [string]$Message
)

# Ensure we're in script directory
Set-Location -Path $PSScriptRoot

# Default message
if (-not $Message -or $Message.Trim().Length -eq 0) {
  $Message = "chore: sync $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

# Git add/commit/push
$ErrorActionPreference = 'Stop'

try {
  git add -A
  # Only commit if there are changes
  $status = git status --porcelain
  if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to commit."
  } else {
    git commit -m $Message
  }
  git push
  Write-Host "Sync complete -> origin/main"
} catch {
  Write-Error $_
  exit 1
}
