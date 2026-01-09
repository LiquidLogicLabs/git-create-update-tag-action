#!/bin/bash
# Script to set up test environment secrets and variables for E2E tests
# Usage: ./scripts/setup-test-env.sh

set -e

REPO="LiquidLogicLabs/git-action-tag-create-update"

echo "Setting up test environments for E2E tests..."
echo ""

# GitHub environment
echo "Setting up test-github environment..."
gh secret set TEST_GITHUB_REPOSITORY -e test-github -R "$REPO" --body "${TEST_GITHUB_REPOSITORY:-LiquidLogicLabs/git-action-tag-create-update}" || echo "Note: Set TEST_GITHUB_REPOSITORY env var or run: gh secret set TEST_GITHUB_REPOSITORY -e test-github -R $REPO"
gh secret set TEST_GITHUB_TOKEN -e test-github -R "$REPO" --body "${TEST_GITHUB_TOKEN:-}" || echo "⚠️  TEST_GITHUB_TOKEN not set - will use GITHUB_TOKEN from workflow"
gh variable set TEST_TAG_PREFIX -e test-github -R "$REPO" --body "${TEST_TAG_PREFIX:-test-}" || echo "Note: Using default TEST_TAG_PREFIX=test-"
echo "✓ test-github environment configured"
echo ""

# Gitea environment (optional - tests will skip if not configured)
echo "Setting up test-gitea environment (optional)..."
if [ -n "$TEST_GITEA_REPOSITORY" ]; then
  gh secret set TEST_GITEA_REPOSITORY -e test-gitea -R "$REPO" --body "$TEST_GITEA_REPOSITORY"
  echo "✓ TEST_GITEA_REPOSITORY set"
else
  echo "⚠️  TEST_GITEA_REPOSITORY not set - Gitea tests will be skipped"
fi

if [ -n "$TEST_GITEA_TOKEN" ]; then
  gh secret set TEST_GITEA_TOKEN -e test-gitea -R "$REPO" --body "$TEST_GITEA_TOKEN"
  echo "✓ TEST_GITEA_TOKEN set"
else
  echo "⚠️  TEST_GITEA_TOKEN not set - Gitea tests will be skipped"
fi

if [ -n "$TEST_GITEA_BASE_URL" ]; then
  gh variable set TEST_GITEA_BASE_URL -e test-gitea -R "$REPO" --body "$TEST_GITEA_BASE_URL"
  echo "✓ TEST_GITEA_BASE_URL set"
fi

gh variable set TEST_TAG_PREFIX -e test-gitea -R "$REPO" --body "${TEST_TAG_PREFIX:-test-}" || true
echo "✓ test-gitea environment configured"
echo ""

# Bitbucket environment (optional - tests will skip if not configured)
echo "Setting up test-bitbucket environment (optional)..."
if [ -n "$TEST_BITBUCKET_REPOSITORY" ]; then
  gh secret set TEST_BITBUCKET_REPOSITORY -e test-bitbucket -R "$REPO" --body "$TEST_BITBUCKET_REPOSITORY"
  echo "✓ TEST_BITBUCKET_REPOSITORY set"
else
  echo "⚠️  TEST_BITBUCKET_REPOSITORY not set - Bitbucket tests will be skipped"
fi

if [ -n "$TEST_BITBUCKET_TOKEN" ]; then
  gh secret set TEST_BITBUCKET_TOKEN -e test-bitbucket -R "$REPO" --body "$TEST_BITBUCKET_TOKEN"
  echo "✓ TEST_BITBUCKET_TOKEN set"
else
  echo "⚠️  TEST_BITBUCKET_TOKEN not set - Bitbucket tests will be skipped"
fi

if [ -n "$TEST_BITBUCKET_BASE_URL" ]; then
  gh variable set TEST_BITBUCKET_BASE_URL -e test-bitbucket -R "$REPO" --body "$TEST_BITBUCKET_BASE_URL"
  echo "✓ TEST_BITBUCKET_BASE_URL set"
fi

gh variable set TEST_TAG_PREFIX -e test-bitbucket -R "$REPO" --body "${TEST_TAG_PREFIX:-test-}" || true
echo "✓ test-bitbucket environment configured"
echo ""

echo "✅ Test environment setup complete!"
echo ""
echo "To add missing secrets/variables, run:"
echo "  # GitHub (uses current repo by default)"
echo "  gh secret set TEST_GITHUB_REPOSITORY -e test-github -R $REPO --body 'owner/repo'"
echo ""
echo "  # Gitea (optional)"
echo "  export TEST_GITEA_REPOSITORY='owner/repo'"
echo "  export TEST_GITEA_TOKEN='your-token'"
echo "  export TEST_GITEA_BASE_URL='https://gitea.com/api/v1'  # optional"
echo "  ./scripts/setup-test-env.sh"
echo ""
echo "  # Bitbucket (optional)"
echo "  export TEST_BITBUCKET_REPOSITORY='owner/repo'"
echo "  export TEST_BITBUCKET_TOKEN='your-token'"
echo "  export TEST_BITBUCKET_BASE_URL='https://api.bitbucket.org/2.0'  # optional"
echo "  ./scripts/setup-test-env.sh"
