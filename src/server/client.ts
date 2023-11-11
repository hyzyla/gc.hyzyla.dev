import { Octokit } from "octokit";
import { env } from "~/env.mjs";

export class GithubClient {
  client: Octokit | null;
constructor(private readonly user: { accessToken: string }) {
    this.client = null;
  }

  async isIntegrationInstalled() {
    const client = this.getClient();
    const { data } = await client.request("GET /user/installations");
    const exists = data.installations.find(
      (installation) => installation.app_id == env.GITHUB_APP_ID,
    );
    return !!exists;
  }

  getClient(): Octokit {
    if (this.client) {
      return this.client;
    }

    const accessToken = this.user.accessToken;
    const client = new Octokit({
      auth: accessToken,
    });
    this.client = client;
    return client;
  }

  async getRepositories() {
    const client = this.getClient();
    const result = await client.graphql<{
      viewer: {
        repositories: {
          nodes: {
            id: string;
            url: string;
            name: string;
            description: string;
            isFork: boolean;
            owner: {
              login: string;
            };
          }[];
        };
      };
    }>(`
      query {
        viewer {
          repositories(first: 100, affiliations: [OWNER], isFork: true) {
            nodes {
              id
              url
              name
              description
              isFork
              viewerPermission
              owner {
                login
              }
            }
          }
        }
      }
    `);
    return result;
  }

  async deleteRepository(options: { repository: string; owner: string }) {
    const client = this.getClient();
    return await client.rest.repos.delete({
      owner: options.owner,
      repo: options.repository,
    });
  }
}
