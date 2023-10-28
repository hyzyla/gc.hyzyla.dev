import { type User } from "next-auth";
import { db } from "~/server/db";

import { eq, and } from "drizzle-orm";
import * as schema from "~/server/db/schema";

export async function getUserAccount(user: User, provider = "github") {
  return await db.query.accounts.findFirst({
    where: and(
      eq(schema.accounts.userId, user.id),
      eq(schema.accounts.provider, provider),
    ),
  });
}

export async function updateUserAccountTokens(options: {
  userId: string;
  privderAccountId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshTokenExpiresIn: number;
}) {
  return await db
    .update(schema.accounts)
    .set({
      access_token: options.accessToken,
      refresh_token: options.refreshToken,
      expires_at: options.expiresAt,
      refresh_token_expires_in: options.refreshTokenExpiresIn,
    })
    .where(
      and(
        eq(schema.accounts.userId, options.userId),
        eq(schema.accounts.providerAccountId, options.privderAccountId),
      ),
    );
}

export const queries = {
  getUserAccount,
  updateUserAccountTokens,
};
