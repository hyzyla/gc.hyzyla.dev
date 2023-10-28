import { z as zod } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { GithubClient } from "~/server/client";

export const repositoryRouter = createTRPCRouter({
  getRepositories: protectedProcedure.query(async ({ ctx }) => {
    const client = new GithubClient(ctx.session.user);
    return await client.getRepositories();
  }),

  deleteRepository: protectedProcedure
    .input(
      zod.object({
        owner: zod.string(),
        repository: zod.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const client = new GithubClient(ctx.session.user);
      return await client.deleteRepository({
        owner: input.owner,
        repository: input.repository,
      });
    }),
});
