import * as core from '@actions/core';
import { getInputs } from './config';
import { Logger } from './logger';
import { getRepositoryInfo } from './platform-detector';
import { isGitRepository, getHeadSha, createTag, pushTag } from './git';
import { GitHubAPI } from './platforms/github';
import { GiteaAPI } from './platforms/gitea';
import { BitbucketAPI } from './platforms/bitbucket';
import { GenericGitAPI } from './platforms/generic';
import { PlatformAPI, TagOptions, RepoType } from './types';

/**
 * Create platform API instance
 */
function createPlatformAPI(
  repoType: RepoType,
  repoInfo: { owner: string; repo: string; platform: RepoType },
  config: {
    token?: string;
    baseUrl?: string;
    ignoreCertErrors: boolean;
    verbose: boolean;
    pushTag?: boolean;
  },
  logger: Logger
): PlatformAPI {
  const platformConfig = {
    type: repoType,
    baseUrl: config.baseUrl,
    token: config.token,
    ignoreCertErrors: config.ignoreCertErrors,
    verbose: config.verbose,
    pushTag: config.pushTag
  };

  switch (repoType) {
    case 'github':
      return new GitHubAPI(repoInfo, platformConfig, logger);
    case 'gitea':
      return new GiteaAPI(repoInfo, platformConfig, logger);
    case 'bitbucket':
      return new BitbucketAPI(repoInfo, platformConfig, logger);
    case 'generic':
    default:
      return new GenericGitAPI(repoInfo, platformConfig, logger);
  }
}

/**
 * Main action function
 */
