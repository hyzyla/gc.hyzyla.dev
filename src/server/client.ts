import { type User } from "next-auth";
import { Octokit } from "octokit";
import { queries } from "~/server/db/queries";

export class GithubClient {
  client: Octokit | null;
  constructor(private readonly user: User) {
    this.client = null;
  }

  async getClient(): Promise<Octokit> {
    if (this.client) {
      return this.client;
    }
    console.log("getting client", this.user);
    const account = await queries.getUserAccount(this.user);

    if (!account) {
      throw new Error("no account found");
    }
    const client = new Octokit({
      auth: account.access_token,
    });
    this.client = client;
    return client;
  }

  async getRepositories() {
    const client = await this.getClient();
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
          repositories(first: 100, affiliations: [OWNER]) {
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
    const client = await this.getClient();
    console.log("deleting", options);
    console.log("auth", await client.auth());
    return await client.rest.repos.delete({
      owner: options.owner,
      repo: options.repository,
    });
  }
}
