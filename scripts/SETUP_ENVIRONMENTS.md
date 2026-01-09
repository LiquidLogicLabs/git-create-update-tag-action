# Setting Up Test Environments

This guide shows how to set up the test environments (`test-github`, `test-gitea`, `test-bitbucket`) and their secrets/variables.

## Prerequisites

1. You need admin access to the repository or appropriate permissions to:
   - Create environments
   - Add secrets and variables to environments

2. GitHub CLI (`gh`) should be installed and authenticated with appropriate permissions

## Option 1: Via GitHub Web UI (Recommended)

1. Go to: https://github.com/LiquidLogicLabs/git-action-tag-create-update/settings/environments
2. Click "New environment" for each:
   - `test-github`
   - `test-gitea`
   - `test-bitbucket`
3. Add the secrets and variables listed below for each environment

## Option 2: Via GitHub CLI

Environments will be auto-created when first referenced in a workflow. You can add secrets/variables using:

### For test-github environment:

```bash
# Required/Recommended secrets
echo "LiquidLogicLabs/git-action-tag-create-update" | gh secret set TEST_GITHUB_REPOSITORY -e test-github -R LiquidLogicLabs/git-action-tag-create-update
echo "your-github-token" | gh secret set TEST_GITHUB_TOKEN -e test-github -R LiquidLogicLabs/git-action-tag-create-update

# Optional variables
gh variable set TEST_TAG_PREFIX -e test-github -R LiquidLogicLabs/git-action-tag-create-update --body "test-"
gh variable set TEST_GITHUB_REPOSITORY_URL -e test-github -R LiquidLogicLabs/git-action-tag-create-update --body "https://github.com"
```

### For test-gitea environment (optional):

```bash
# Required if you want to test Gitea
echo "owner/repo" | gh secret set TEST_GITEA_REPOSITORY -e test-gitea -R LiquidLogicLabs/git-action-tag-create-update
echo "your-gitea-token" | gh secret set TEST_GITEA_TOKEN -e test-gitea -R LiquidLogicLabs/git-action-tag-create-update

# Optional
gh variable set TEST_GITEA_BASE_URL -e test-gitea -R LiquidLogicLabs/git-action-tag-create-update --body "https://gitea.com/api/v1"
gh variable set TEST_TAG_PREFIX -e test-gitea -R LiquidLogicLabs/git-action-tag-create-update --body "test-"
```

### For test-bitbucket environment (optional):

```bash
# Required if you want to test Bitbucket
echo "owner/repo" | gh secret set TEST_BITBUCKET_REPOSITORY -e test-bitbucket -R LiquidLogicLabs/git-action-tag-create-update
echo "your-bitbucket-token" | gh secret set TEST_BITBUCKET_TOKEN -e test-bitbucket -R LiquidLogicLabs/git-action-tag-create-update

# Optional
gh variable set TEST_BITBUCKET_BASE_URL -e test-bitbucket -R LiquidLogicLabs/git-action-tag-create-update --body "https://api.bitbucket.org/2.0"
gh variable set TEST_TAG_PREFIX -e test-bitbucket -R LiquidLogicLabs/git-action-tag-create-update --body "test-"
```

## Option 3: Using the Helper Script

The helper script `scripts/setup-test-secrets.sh` can be used after environments are created:

```bash
# Set environment variables
export TEST_GITHUB_REPOSITORY="LiquidLogicLabs/git-action-tag-create-update"
export TEST_GITHUB_TOKEN="your-token"
export TEST_GITEA_REPOSITORY="owner/repo"  # optional
export TEST_GITEA_TOKEN="your-token"        # optional
# ... etc

# Run the script
./scripts/setup-test-secrets.sh
```

## Complete List of Secrets and Variables

### test-github environment

**Secrets:**
- `TEST_GITHUB_REPOSITORY` - Repository in `owner/repo` format (defaults to current repo if not set)
- `TEST_GITHUB_TOKEN` - GitHub token (defaults to GITHUB_TOKEN if not set)

**Variables:**
- `TEST_TAG_PREFIX` - Prefix for test tags (default: `test-`)
- `TEST_GITHUB_REPOSITORY_URL` - Repository URL (optional)

### test-gitea environment

**Secrets:**
- `TEST_GITEA_REPOSITORY` - Repository in `owner/repo` format (required for Gitea tests)
- `TEST_GITEA_TOKEN` - Gitea personal access token (required for Gitea tests)

**Variables:**
- `TEST_GITEA_BASE_URL` - Gitea API base URL (optional, defaults to `https://gitea.com/api/v1`)
- `TEST_TAG_PREFIX` - Prefix for test tags (default: `test-`)

### test-bitbucket environment

**Secrets:**
- `TEST_BITBUCKET_REPOSITORY` - Repository in `owner/repo` format (required for Bitbucket tests)
- `TEST_BITBUCKET_TOKEN` - Bitbucket app password or token (required for Bitbucket tests)

**Variables:**
- `TEST_BITBUCKET_BASE_URL` - Bitbucket API base URL (optional, defaults to `https://api.bitbucket.org/2.0`)
- `TEST_TAG_PREFIX` - Prefix for test tags (default: `test-`)

## Verification

After setting up, you can verify the environments and secrets exist:

```bash
# List environments
gh api /repos/LiquidLogicLabs/git-action-tag-create-update/environments

# List secrets for an environment
gh secret list -e test-github -R LiquidLogicLabs/git-action-tag-create-update

# List variables for an environment  
gh variable list -e test-github -R LiquidLogicLabs/git-action-tag-create-update
```

## Notes

- Environments are automatically created when first referenced in a workflow run
- If secrets are not set, tests will gracefully skip (for Gitea/Bitbucket) or use defaults (for GitHub)
- The `TEST_TAG_PREFIX` variable has a default value of `test-` in the workflow, so it's optional
