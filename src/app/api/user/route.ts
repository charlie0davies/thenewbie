import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { getUser, putUser, updateUser } from "@/lib/db/users";
import type { UserProfile } from "@/types";

async function getUserId(req: NextRequest, res: NextResponse) {
  return runWithAmplifyServerContext({
    nextServerContext: { request: req, response: res },
    operation: async (ctx) => {
      const session = await fetchAuthSession(ctx);
      return session.tokens?.accessToken?.payload?.sub as string | undefined;
    },
  });
}

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const userId = await getUserId(req, res);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const user = await getUser(userId);
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const res = NextResponse.next();
  const userId = await getUserId(req, res);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body: Partial<UserProfile> = await req.json();
  await updateUser(userId, body);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  const userId = await getUserId(req, res);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body: Omit<UserProfile, "userId"> = await req.json();
  const profile: UserProfile = { ...body, userId };
  await putUser(profile);
  return NextResponse.json({ ok: true });
}