async function run(): Promise<void> {
  try {
    // Get and validate inputs
    const inputs = getInputs();
    const logger = new Logger(inputs.verbose);

    logger.info(`Creating/updating tag: ${inputs.tagName}`);
    
    // Log all inputs when verbose is enabled
    if (inputs.verbose) {
      logger.debug('=== INPUTS ===');
      logger.debug(`tag_name: ${inputs.tagName}`);
      logger.debug(`tag_sha: ${inputs.tagSha || 'undefined (will use HEAD)'}`);
      if (inputs.tagMessage === undefined) {
        logger.debug(`tag_message: undefined (will create lightweight tag)`);
      } else {
        const msgLength = inputs.tagMessage.length;
        const msgPreview = inputs.tagMessage.length > 100 
          ? inputs.tagMessage.substring(0, 100) + '...' 
          : inputs.tagMessage;
        logger.debug(`tag_message: length=${msgLength}, preview="${msgPreview.replace(/\n/g, '\\n')}"`);
      }
      logger.debug(`repository: ${inputs.repository || 'undefined (will use current repo)'}`);
      logger.debug(`token: ${inputs.token ? '*** (set)' : 'undefined'}`);
      logger.debug(`repo_type: ${inputs.repoType}`);
      logger.debug(`base_url: ${inputs.baseUrl || 'undefined (will auto-detect)'}`);
      logger.debug(`update_existing: ${inputs.updateExisting}`);
      logger.debug(`gpg_sign: ${inputs.gpgSign}`);
      logger.debug(`gpg_key_id: ${inputs.gpgKeyId || 'undefined'}`);
      logger.debug(`ignore_cert_errors: ${inputs.ignoreCertErrors}`);
      logger.debug(`force: ${inputs.force}`);
      logger.debug(`push_tag: ${inputs.pushTag}`);
      logger.debug(`git_user_name: ${inputs.gitUserName || 'undefined (will auto-detect)'}`);
      logger.debug(`git_user_email: ${inputs.gitUserEmail || 'undefined (will auto-detect)'}`);
      logger.debug(`verbose: ${inputs.verbose}`);
    }

    // Get repository information
    const repoInfo = await getRepositoryInfo(
      inputs.repository,
      inputs.repoType,
      logger
    );

    // Determine if we should use local Git or platform API
    const useLocalGit = await isGitRepository(logger);
    const usePlatformAPI = !useLocalGit || repoInfo.platform !== 'generic';

    if (inputs.verbose) {
      logger.debug('=== REPOSITORY INFO ===');
      logger.debug(`owner: ${repoInfo.owner}`);
      logger.debug(`repo: ${repoInfo.repo}`);
      logger.debug(`platform: ${repoInfo.platform}`);
      logger.debug(`url: ${repoInfo.url || 'undefined'}`);
      logger.debug(`useLocalGit: ${useLocalGit}`);
      logger.debug(`usePlatformAPI: ${usePlatformAPI}`);
    } else {
      logger.debug(`Use local Git: ${useLocalGit}, Use platform API: ${usePlatformAPI}`);
    }

    // Get SHA to tag
    let sha = inputs.tagSha;
    if (!sha) {
      if (useLocalGit) {
        sha = await getHeadSha(logger);
      } else {
        throw new Error(
          'tag_sha is required when not running in a local Git repository'
        );
      }
    }

    // Prepare tag options
    const tagOptions: TagOptions = {
      tagName: inputs.tagName,
      sha,
      message: inputs.tagMessage,
      gpgSign: inputs.gpgSign,
      gpgKeyId: inputs.gpgKeyId,
      force: inputs.force,
      verbose: inputs.verbose,
      gitUserName: inputs.gitUserName,
      gitUserEmail: inputs.gitUserEmail
    };

    // Log tag options when verbose is enabled
    if (inputs.verbose) {
      logger.debug('=== TAG OPTIONS ===');
      logger.debug(`tagName: ${tagOptions.tagName}`);
      logger.debug(`sha: ${sha}`);
      logger.debug(`message: ${tagOptions.message === undefined ? 'undefined (lightweight tag)' : `length=${tagOptions.message.length} (annotated tag)`}`);
      logger.debug(`gpgSign: ${tagOptions.gpgSign}`);
      logger.debug(`gpgKeyId: ${tagOptions.gpgKeyId || 'undefined'}`);
      logger.debug(`force: ${tagOptions.force}`);
      logger.debug(`gitUserName: ${tagOptions.gitUserName || 'undefined'}`);
      logger.debug(`gitUserEmail: ${tagOptions.gitUserEmail || 'undefined'}`);
    }

    let result;

    if (useLocalGit && !usePlatformAPI) {
      // Use local Git CLI directly
      logger.info('Using local Git CLI');
      result = await createTag(tagOptions, logger);

      // Push to remote if push_tag is enabled and we have a remote configured
      if (inputs.pushTag && repoInfo.url) {
        try {
          logger.info(`Pushing tag ${inputs.tagName} to remote`);
          await pushTag(
            inputs.tagName,
            'origin',
            inputs.token,
            inputs.force,
            logger
          );
          logger.info(`Tag ${inputs.tagName} pushed successfully`);
        } catch (error) {
          logger.warning(`Failed to push tag: ${error}`);
        }
      } else if (!inputs.pushTag) {
        logger.debug('push_tag is false, skipping tag push');
      }
    } else {
      // Use platform API
      logger.info(`Using ${repoInfo.platform} API`);

      // Determine base URL for platform
      let baseUrl = inputs.baseUrl;
      if (!baseUrl) {
        switch (repoInfo.platform) {
          case 'github':
            baseUrl = 'https://api.github.com';
            break;
          case 'gitea':
            // For Gitea, try to detect from repository URL first
            if (repoInfo.url) {
              try {
                const url = new URL(repoInfo.url);
                baseUrl = `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}/api/v1`;
                logger.debug(`Detected Gitea base URL from repository URL: ${baseUrl}`);
              } catch (error) {
                // If URL parsing fails, fall through to environment variable checks
                logger.debug(`Failed to parse repository URL: ${repoInfo.url}, will try environment variables`);
              }
            }
            
            // If not set from repository URL, try environment variables
            if (!baseUrl) {
              // GITHUB_SERVER_URL is provided by both GitHub Actions and Gitea Actions
              const serverUrl = process.env.GITHUB_SERVER_URL || process.env.GITEA_SERVER_URL || process.env.GITEA_API_URL;
              if (serverUrl) {
                baseUrl = `${serverUrl.replace(/\/$/, '')}/api/v1`;
                logger.debug(`Using Gitea base URL from environment: ${baseUrl}`);
              } else {
                baseUrl = 'https://gitea.com/api/v1';
                logger.debug('Using default Gitea base URL: https://gitea.com/api/v1');
              }
            }
            break;
          case 'bitbucket':
            baseUrl = 'https://api.bitbucket.org/2.0';
            break;
        }
      }

      const platformAPI = createPlatformAPI(
        repoInfo.platform,
        repoInfo,
        {
          token: inputs.token,
          baseUrl,
          ignoreCertErrors: inputs.ignoreCertErrors,
          verbose: inputs.verbose,
          pushTag: inputs.pushTag
        },
        logger
      );

      // Check if tag exists
      const exists = await platformAPI.tagExists(inputs.tagName);

      if (exists && !inputs.updateExisting) {
        // Tag exists and we're not updating
        logger.info(`Tag ${inputs.tagName} already exists`);
        result = {
          tagName: inputs.tagName,
          sha,
          exists: true,
          created: false,
          updated: false
        };
      } else if (exists && inputs.updateExisting) {
        // Tag exists and we should update it
        logger.info(`Updating existing tag: ${inputs.tagName}`);
        result = await platformAPI.updateTag(tagOptions);
      } else {
        // Tag doesn't exist, create it
        logger.info(`Creating new tag: ${inputs.tagName}`);
        result = await platformAPI.createTag(tagOptions);
      }
    }

    // Set outputs
    core.setOutput('tag_name', result.tagName);
    core.setOutput('tag_sha', result.sha);
    core.setOutput('tag_exists', result.exists.toString());
    core.setOutput('tag_updated', result.updated.toString());
    core.setOutput('tag_created', result.created.toString());
    core.setOutput('platform', repoInfo.platform);

    // Log all outputs when verbose is enabled
    if (inputs.verbose) {
      logger.debug('=== OUTPUTS ===');
      logger.debug(`tag_name: ${result.tagName}`);
      logger.debug(`tag_sha: ${result.sha}`);
      logger.debug(`tag_exists: ${result.exists}`);
      logger.debug(`tag_updated: ${result.updated}`);
      logger.debug(`tag_created: ${result.created}`);
      logger.debug(`platform: ${repoInfo.platform}`);
    }

    logger.info('Action completed successfully');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('Unknown error occurred');
    }
  }
}

// Run the action
run();

