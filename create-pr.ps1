# PowerShell Script to create a Pull Request for the E2E Test Implementation
#
# Prerequisites:
# - GitHub CLI (gh) must be installed: https://cli.github.com/
# - You must be authenticated with GitHub: gh auth login

Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Creating Pull Request: #89 Integration Tests — Oracle → Soroban      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is installed
$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
    Write-Host "❌ GitHub CLI is not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install GitHub CLI from: https://cli.github.com/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or install via package manager:" -ForegroundColor Yellow
    Write-Host "  Windows (Chocolatey): choco install gh" -ForegroundColor Yellow
    Write-Host "  Windows (Scoop): scoop install gh" -ForegroundColor Yellow
    Write-Host "  Windows (MSI): Download from https://github.com/cli/cli/releases" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ GitHub CLI found" -ForegroundColor Green
Write-Host ""

# Check if authenticated
$auth = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not authenticated with GitHub" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please authenticate first:" -ForegroundColor Yellow
    Write-Host "  gh auth login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Authenticated with GitHub" -ForegroundColor Green
Write-Host ""

# Verify we're on the correct branch
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -notlike "*#89*") {
    Write-Host "❌ Not on the correct branch" -ForegroundColor Red
    Write-Host "   Current branch: $currentBranch"
    Write-Host "   Expected: #89-Integration-Tests-—-Oracle-→-Soroban-Pipeline"
    exit 1
}

Write-Host "✓ On correct branch: $currentBranch" -ForegroundColor Green
Write-Host ""

# Get repository info
$remoteUrl = git remote get-url origin
$repoOwner = [regex]::Match($remoteUrl, 'github\.com[:/]([^/]+)/').Groups[1].Value
$repoName = [regex]::Match($remoteUrl, '/([^/]+?)(?:\.git)?$').Groups[1].Value
$repo = "$repoOwner/$repoName"

Write-Host "Repository: $repo" -ForegroundColor Cyan
Write-Host ""

# Read PR body from file
if (Test-Path "PULL_REQUEST.md") {
    $prBody = Get-Content "PULL_REQUEST.md" -Raw
} else {
    Write-Host "❌ PULL_REQUEST.md not found" -ForegroundColor Red
    exit 1
}

# Create Pull Request
Write-Host "Creating pull request..." -ForegroundColor Cyan
Write-Host ""

gh pr create `
  --title "feat(#89): End-to-end test suite for Oracle → Soroban Pipeline" `
  --body "$prBody" `
  --base main `
  --head "$currentBranch" `
  --repo "$repo" `
  --label "feature","testing","high-priority"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✅ Pull Request Created Successfully!                                ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  View PR details: gh pr view" -ForegroundColor Yellow
    Write-Host "  List all PRs: gh pr list" -ForegroundColor Yellow
    Write-Host "  Add review: gh pr review" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Failed to create pull request" -ForegroundColor Red
    exit 1
}
