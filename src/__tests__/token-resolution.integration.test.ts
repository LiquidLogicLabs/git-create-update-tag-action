import { resolveToken } from '../config';
import { getRepositoryInfo } from '../platform-detector';
import { Logger } from '../logger';

describe('Token Resolution Integration Tests', () => {
  const originalEnv = process.env;
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    logRequest: jest.fn(),
    logResponse: jest.fn(),
    logGitCommand: jest.fn(),
    logVerbose: jest.fn()
  } as unknown as Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Clear all token environment variables
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITEA_TOKEN;
    delete process.env.BITBUCKET_TOKEN;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITEA_REPOSITORY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GitHub platform token resolution', () => {
    it('should resolve GITHUB_TOKEN when repository is GitHub and token is blank', async () => {
      process.env.GITHUB_TOKEN = 'github-token-123';
      process.env.GITHUB_REPOSITORY = 'owner/repo';

      const repoInfo = await getRepositoryInfo(undefined, 'auto', mockLogger);
      const resolvedToken = resolveToken(undefined, repoInfo.platform);

      expect(repoInfo.platform).toBe('github');
      expect(resolvedToken).toBe('github-token-123');
    });

    it('should use explicit token over GITHUB_TOKEN', async () => {
      process.env.GITHUB_TOKEN = 'github-token-123';
      process.env.GITHUB_REPOSITORY = 'owner/repo';

      const repoInfo = await getRepositoryInfo(undefined, 'auto', mockLogger);
      const resolvedToken = resolveToken('explicit-token', repoInfo.platform);

      expect(repoInfo.platform).toBe('github');
      expect(resolvedToken).toBe('explicit-token');
    });

    it('should return undefined if GITHUB_TOKEN not set', async () => {
      process.env.GITHUB_REPOSITORY = 'owner/repo';

      const repoInfo = await getRepositoryInfo(undefined, 'auto', mockLogger);
      const resolvedToken = resolveToken(undefined, repoInfo.platform);

      expect(repoInfo.platform).toBe('github');
      expect(resolvedToken).toBeUndefined();
    });
  });

  describe('Gitea platform token resolution', () => {
    it('should resolve GITEA_TOKEN when repository is Gitea and token is blank', async () => {
      process.env.GITEA_TOKEN = 'gitea-token-123';
      process.env.GITEA_REPOSITORY = 'owner/repo';

      const repoInfo = await getRepositoryInfo(undefined, 'gitea', mockLogger);
      const resolvedToken = resolveToken(undefined, repoInfo.platform);

      expect(repoInfo.platform).toBe('gitea');
      expect(resolvedToken).toBe('gitea-token-123');
    });

    it('should fallback to GITHUB_TOKEN for Gitea if GITEA_TOKEN not set', async () => {
      process.env.GITHUB_TOKEN = 'github-token-123';
      process.env.GITEA_REPOSITORY = 'owner/repo';

      const repoInfo = await getRepositoryInfo(undefined, 'gitea', mockLogger);
      const resolvedToken = resolveToken(undefined, repoInfo.platform);

      expect(repoInfo.platform).toBe('gitea');
      expect(resolvedToken).toBe('github-token-123');
    });

    it('should prefer GITEA_TOKEN over GITHUB_TOKEN for Gitea', async () => {
      process.env.GITEA_TOKEN = 'gitea-token-123';
      process.env.GITHUB_TOKEN = 'github-token-123';
      process.env.GITEA_REPOSITORY = 'owner/repo';

      const repoInfo = await getRepositoryInfo(undefined, 'gitea', mockLogger);
      const resolvedToken = resolveToken(undefined, repoInfo.platform);

      expect(repoInfo.platform).toBe('gitea');
      expect(resolvedToken).toBe('gitea-token-123');
    });
  });

  describe('Bitbucket platform token resolution', () => {
    it('should resolve BITBUCKET_TOKEN when repository is Bitbucket and token is blank', async () => {
      process.env.BITBUCKET_TOKEN = 'bitbucket-token-123';

      const repoInfo = await getRepositoryInfo('https://bitbucket.org/owner/repo', 'auto', mockLogger);
      const resolvedToken = resolveToken(undefined, repoInfo.platform);

      expect(repoInfo.platform).toBe('bitbucket');
      expect(resolvedToken).toBe('bitbucket-token-123');
    });

    it('should return undefined if BITBUCKET_TOKEN not set', async () => {
      const repoInfo = await getRepositoryInfo('https://bitbucket.org/owner/repo', 'auto', mockLogger);
      const resolvedToken = resolveToken(undefined, repoInfo.platform);

      expect(repoInfo.platform).toBe('bitbucket');
      expect(resolvedToken).toBeUndefined();
    });
  });

  describe('Generic platform token resolution', () => {
    it('should try common tokens for generic platform', async () => {
      process.env.GITHUB_TOKEN = 'github-token-123';

      const repoInfo = await getRepositoryInfo('https://example.com/owner/repo', 'generic', mockLogger);
      const resolvedToken = resolveToken(undefined, repoInfo.platform);

      expect(repoInfo.platform).toBe('generic');
      expect(resolvedToken).toBe('github-token-123');
    });

    it('should check tokens in order for generic platform', async () => {
      process.env.GITHUB_TOKEN = 'github-token-123';
      process.env.GITEA_TOKEN = 'gitea-token-123';
      process.env.BITBUCKET_TOKEN = 'bitbucket-token-123';

      const repoInfo = await getRepositoryInfo('https://example.com/owner/repo', 'generic', mockLogger);
      const resolvedToken = resolveToken(undefined, repoInfo.platform);

      expect(repoInfo.platform).toBe('generic');
      // Should prefer GITHUB_TOKEN first
      expect(resolvedToken).toBe('github-token-123');
    });
  });

  describe('Token resolution with explicit repository input', () => {
    it('should resolve token based on detected platform from repository URL', async () => {
      process.env.GITHUB_TOKEN = 'github-token-123';

      const repoInfo = await getRepositoryInfo('https://github.com/owner/repo', 'auto', mockLogger);
      const resolvedToken = resolveToken(undefined, repoInfo.platform);

      expect(repoInfo.platform).toBe('github');
      expect(resolvedToken).toBe('github-token-123');
    });

    it('should resolve Gitea token when repository URL is Gitea with explicit repo_type', async () => {
      process.env.GITEA_TOKEN = 'gitea-token-123';

      const repoInfo = await getRepositoryInfo('https://git.ravenwolf.org/owner/repo', 'gitea', mockLogger);
      const resolvedToken = resolveToken(undefined, repoInfo.platform);

      expect(repoInfo.platform).toBe('gitea');
      expect(resolvedToken).toBe('gitea-token-123');
    });
  });
});

