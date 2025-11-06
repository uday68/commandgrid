import { Octokit } from '@octokit/rest';

class GitHubService {
  constructor() {
    this.octokit = null;
  }

  async initialize(accessToken) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  async checkStatus() {
    try {
      // Test API connection by getting user info
      await this.octokit.users.getAuthenticated();
      return {
        status: 'connected',
        details: 'GitHub is connected and working properly'
      };
    } catch (error) {
      return {
        status: 'disconnected',
        details: `GitHub connection failed: ${error.message}`
      };
    }
  }

  async listRepositories() {
    try {
      const { data } = await this.octokit.repos.listForAuthenticatedUser();
      return data;
    } catch (error) {
      console.error('Error listing GitHub repositories:', error);
      throw error;
    }
  }

  async createRepository(name, description, isPrivate = false) {
    try {
      const { data } = await this.octokit.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate
      });
      return data;
    } catch (error) {
      console.error('Error creating GitHub repository:', error);
      throw error;
    }
  }

  async createIssue(owner, repo, title, body) {
    try {
      const { data } = await this.octokit.issues.create({
        owner,
        repo,
        title,
        body
      });
      return data;
    } catch (error) {
      console.error('Error creating GitHub issue:', error);
      throw error;
    }
  }

  async listPullRequests(owner, repo) {
    try {
      const { data } = await this.octokit.pulls.list({
        owner,
        repo
      });
      return data;
    } catch (error) {
      console.error('Error listing GitHub pull requests:', error);
      throw error;
    }
  }

  async createPullRequest(owner, repo, title, head, base, body) {
    try {
      const { data } = await this.octokit.pulls.create({
        owner,
        repo,
        title,
        head,
        base,
        body
      });
      return data;
    } catch (error) {
      console.error('Error creating GitHub pull request:', error);
      throw error;
    }
  }

  async listBranches(owner, repo) {
    try {
      const { data } = await this.octokit.repos.listBranches({
        owner,
        repo
      });
      return data;
    } catch (error) {
      console.error('Error listing GitHub branches:', error);
      throw error;
    }
  }

  async createBranch(owner, repo, branch, sha) {
    try {
      const { data } = await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha
      });
      return data;
    } catch (error) {
      console.error('Error creating GitHub branch:', error);
      throw error;
    }
  }
}

export default new GitHubService(); 