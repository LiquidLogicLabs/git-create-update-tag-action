import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as exec from '@actions/exec';
import { getExecOutput } from '@actions/exec';
import { createTag } from '../git';
import { Logger } from '../logger';

describe('createTag Integration Tests', () => {
  let tempDir: string;
  let originalCwd: string;
  let logger: Logger;

  beforeEach(async () => {
    // Create a temporary directory for the test repository
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-tag-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Initialize a git repository
    await exec.exec('git', ['init'], { silent: true });
    await exec.exec('git', ['config', 'user.name', 'Test User'], { silent: true });
    await exec.exec('git', ['config', 'user.email', 'test@example.com'], { silent: true });

    // Create an initial commit
    fs.writeFileSync(path.join(tempDir, 'test.txt'), 'test content');
    await exec.exec('git', ['add', 'test.txt'], { silent: true });
    await exec.exec('git', ['commit', '-m', 'Initial commit'], { silent: true });

    logger = new Logger(true);
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should create annotated tag with message using -F -', async () => {
    const commitSha = (await getExecOutput('git', ['rev-parse', 'HEAD'], { silent: true })).stdout.trim();
    const tagMessage = 'Test tag message\n\nWith multiple lines';

    const result = await createTag(
      {
        tagName: 'v1.0.0',
        sha: commitSha,
        message: tagMessage,
        gpgSign: false,
        force: false,
        verbose: true
      },
      logger
    );

    expect(result.created).toBe(true);
    expect(result.tagName).toBe('v1.0.0');

    // Verify tag exists
    const tagExists = (await getExecOutput('git', ['rev-parse', '--verify', 'refs/tags/v1.0.0'], { silent: true })).exitCode === 0;
    expect(tagExists).toBe(true);

    // Verify tag message
    const tagMessageOutput = (await getExecOutput('git', ['tag', '-l', '--format=%(contents)', 'v1.0.0'], { silent: true })).stdout.trim();
    expect(tagMessageOutput).toBe(tagMessage);
  });

  it('should create lightweight tag without message', async () => {
    const commitSha = (await getExecOutput('git', ['rev-parse', 'HEAD'], { silent: true })).stdout.trim();

    const result = await createTag(
      {
        tagName: 'v1.0.0-light',
        sha: commitSha,
        gpgSign: false,
        force: false,
        verbose: true
      },
      logger
    );

    expect(result.created).toBe(true);
    expect(result.tagName).toBe('v1.0.0-light');

    // Verify tag exists
    const tagExists = (await getExecOutput('git', ['rev-parse', '--verify', 'refs/tags/v1.0.0-light'], { silent: true })).exitCode === 0;
    expect(tagExists).toBe(true);

    // Verify it's a lightweight tag (no message)
    const tagType = (await getExecOutput('git', ['cat-file', '-t', 'v1.0.0-light'], { silent: true })).stdout.trim();
    expect(tagType).toBe('commit'); // Lightweight tags point directly to commits
  });

  it('should handle empty message by creating lightweight tag', async () => {
    const commitSha = (await getExecOutput('git', ['rev-parse', 'HEAD'], { silent: true })).stdout.trim();

    const result = await createTag(
      {
        tagName: 'v1.0.0-empty',
        sha: commitSha,
        message: '',
        gpgSign: false,
        force: false,
        verbose: true
      },
      logger
    );

    expect(result.created).toBe(true);

    // Verify tag exists
    const tagExists = (await getExecOutput('git', ['rev-parse', '--verify', 'refs/tags/v1.0.0-empty'], { silent: true })).exitCode === 0;
    expect(tagExists).toBe(true);

    // Verify it's a lightweight tag
    const tagType = (await getExecOutput('git', ['cat-file', '-t', 'v1.0.0-empty'], { silent: true })).stdout.trim();
    expect(tagType).toBe('commit');
  });

  it('should handle whitespace-only message by creating lightweight tag', async () => {
    const commitSha = (await getExecOutput('git', ['rev-parse', 'HEAD'], { silent: true })).stdout.trim();

    const result = await createTag(
      {
        tagName: 'v1.0.0-whitespace',
        sha: commitSha,
        message: '   \n\t  \n',
        gpgSign: false,
        force: false,
        verbose: true
      },
      logger
    );

    expect(result.created).toBe(true);

    // Verify tag exists
    const tagExists = (await getExecOutput('git', ['rev-parse', '--verify', 'refs/tags/v1.0.0-whitespace'], { silent: true })).exitCode === 0;
    expect(tagExists).toBe(true);

    // Verify it's a lightweight tag
    const tagType = (await getExecOutput('git', ['cat-file', '-t', 'v1.0.0-whitespace'], { silent: true })).stdout.trim();
    expect(tagType).toBe('commit');
  });

  it('should create tag at specific commit SHA', async () => {
    // Create another commit
    fs.writeFileSync(path.join(tempDir, 'test2.txt'), 'test content 2');
    await exec.exec('git', ['add', 'test2.txt'], { silent: true });
    await exec.exec('git', ['commit', '-m', 'Second commit'], { silent: true });

    const firstCommitSha = (await getExecOutput('git', ['rev-parse', 'HEAD~1'], { silent: true })).stdout.trim();

    const result = await createTag(
      {
        tagName: 'v1.0.0-sha',
        sha: firstCommitSha,
        message: 'Tag at first commit',
        gpgSign: false,
        force: false,
        verbose: true
      },
      logger
    );

    expect(result.created).toBe(true);

    // Verify tag points to the correct commit (use ^{commit} to get commit SHA from annotated tag)
    const tagSha = (await getExecOutput('git', ['rev-parse', 'v1.0.0-sha^{commit}'], { silent: true })).stdout.trim();
    expect(tagSha).toBe(firstCommitSha);
  });
});

