import { type User } from "next-auth";
import { Octokit, App } from "octokit";
import { queries } from "~/server/db/queries";
import { env } from "~/env.mjs";

export class GithubClient {
  client: Octokit | null;
  constructor(private readonly user: User) {
    this.client = null;
  }

  async isIntegrationInstalled() {
    const client = await this.getClient();
    const { data } = await client.request("GET /user/installations");
    const exists = data.installations.find(
      (installation) => installation.app_id == env.GITHUB_APP_ID,
    );
    return !!exists;

    // const client = new Octokit({
    //   authStrategy: createAppAuth,
    //   auth: {
    //     appId: 1,
    //     privateKey: "-----BEGIN PRIVATE KEY-----\n...",
    //     installationId: 123,
    //   },
    // });
    // console.log(await client.rest.apps.getAuthenticated());
    // const response = await client.rest.apps.getUserInstallation();
    // console.log("response", response);
    // return true;
  }

  async getClient(): Promise<Octokit> {
    if (this.client) {
      return this.client;
    }

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

  async getUsername() {
    const client = await this.getClient();
    const result = await client.graphql<{
      viewer: {
        login: string;
      };
    }>(`
      query {
        viewer {
          login
        }
      }
    `);
    return result.viewer.login;
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
