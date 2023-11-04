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

export const queries = {
  getUserAccount,
};
