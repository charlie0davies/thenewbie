import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import {
  getDailyRecord,
  putDailyRecord,
  toggleItemComplete,
  updateWater,
  updateDailyItem,
  addDailyItem,
} from "@/lib/db/daily";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { date } = await params;
  const record = await getDailyRecord(userId, date);
  return NextResponse.json(record);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { date } = await params;
  const body = await req.json();
  await putDailyRecord({ ...body, userId, date });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { date } = await params;
  const { action, itemId, completed, partialNote, waterMlDone, updates, item } =
    await req.json();

  if (action === "toggle" && itemId !== undefined) {
    await toggleItemComplete(userId, date, itemId, completed, partialNote);
  } else if (action === "water" && waterMlDone !== undefined) {
    await updateWater(userId, date, waterMlDone);
  } else if (action === "update_item" && itemId !== undefined && updates) {
    await updateDailyItem(userId, date, itemId, updates);
  } else if (action === "add_item" && item) {
    await addDailyItem(userId, date, item);
  }

  return NextResponse.json({ ok: true });
}
