import { http, HttpResponse, passthrough } from 'msw'

const GITHUB_BASE_URL = 'https://api.github.com'
const AZURE_BASE_URL = 'https://dev.azure.com'
const GITLAB_API_BASE = 'https://gitlab.com/api/v4' // Default GitLab API base

const VALID_TOKEN = 'VALID_TOKEN' // Example token for GitHub
const VALID_AZURE_TOKEN = 'VALID_AZURE_PAT' // Example PAT for Azure
const VALID_GITLAB_TOKEN = 'VALID_GITLAB_PAT' // Example PAT for GitLab

// --- GitHub Mock Data ---
const mockGitHubUser = { login: 'testuser', id: 1, name: 'Test User', email: 'testuser@example.com' };
const mockGitHubRepos = [
  { id: 1, name: 'repo1', full_name: 'testuser/repo1', owner: mockGitHubUser, default_branch: 'main', description: 'Test repo 1', html_url: 'https://github.com/testuser/repo1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), visibility: 'public', size: 1024 },
];
const mockBranch = (name: string, sha: string, isProtected: boolean = false) => ({
  name,
  commit: { sha, url: `${GITHUB_BASE_URL}/repos/testowner/testrepo/commits/${sha}` },
  protected: isProtected,
});
const mockCommitDetails = (sha: string, authorName?: string, authorEmail?: string) => {
  console.log(`[MSW_MOCK_FN] mockCommitDetails called with: sha=${sha}, authorName=${authorName}, authorEmail=${authorEmail}`);
  return {
    sha,
    commit: {
      author: { name: authorName || 'Test Author', email: authorEmail || 'testauthor@example.com', date: new Date().toISOString() },
      committer: { name: authorName || 'Test Committer', email: authorEmail || 'testcommitter@example.com', date: new Date().toISOString() },
      message: 'Test commit message',
    },
    html_url: `${GITHUB_BASE_URL}/repos/testowner/testrepo/commits/${sha}`,
    stats: { additions: 10, deletions: 5, total: 15 },
    files: [{ filename: 'test.ts', additions: 10, deletions: 5, changes: 15, status: 'modified' }],
  };
};
const mockPipelineRun = (id: number, status: string, conclusion: string | null, head_branch: string = 'main') => ({
  id,
  name: `Pipeline Run ${id}`,
  status,
  conclusion,
  head_branch,
  head_sha: `sha-${id}`,
  html_url: `${GITHUB_BASE_URL}/repos/testowner/testrepo/actions/runs/${id}`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  workflow_id: 123,
});
const mockContributor = (id: number, login: string) => ({
  id,
  login,
  avatar_url: `https://avatars.githubusercontent.com/u/${id}?v=4`,
  html_url: `https://github.com/${login}`,
  contributions: 5,
  email: `${login}@example.com`,
  name: login,
});
const mockFileContent = (path: string, type: 'file' | 'dir' = 'file') => ({
  name: path.split('/').pop(),
  path,
  sha: `sha-${path}`,
  size: type === 'file' ? 100 : 0,
  type,
  html_url: `${GITHUB_BASE_URL}/repos/testowner/testrepo/contents/${path}`,
  download_url: type === 'file' ? `${GITHUB_BASE_URL}/repos/testowner/testrepo/contents/${path}?raw=true` : null,
  last_modified: new Date().toISOString(),
});
const mockPullRequest = (id: number, state: 'open' | 'closed' | 'merged' = 'open', headRef: string = 'feature-branch', baseRef: string = 'main', createdAtOverride?: string) => {
  const now = new Date();
  const createdAt = new Date(now.setDate(now.getDate() - 2)).toISOString();
  const updatedAt = new Date(now.setDate(now.getDate() - 1)).toISOString();
  let mergedAt = null;
  let closedAt = null;
  if (state === 'merged') {
    mergedAt = new Date().toISOString();
    closedAt = mergedAt;
  } else if (state === 'closed') {
    closedAt = new Date().toISOString();
  }
  return {
    id,
    number: id, // GitHub uses 'number', GitLab uses 'iid' for MRs often, but service maps to 'id'
    title: `Test Pull Request #${id}`,
    body: 'This is a test PR.',
    state: state === 'merged' ? 'closed' : state,
    user: mockGitHubUser, // Generic user, adapt if GitLab user mock is different
    created_at: createdAtOverride || createdAt,
    updated_at: updatedAt,
    closed_at: closedAt,
    merged_at: mergedAt,
    head: { ref: headRef, sha: `sha-head-${id}`, repo: mockGitHubRepos[0] }, // Adapt for GitLab structure
    base: { ref: baseRef, sha: `sha-base-${id}`, repo: mockGitHubRepos[0] }, // Adapt for GitLab structure
    html_url: `${GITHUB_BASE_URL}/repos/testowner/testrepo/pulls/${id}`, // Adapt for GitLab
    requested_reviewers: [mockGitHubUser], // Adapt for GitLab
    labels: [{ name: 'bug' }, { name: 'enhancement' }], // Adapt for GitLab
    draft: false,
    comments: 5,
    review_comments: 2,
    additions: 100,
    deletions: 50,
    changed_files: 3,
    merged: state === 'merged',
    mergeable: state === 'open' ? true : null,
    mergeable_state: state === 'open' ? 'clean' : 'unknown',
  };
};
const mockReview = (id: number, submitted_at: string) => ({
  id,
  user: mockGitHubUser,
  body: 'This is a review comment.',
  state: 'COMMENTED',
  submitted_at,
  commit_id: `sha-review-${id}`,
});

// --- Azure DevOps Mock Data ---
const mockAzureProject = (id: string, name: string) => ({ id, name, description: `Description for ${name}`, url: `${AZURE_BASE_URL}/test-org/${id}`, state: 'wellFormed', visibility: 'private', lastUpdateTime: new Date().toISOString(), revision: 1, });
const mockAzureProjects = { count: 2, value: [mockAzureProject('project1', 'Project Alpha'), mockAzureProject('project2', 'Project Beta')] };
const mockAzureRepo = (id: string, name: string, projectId: string, projectName: string) => ({ id, name, description: `Description for ${name}`, webUrl: `${AZURE_BASE_URL}/test-org/${projectId}/_git/${name}`, defaultBranch: 'refs/heads/main', size: 12345, project: { id: projectId, name: projectName, visibility: 'private' }, lastUpdateTime: new Date().toISOString(), });
const mockAzureCommit = (commitId: string, comment: string, authorName: string, authorEmail: string) => ({ commitId, comment, author: { name: authorName, email: authorEmail, date: new Date().toISOString() }, remoteUrl: `${AZURE_BASE_URL}/test-org/project1/_git/repo1/commit/${commitId}`, changeCounts: { Add: 10, Delete: 5 }, });
const mockAzurePipeline = (id: number, status: string, result: string | null, sourceBranch: string = 'main') => ({ id, status, result, sourceBranch: `refs/heads/${sourceBranch}`, sourceVersion: `sha-${id}`, _links: { web: { href: `${AZURE_BASE_URL}/test-org/project1/_build/results?buildId=${id}` } }, startTime: new Date().toISOString(), finishTime: status === 'completed' ? new Date().toISOString() : undefined, queueTime: new Date().toISOString(), });
const mockAzureBranchRef = (name: string, objectId: string) => ({ name: `refs/heads/${name}`, objectId: objectId, isLocked: false, commit: { commitId: objectId, committer: { name: 'Test User', email: 'testuser@example.com', date: new Date().toISOString() }, comment: `Commit for branch ${name}` } });
const mockAzureItem = (path: string, gitObjectType: 'blob' | 'tree', size: number = 0) => ({ path, gitObjectType, size: gitObjectType === 'blob' ? size || 100 : 0, lastModifiedDate: new Date().toISOString(), url: `${AZURE_BASE_URL}/test-org/project1/_apis/git/repositories/repo1/items?path=${path}` });
const mockAzurePullRequest = (pullRequestId: number, title: string, status: string = 'active', mergeStatus: string = 'succeeded') => ({ pullRequestId, title, description: `Description for PR ${pullRequestId}`, status, mergeStatus, creationDate: new Date().toISOString(), closedDate: status === 'completed' ? new Date().toISOString() : undefined, createdBy: { id: 'user1', displayName: 'Azure User 1', uniqueName: 'user1@example.com' }, reviewers: [{ id: 'user2', displayName: 'Azure User 2', uniqueName: 'user2@example.com' }], sourceRefName: 'refs/heads/feature/new-stuff', targetRefName: 'refs/heads/main', isDraft: false, labels: [{ name: 'bug' }, { name: 'ui' }], lastMergeSourceCommit: { changeCounts: { Add: 20, Delete: 3, Edit: 5 } } });
const mockAzureThread = (id: number, status: 'active' | 'closed' = 'active', commentCount: number = 1) => ({ id, status, comments: Array.from({ length: commentCount }, (_, i) => ({ id: i + 1, content: `Comment ${i + 1}`, publishedDate: new Date().toISOString() })) });

// --- GitLab Mock Data ---
const mockGitLabUser = (id: number, username: string) => ({ id, username, name: username.charAt(0).toUpperCase() + username.slice(1) });
const mockGitLabProject = (id: number, name: string) => ({ id, name, description: `Description for ${name}`, web_url: `https://gitlab.com/test-group/${name}`, default_branch: 'main', last_activity_at: new Date().toISOString() });
const mockGitLabBranch = (name: string, commitId: string) => ({ name, protected: false, commit: { id: commitId, message: `Commit for ${name}`, author_name: 'GitLab User', committed_date: new Date().toISOString() } });
const mockGitLabCommit = (id: string, title: string, authorName: string, authorEmail: string) => ({ id, title, message: title, author_name: authorName, author_email: authorEmail, created_at: new Date().toISOString(), web_url: `https://gitlab.com/test-group/test-project/commit/${id}`, stats: { additions: 5, deletions: 2 } });
const mockGitLabPipeline = (id: number, status: string, ref: string = 'main') => ({ id, status, ref, sha: `sha-pipeline-${id}`, web_url: `https://gitlab.com/test-group/test-project/pipelines/${id}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const mockGitLabFile = (path: string, type: 'blob' | 'tree', last_commit_at?: string) => ({ name: path.split('/').pop(), path, type, id: `fid-${path}`, last_commit_at: last_commit_at || new Date().toISOString() });
const mockGitLabMergeRequest = (id: number, iid: number, title: string, state: 'opened' | 'closed' | 'merged' = 'opened') => ({
  id, iid, title, description: `Description for MR ${iid}`, state,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  merged_at: state === 'merged' ? new Date().toISOString() : null,
  closed_at: state === 'closed' || state === 'merged' ? new Date().toISOString() : null,
  author: { id: 1, name: 'GitLab Author', username: 'glauthor' },
  reviewers: [{ id: 2, name: 'GitLab Reviewer', username: 'glreviewer' }],
  source_branch: 'feature-branch', target_branch: 'main', work_in_progress: false,
  user_notes_count: 2, // Used for comments & reviewCount
  changes_count: "10", // Used for additions, deletions, changedFiles, locChanged
  labels: ['bugfix', 'frontend'],
});


// --- Helper for Auth ---
const checkAzureAuth = (request: Request) => { const authHeader = request.headers.get('Authorization'); return authHeader && authHeader.startsWith('Basic '); };
const checkGitLabAuth = (request: Request) => request.headers.get('PRIVATE-TOKEN') === VALID_GITLAB_TOKEN;

// --- Azure DevOps Handlers ---
export const azureHandlers = [
  http.get(`${AZURE_BASE_URL}/:organization/_apis/projects`, ({ params, request }) => { console.log(`[MSW AZURE] GET /${params.organization}/_apis/projects (validateToken or getProjects)`); if (!checkAzureAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' }); const apiVersion = new URL(request.url).searchParams.get('api-version'); if (apiVersion !== '6.0' && apiVersion !== '7.0') { return new Response(JSON.stringify({message: 'Invalid API version'}), {status: 400, statusText: 'Bad Request'}); } return new Response(JSON.stringify(mockAzureProjects), { status: 200, headers: { 'Content-Type': 'application/json' } }); }),
  http.get(`${AZURE_BASE_URL}/:organization/_apis/projects/:projectId`, ({ params, request }) => { console.log(`[MSW AZURE] GET /${params.organization}/_apis/projects/${params.projectId}`); if (!checkAzureAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' }); const project = mockAzureProjects.value.find(p => p.id === params.projectId); if (!project) return new Response(JSON.stringify({message: 'Project not found'}), {status: 404, statusText: 'Not Found'}); return new Response(JSON.stringify(project), { status: 200, headers: { 'Content-Type': 'application/json' } }); }),
  http.get(`${AZURE_BASE_URL}/:organization/_apis/git/repositories`, ({ params, request }) => { console.log(`[MSW AZURE] GET /${params.organization}/_apis/git/repositories`); if (!checkAzureAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' }); const repos = [mockAzureRepo('repo1', 'OrgRepo1', 'project1', 'Project Alpha')]; return new Response(JSON.stringify({ count: repos.length, value: repos }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }),
  http.get(`${AZURE_BASE_URL}/:organization/_apis/:projectId/git/repositories`, ({ params, request }) => { console.log(`[MSW AZURE] GET /${params.organization}/_apis/${params.projectId}/git/repositories`); if (!checkAzureAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' }); const repos = [mockAzureRepo('repo1', 'ProjectRepo1', params.projectId as string, 'Project Alpha')]; return new Response(JSON.stringify({ count: repos.length, value: repos }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }),
  http.get(`${AZURE_BASE_URL}/:organization/_apis/:projectId/git/repositories/:repoId/stats/branches`, ({ params, request }) => { console.log(`[MSW AZURE] GET /${params.organization}/_apis/${params.projectId}/git/repositories/${params.repoId}/stats/branches`); if (!checkAzureAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' }); const mockStats = { value: [{ name: 'main', aheadCount: 1, behindCount: 0, commit: { commitId: 'abc', committer: {name: 'N', email: 'e', date: 'd'}} }]}; return new Response(JSON.stringify(mockStats), { status: 200, headers: { 'Content-Type': 'application/json' } }); }),
  http.get(`${AZURE_BASE_URL}/:organization/:projectName/_apis/git/repositories/:repoId/commits`, ({ params, request }) => { console.log(`[MSW AZURE] GET /${params.organization}/${params.projectName}/_apis/git/repositories/${params.repoId}/commits`); if (!checkAzureAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' }); const commits = [mockAzureCommit('commit1', 'Initial commit', 'User A', 'a@a.com')]; return new Response(JSON.stringify({ count: commits.length, value: commits }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }),
  http.get(`${AZURE_BASE_URL}/:organization/:projectName/_apis/build/builds`, ({ params, request }) => { console.log(`[MSW AZURE] GET /${params.organization}/${params.projectName}/_apis/build/builds`); if (!checkAzureAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' }); const pipelines = [mockAzurePipeline(1, 'completed', 'succeeded')]; return new Response(JSON.stringify({ count: pipelines.length, value: pipelines }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }),
  http.get(`${AZURE_BASE_URL}/:organization/:projectName/_apis/git/repositories/:repoId/refs/heads`, ({ params, request }) => { console.log(`[MSW AZURE] GET /${params.organization}/${params.projectName}/_apis/git/repositories/${params.repoId}/refs/heads`); if (!checkAzureAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' }); const branches = [mockAzureBranchRef('main', 'main-sha'), mockAzureBranchRef('develop', 'dev-sha')]; return new Response(JSON.stringify({ count: branches.length, value: branches }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }),
  http.get(`${AZURE_BASE_URL}/:organization/:projectName/_apis/git/repositories/:repoId/items`, ({ params, request }) => { console.log(`[MSW AZURE] GET /${params.organization}/${params.projectName}/_apis/git/repositories/${params.repoId}/items`); if (!checkAzureAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' }); const items = [mockAzureItem('/file.ts', 'blob', 1024), mockAzureItem('/folder', 'tree')]; return new Response(JSON.stringify({ count: items.length, value: items }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }),
  http.get(`${AZURE_BASE_URL}/:organization/:projectName/_apis/git/repositories/:repoId/pullrequests`, ({ params, request }) => { console.log(`[MSW AZURE] GET /${params.organization}/${params.projectName}/_apis/git/repositories/${params.repoId}/pullrequests (LIST)`); if (!checkAzureAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' }); const prs = [mockAzurePullRequest(1, 'My First PR')]; return new Response(JSON.stringify({ count: prs.length, value: prs }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }),
  http.get(`${AZURE_BASE_URL}/:organization/:projectName/_apis/git/repositories/:repoId/pullrequests/:pullRequestId`, ({ params, request }) => { console.log(`[MSW AZURE] GET /${params.organization}/${params.projectName}/_apis/git/repositories/${params.repoId}/pullrequests/${params.pullRequestId} (DETAIL)`); if (!checkAzureAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' }); const prId = parseInt(params.pullRequestId as string); return new Response(JSON.stringify(mockAzurePullRequest(prId, `PR ${prId} Detail`)), { status: 200, headers: { 'Content-Type': 'application/json' } }); }),
  http.get(`${AZURE_BASE_URL}/:organization/:projectName/_apis/git/repositories/:repoId/pullrequests/:pullRequestId/threads`, ({ params, request }) => { console.log(`[MSW AZURE] GET /${params.organization}/${params.projectName}/_apis/git/repositories/${params.repoId}/pullrequests/${params.pullRequestId}/threads`); if (!checkAzureAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' }); const threads = [mockAzureThread(1), mockAzureThread(2, 'closed', 3)]; return new Response(JSON.stringify({ count: threads.length, value: threads }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }),
];

// --- GitLab Handlers ---
export const gitlabHandlers = [
  // /user
  http.get(`${GITLAB_API_BASE}/user`, ({ request }) => {
    console.log(`[MSW GITLAB] GET /user`);
    if (!checkGitLabAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' });
    return new Response(JSON.stringify(mockGitLabUser(1, 'testuser')), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }),

  // /projects (for getRepositories)
  http.get(`${GITLAB_API_BASE}/projects`, ({ request }) => {
    console.log(`[MSW GITLAB] GET /projects`);
    if (!checkGitLabAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' });
    // Basic check for common query params by the service
    const url = new URL(request.url);
    if (url.searchParams.get('membership') !== 'true' || !url.searchParams.has('order_by')) {
        return new Response(JSON.stringify({message: "Missing expected query params"}), { status: 400, statusText: 'Bad Request'});
    }
    const projects = [mockGitLabProject(101, 'ProjectX'), mockGitLabProject(102, 'ProjectY')];
    return new Response(JSON.stringify(projects), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }),

  // /projects/:projectId/repository/branches
  http.get(`${GITLAB_API_BASE}/projects/:projectId/repository/branches`, ({ params, request }) => {
    console.log(`[MSW GITLAB] GET /projects/${params.projectId}/repository/branches`);
    if (!checkGitLabAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' });
    const branches = [mockGitLabBranch('main', 'main-commit-sha'), mockGitLabBranch('develop', 'dev-commit-sha')];
    return new Response(JSON.stringify(branches), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }),

  // /projects/:projectId/repository/commits
  http.get(`${GITLAB_API_BASE}/projects/:projectId/repository/commits`, ({ params, request }) => {
    console.log(`[MSW GITLAB] GET /projects/${params.projectId}/repository/commits`);
    if (!checkGitLabAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' });
    const commits = [mockGitLabCommit('abc123efg', 'feat: new feature', 'User One', 'user1@example.com')];
    return new Response(JSON.stringify(commits), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }),

  // /projects/:projectId/pipelines
  http.get(`${GITLAB_API_BASE}/projects/:projectId/pipelines`, ({ params, request }) => {
    console.log(`[MSW GITLAB] GET /projects/${params.projectId}/pipelines`);
    if (!checkGitLabAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' });
    const pipelines = [mockGitLabPipeline(1, 'success'), mockGitLabPipeline(2, 'failed')];
    return new Response(JSON.stringify(pipelines), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }),

  // /projects/:projectId/repository/tree
  http.get(`${GITLAB_API_BASE}/projects/:projectId/repository/tree`, ({ params, request }) => {
    console.log(`[MSW GITLAB] GET /projects/${params.projectId}/repository/tree`);
    if (!checkGitLabAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' });
    const files = [mockGitLabFile('README.md', 'blob'), mockGitLabFile('src/', 'tree')];
    return new Response(JSON.stringify(files), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }),

  // /projects/:projectId/merge_requests (list)
  http.get(`${GITLAB_API_BASE}/projects/:projectId/merge_requests`, ({ params, request }) => {
    console.log(`[MSW GITLAB] GET /projects/${params.projectId}/merge_requests (LIST)`);
    if (!checkGitLabAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' });
    const mrs = [mockGitLabMergeRequest(1, 101, 'Feature A MR'), mockGitLabMergeRequest(2, 102, 'Fix B MR', 'merged')];
    return new Response(JSON.stringify(mrs), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }),

  // /projects/:projectId/merge_requests/:mergeRequestIid (detail)
  http.get(`${GITLAB_API_BASE}/projects/:projectId/merge_requests/:mergeRequestIid`, ({ params, request }) => {
    console.log(`[MSW GITLAB] GET /projects/${params.projectId}/merge_requests/${params.mergeRequestIid} (DETAIL)`);
    if (!checkGitLabAuth(request)) return new Response(null, { status: 401, statusText: 'Unauthorized' });
    const iid = parseInt(params.mergeRequestIid as string);
    return new Response(JSON.stringify(mockGitLabMergeRequest(iid, iid, `Detail for MR ${iid}`)), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }),
];


// --- GitHub Handlers (from previous steps, assumed to be complete and correct) ---
export const githubHandlers = [
  http.get(`${GITHUB_BASE_URL}/user`, ({request}) => {
    console.log(`[MSW] /user hit with token: ${request.headers.get('Authorization')}`);
    if (request.headers.get('Authorization') === `Bearer ${VALID_TOKEN}`) {
      console.log('[MSW] /user responding with mockGitHubUser (200)');
      return HttpResponse.json(mockGitHubUser, { status: 200 });
    }
    console.log('[MSW] /user responding with Unauthorized (401)');
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }),
  http.get(`${GITHUB_BASE_URL}/user/repos`, ({request}) => {
    if (request.headers.get('Authorization') !== `Bearer ${VALID_TOKEN}`) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(request.url);
    if (url.searchParams.get('sort') === 'updated' && url.searchParams.get('per_page') === '100') {
      return HttpResponse.json(mockGitHubRepos, { status: 200 });
    }
    return HttpResponse.json({ message: 'Bad Request: Missing params' }, { status: 400 });
  }),
  http.get(`${GITHUB_BASE_URL}/repos/:owner/:repo/branches`, ({request, params}) => {
    const { owner, repo } = params;
    const url = new URL(request.url);
    if (!owner || !repo) return HttpResponse.json({ message: 'Missing owner/repo' }, { status: 400 });
    if (url.searchParams.get('protected') === 'true') {
        return HttpResponse.json([mockBranch('main', 'main-sha-protected', true)], { status: 200 });
    }
    return HttpResponse.json([
        mockBranch('main', 'main-sha-protected'),
        mockBranch('develop', 'dev-sha')
    ], { status: 200 });
  }),
  http.get(`${GITHUB_BASE_URL}/repos/:owner/:repo/commits/:commit_sha`, ({params}) => {
    const { owner, repo, commit_sha } = params;
    if (!owner || !repo || !commit_sha) return HttpResponse.json({ message: 'Missing params' }, { status: 400 });
    return HttpResponse.json(mockCommitDetails(commit_sha as string), { status: 200 });
  }),
  http.get(`${GITHUB_BASE_URL}/repos/:owner/:repo/commits`, ({request, params}) => {
    const { owner, repo } = params;
    const url = new URL(request.url);
    console.log(`[MSW] /repos/${owner}/${repo}/commits hit with params: ${url.search}`);
    if (!owner || !repo) return HttpResponse.json({ message: 'Missing owner/repo' }, { status: 400 });
    if (url.searchParams.has('since') && url.searchParams.has('until')) {
      console.log('[MSW] Commits handler returning distinct authors for getContributors');
      return HttpResponse.json([
        mockCommitDetails('commit-sha-1', 'testuser', 'testuser@example.com'),
        mockCommitDetails('commit-sha-2', 'anotheruser', 'anotheruser@example.com'),
      ], { status: 200 });
    }
    return HttpResponse.json({ message: 'Bad Request: Missing time params' }, { status: 400 });
  }),
  http.get(`${GITHUB_BASE_URL}/repos/:owner/:repo/actions/runs`, ({request, params}) => {
    const { owner, repo } = params;
    const url = new URL(request.url);
    if (!owner || !repo) return HttpResponse.json({ message: 'Missing owner/repo' }, { status: 400 });
    if (url.searchParams.has('created')) {
      return HttpResponse.json({
        total_count: 2,
        workflow_runs: [
          mockPipelineRun(1, 'completed', 'success'),
          mockPipelineRun(2, 'in_progress', null),
        ]
      }, { status: 200 });
    }
    return HttpResponse.json({ message: 'Bad Request: Missing created param' }, { status: 400 });
  }),
  http.get(`${GITHUB_BASE_URL}/repos/:owner/:repo/contributors`, ({params}) => {
    const { owner, repo } = params;
    if (!owner || !repo) return HttpResponse.json({ message: 'Missing owner/repo' }, { status: 400 });
    return HttpResponse.json([
      mockContributor(1, 'testuser'),
      mockContributor(2, 'anotheruser'),
    ], { status: 200 });
  }),
  // Specifically handles /repos/{owner}/{repo}/contents/ (for root directory)
  http.get(`${GITHUB_BASE_URL}/repos/:owner/:repo/contents/`, ({ request, params }) => {
    const { owner, repo } = params;
    console.log(`[MSW HANDLER - ROOT CONTENTS] /repos/${owner}/${repo}/contents/ hit. Params: owner=${owner}, repo=${repo}`);
    if (!owner || !repo) {
      console.error(`[MSW HANDLER - ROOT CONTENTS] Root contents handler missing owner or repo param. Owner: '${owner}', Repo: '${repo}'`);
      return new Response(JSON.stringify({ message: 'Missing owner/repo for root contents' }), {
        status: 400, statusText: 'Bad Request', headers: { 'Content-Type': 'application/json' }
      });
    }
    console.log('[MSW HANDLER - ROOT CONTENTS] Root contents handler returning actual mock data via new Response().');
    return new Response(JSON.stringify([
      mockFileContent('README.md', 'file'),
      mockFileContent('src', 'dir'),
    ]), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }),
  // Matches /repos/{owner}/{repo}/contents/* (e.g., /contents/src/main.ts)
  http.get(`${GITHUB_BASE_URL}/repos/:owner/:repo/contents/:path*`, ({ request, params }) => {
    const { owner, repo, path } = params;
    if (!owner || !repo || !path) {
      return HttpResponse.json({ message: 'Missing owner/repo/path parameters for specific content path' }, { status: 400 });
    }
    const fullPath = Array.isArray(path) ? path.join('/') : path;
    console.log(`[MSW HANDLER - PATH CONTENTS] /repos/${owner}/${repo}/contents/${fullPath} (specific path with :path*) hit`);
    if (fullPath === 'src/myFile.ts') {
      console.log(`[MSW HANDLER - PATH CONTENTS] Matched specific file: ${fullPath}`);
      return HttpResponse.json(mockFileContent(fullPath, 'file'), { status: 200 });
    }
    console.log(`[MSW HANDLER - PATH CONTENTS] Unmatched specific file path via :path*: ${fullPath}. Returning single file mock.`);
    return HttpResponse.json([mockFileContent(fullPath, 'file')], { status: 200 });
  }),
  http.get(`${GITHUB_BASE_URL}/repos/:owner/:repo/pulls`, ({request, params}) => {
    const { owner, repo } = params;
    const url = new URL(request.url);
    if (!owner || !repo) return HttpResponse.json({ message: 'Missing owner/repo' }, { status: 400 });
    const pr1_createdAt = new Date();
    pr1_createdAt.setDate(pr1_createdAt.getDate() -1);
    const pr2_createdAt = new Date();
    pr2_createdAt.setDate(pr2_createdAt.getDate() -2);
    const pr3_createdAt = new Date();
    pr3_createdAt.setDate(pr3_createdAt.getDate() -3);
    console.log(`[MSW] Generic /pulls handler: pr1Date=${pr1_createdAt.toISOString()}, pr2Date=${pr2_createdAt.toISOString()}, pr3Date=${pr3_createdAt.toISOString()}`);
    if (url.searchParams.get('state') === 'all') {
      console.log(`[MSW] Generic /pulls handler returning 3 PRs with recent dates.`);
      return HttpResponse.json([
        mockPullRequest(1, 'open', 'feat/one', 'main', pr1_createdAt.toISOString()),
        mockPullRequest(2, 'merged', 'fix/two', 'main', pr2_createdAt.toISOString()),
        mockPullRequest(3, 'closed', 'chore/three', 'main', pr3_createdAt.toISOString()),
      ], { status: 200 });
    }
    return HttpResponse.json({ message: 'Bad Request: Missing state param' }, { status: 400 });
  }),
  http.get(`${GITHUB_BASE_URL}/repos/:owner/:repo/pulls/:pull_number`, ({params}) => {
    const { owner, repo, pull_number } = params;
    console.log(`[MSW HANDLER - GENERIC] Matched GET /repos/${owner}/${repo}/pulls/${pull_number} (details)`);
    if (!owner || !repo || !pull_number) {
      return new Response(JSON.stringify({ message: 'Missing params' }), { status: 400, headers: { 'Content-Type': 'application/json' }, statusText: 'Bad Request' });
    }
    const prId = parseInt(pull_number as string);
    return new Response(JSON.stringify(mockPullRequest(prId, 'open')), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }),
  http.get(`${GITHUB_BASE_URL}/repos/:owner/:repo/pulls/:pull_number/reviews`, ({params}) => {
    const { owner, repo, pull_number } = params;
    console.log(`[MSW HANDLER - GENERIC] Matched GET /repos/${owner}/${repo}/pulls/${pull_number}/reviews`);
    if (!owner || !repo || !pull_number) {
      return new Response(JSON.stringify({ message: 'Missing params' }), { status: 400, headers: { 'Content-Type': 'application/json' }, statusText: 'Bad Request' });
    }
    return new Response(JSON.stringify([
      mockReview(1, new Date(Date.now() - 3600 * 1000).toISOString()),
      mockReview(2, new Date(Date.now() - 7200 * 1000).toISOString()),
    ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }),
];

// Main handlers array for the server
export const handlers = [
  ...githubHandlers,
  ...azureHandlers,
  ...gitlabHandlers,
];
