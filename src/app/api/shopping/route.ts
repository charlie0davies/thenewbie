import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import {
  getActiveShoppingList,
  saveShoppingList,
  toggleItemBought,
} from "@/lib/db/shopping";

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
  const list = await getActiveShoppingList(userId);
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const body = await req.json();
  await saveShoppingList({ ...body, userId, listId: "active" });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { itemId, bought } = await req.json();
  await toggleItemBought(userId, "active", itemId, bought);
  return NextResponse.json({ ok: true });
}
