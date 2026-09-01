import { execSync } from 'node:child_process';

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const sourceBranch = process.env.SOURCE_BRANCH || getCurrentBranch();
const baseBranch = process.env.BASE_BRANCH || 'main';
const dryRun = process.env.DRY_RUN === 'true' || !token;

function getCurrentBranch() {
  return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
}

function run(command) {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function parseRepo(repo) {
  const [owner, name] = repo.split('/');
  return { owner, name };
}

function sanitizeTitle(value) {
  return value
    .replace(/^merge\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCommitSummary() {
  try {
    const commits = run(`git log --no-merges --pretty=format:%s origin/${baseBranch}..HEAD`);
    const lines = commits
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return ['Feature updates'];
    }

    return lines.slice(0, 5);
  } catch {
    return ['Feature updates'];
  }
}

function getChangedFiles() {
  try {
    const files = run(`git diff --name-only origin/${baseBranch}...HEAD`);
    return files
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 10);
  } catch {
    return [];
  }
}

function getTitle() {
  const summary = getCommitSummary()[0] || 'feature updates';
  const cleaned = sanitizeTitle(summary);

  if (sourceBranch === 'dev' || sourceBranch === 'development') {
    return `Merge ${sourceBranch} into ${baseBranch}: ${cleaned}`;
  }

  return `Merge ${sourceBranch} into ${baseBranch}: ${cleaned}`;
}

function getBody() {
  const commits = getCommitSummary();
  const files = getChangedFiles();

  const changes = commits.map((item) => `- ${item}`).join('\n');
  const touchedFiles = files.length > 0 ? files.map((item) => `- ${item}`).join('\n') : '- No file list captured';

  return `## Summary\n\nThis pull request was created automatically from branch ${sourceBranch} into ${baseBranch}.\n\n## What changed\n\n${changes}\n\n## Files touched\n\n${touchedFiles}\n\n## Review notes\n\nPlease review the changes and merge when ready.`;
}

async function githubRequest(path, options = {}) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'auto-pr-agent',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }

  return data;
}

async function main() {
  if (!repository) {
    throw new Error('GITHUB_REPOSITORY is required');
  }

  const { owner, name } = parseRepo(repository);

  if (sourceBranch === baseBranch) {
    console.log(`Skipping PR creation because ${sourceBranch} is the same as ${baseBranch}`);
    return;
  }

  if (dryRun) {
    console.log('Dry run mode: PR creation skipped because no GitHub token was provided.');
    console.log(`Title: ${getTitle()}`);
    console.log('---');
    console.log(getBody());
    return;
  }

  const existing = await githubRequest(
    `/repos/${owner}/${name}/pulls?state=open&head=${owner}:${sourceBranch}&base=${baseBranch}`
  );

  const title = getTitle();
  const body = getBody();

  if (existing.length > 0) {
    const pr = existing[0];
    await githubRequest(`/repos/${owner}/${name}/pulls/${pr.number}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, body }),
    });

    console.log(`Updated PR #${pr.number}`);
    return;
  }

  const created = await githubRequest(`/repos/${owner}/${name}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      head: sourceBranch,
      base: baseBranch,
      body,
    }),
  });

  await githubRequest(`/repos/${owner}/${name}/issues/${created.number}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      body: 'Pull request created automatically by the repository automation workflow.',
    }),
  });

  console.log(`Created PR #${created.number}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
