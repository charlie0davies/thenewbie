import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { db, Tables } from "@/lib/aws/dynamo";
import type { UserProfile } from "@/types";

export async function getUser(userId: string): Promise<UserProfile | null> {
  const { Item } = await db.send(
    new GetCommand({ TableName: Tables.users, Key: { userId } })
  );
  return (Item as UserProfile) ?? null;
}

export async function putUser(profile: UserProfile): Promise<void> {
  await db.send(new PutCommand({ TableName: Tables.users, Item: profile }));
}

export async function updateUser(
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const entries = Object.entries(updates);
  if (!entries.length) return;

  const expr = entries.map((_, i) => `#k${i} = :v${i}`).join(", ");
  const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
  const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));

  await db.send(
    new UpdateCommand({
      TableName: Tables.users,
      Key: { userId },
      UpdateExpression: `SET ${expr}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}
