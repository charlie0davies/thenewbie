import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { getActivePlan, saveActivePlan } from "@/lib/db/plans";

async function getUserId(req: NextRequest) {
  const res = NextResponse.next();
  return runWithAmplifyServerContext({
    nextServerContext: { request: req, response: res },
    operation: async (ctx) => {
      const session = await fetchAuthSession(ctx);
      return session.tokens?.accessToken?.payload?.sub as string | undefined;
    },
  });
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "workout") as "workout" | "meal";
  const plan = await getActivePlan(userId, type);
  return NextResponse.json(plan);
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { type, plan } = await req.json();
  await saveActivePlan({ ...plan, userId }, type as "workout" | "meal");
  return NextResponse.json({ ok: true });
}
