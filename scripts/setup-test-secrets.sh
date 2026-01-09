#!/bin/bash
# Script to add test secrets and variables to GitHub environments
# Environments (test-github, test-gitea, test-bitbucket) will be auto-created when first referenced
# Run this script after environments are created (via first workflow run or manually)

set -e

REPO="LiquidLogicLabs/git-action-tag-create-update"

echo "Adding secrets and variables to test environments..."
echo "Note: Environments will be auto-created on first workflow run if they don't exist"
echo ""

# Function to add secret if value is provided
add_secret() {
  local env=$1
  local name=$2
  local value=$3
  local required=$4
  
  if [ -z "$value" ] && [ "$required" = "required" ]; then
    echo "⚠️  Skipping $name (required but not set)"
    return 1
  elif [ -z "$value" ]; then
    echo "⚠️  Skipping $name (not set)"
    return 0
  fi
  
  echo "$value" | gh secret set "$name" -e "$env" -R "$REPO" || {
    echo "⚠️  Failed to set $name for $env (environment may not exist yet)"
    return 1
  }
  echo "✓ Set secret $name for $env"
}

# Function to add variable
add_variable() {
  local env=$1
  local name=$2
  local value=$3
  
  gh variable set "$name" -e "$env" -R "$REPO" --body "$value" || {
    echo "⚠️  Failed to set variable $name for $env (environment may not exist yet)"
    return 1
  }
  echo "✓ Set variable $name=$value for $env"
}

# GitHub environment
echo "=== Setting up test-github environment ==="
add_secret "test-github" "TEST_GITHUB_REPOSITORY" "${TEST_GITHUB_REPOSITORY:-LiquidLogicLabs/git-action-tag-create-update}" "optional"
add_secret "test-github" "TEST_GITHUB_TOKEN" "${TEST_GITHUB_TOKEN:-}" "optional"
add_variable "test-github" "TEST_TAG_PREFIX" "${TEST_TAG_PREFIX:-test-}"
echo ""

# Gitea environment (optional)
echo "=== Setting up test-gitea environment ==="
add_secret "test-gitea" "TEST_GITEA_REPOSITORY" "${TEST_GITEA_REPOSITORY:-}" "optional"
add_secret "test-gitea" "TEST_GITEA_TOKEN" "${TEST_GITEA_TOKEN:-}" "optional"
if [ -n "${TEST_GITEA_BASE_URL:-}" ]; then
  add_variable "test-gitea" "TEST_GITEA_BASE_URL" "$TEST_GITEA_BASE_URL"
fi
add_variable "test-gitea" "TEST_TAG_PREFIX" "${TEST_TAG_PREFIX:-test-}"
echo ""

# Bitbucket environment (optional)
echo "=== Setting up test-bitbucket environment ==="
add_secret "test-bitbucket" "TEST_BITBUCKET_REPOSITORY" "${TEST_BITBUCKET_REPOSITORY:-}" "optional"
add_secret "test-bitbucket" "TEST_BITBUCKET_TOKEN" "${TEST_BITBUCKET_TOKEN:-}" "optional"
if [ -n "${TEST_BITBUCKET_BASE_URL:-}" ]; then
  add_variable "test-bitbucket" "TEST_BITBUCKET_BASE_URL" "$TEST_BITBUCKET_BASE_URL"
fi
add_variable "test-bitbucket" "TEST_TAG_PREFIX" "${TEST_TAG_PREFIX:-test-}"
echo ""

echo "✅ Setup complete!"
echo ""
echo "Note: If environments don't exist yet, they will be created automatically on the first workflow run."
echo "You can then re-run this script to add secrets/variables, or add them via:"
echo "  https://github.com/$REPO/settings/environments"
