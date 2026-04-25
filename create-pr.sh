#!/bin/bash
# Script to create a Pull Request for the E2E Test Implementation
# 
# Prerequisites:
# - GitHub CLI (gh) must be installed: https://cli.github.com/
# - You must be authenticated with GitHub: gh auth login

echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║  Creating Pull Request: #89 Integration Tests — Oracle → Soroban      ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI is not installed."
    echo ""
    echo "Please install GitHub CLI from: https://cli.github.com/"
    echo ""
    echo "Or install via package manager:"
    echo "  macOS: brew install gh"
    echo "  Windows: choco install gh"
    echo "  Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
    exit 1
fi

echo "✓ GitHub CLI found"
echo ""

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub"
    echo ""
    echo "Please authenticate first:"
    echo "  gh auth login"
    exit 1
fi

echo "✓ Authenticated with GitHub"
echo ""

# Verify we're on the correct branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != *"#89"* ]]; then
    echo "❌ Not on the correct branch"
    echo "   Current branch: $CURRENT_BRANCH"
    echo "   Expected: #89-Integration-Tests-—-Oracle-→-Soroban-Pipeline"
    exit 1
fi

echo "✓ On correct branch: $CURRENT_BRANCH"
echo ""

# Get repository info
REPO_OWNER=$(git remote get-url origin | sed -E 's/.*github\.com[:/]([^/]+)\/.*/\1/')
REPO_NAME=$(git remote get-url origin | sed -E 's/.*github\.com[:/][^/]+\/(.*)\.git/\1/')
REPO="$REPO_OWNER/$REPO_NAME"

echo "Repository: $REPO"
echo ""

# Create Pull Request
echo "Creating pull request..."
echo ""

gh pr create \
  --title "feat(#89): End-to-end test suite for Oracle → Soroban Pipeline" \
  --body "$(cat PULL_REQUEST.md)" \
  --base main \
  --head "$CURRENT_BRANCH" \
  --repo "$REPO" \
  --reviewer "Mitchell-George" \
  --label "feature" \
  --label "testing" \
  --label "high-priority"

if [ $? -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════════════════╗"
    echo "║  ✅ Pull Request Created Successfully!                                ║"
    echo "╚════════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "View PR: gh pr view"
    echo "List PRs: gh pr list"
else
    echo ""
    echo "❌ Failed to create pull request"
    exit 1
fi
