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

function getWeekMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const list = await getActiveShoppingList(userId);

  if (list) {
    const currentWeekStart = getWeekMonday();
    if (!list.weekStartDate || list.weekStartDate < currentWeekStart) {
      const resetList = {
        ...list,
        weekStartDate: currentWeekStart,
        items: list.items.map((i) => ({ ...i, bought: false })),
      };
      await saveShoppingList(resetList);
      return NextResponse.json(resetList);
    }
  }

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
