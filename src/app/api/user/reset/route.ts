import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { db, Tables } from "@/lib/aws/dynamo";
import { awsConfig } from "@/lib/aws/config";

async function getUserId(req: NextRequest) {
  const res = NextResponse.next();
  return runWithAmplifyServerContext({
    nextServerContext: { request: req, response: res },
    operation: async (ctx) => {
      const session = await fetchAuthSession(ctx);
      return {
        sub: session.tokens?.accessToken?.payload?.sub as string | undefined,
        username: session.tokens?.accessToken?.payload?.username as string | undefined,
      };
    },
  });
}

export async function DELETE(req: NextRequest) {
  const { sub: userId, username } = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const deleteAccount = searchParams.get("deleteAccount") === "1";

  // Delete user profile, plans, and shopping list
  await Promise.allSettled([
    db.send(new DeleteCommand({ TableName: Tables.users, Key: { userId } })),
    db.send(new DeleteCommand({ TableName: Tables.plans, Key: { userId, planId: "active-workout" } })),
    db.send(new DeleteCommand({ TableName: Tables.plans, Key: { userId, planId: "active-meal" } })),
    db.send(new DeleteCommand({ TableName: Tables.shopping, Key: { userId, listId: "active" } })),
  ]);

  if (deleteAccount && username) {
    const cognito = new CognitoIdentityProviderClient({
      region: awsConfig.region,
      credentials: awsConfig.credentials,
    });
    await cognito.send(
      new AdminDeleteUserCommand({
        UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
        Username: username,
      })
    );
  }

  return NextResponse.json({ ok: true });
}
