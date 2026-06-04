import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import {
  logWeight,
  logWorkout,
  getWeightHistory,
  getWorkoutHistory,
  logMeasurement,
  getMeasurementHistory,
} from "@/lib/db/progress";
import { getUser, updateUser } from "@/lib/db/users";

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
  const type = searchParams.get("type") || "weight";

  if (type === "weight") {
    const data = await getWeightHistory(userId);
    return NextResponse.json(data);
  } else if (type === "measurement") {
    const data = await getMeasurementHistory(userId);
    return NextResponse.json(data);
  } else {
    const exerciseId = searchParams.get("exerciseId") || undefined;
    const data = await getWorkoutHistory(userId, exerciseId);
    return NextResponse.json(data);
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  if (body.type === "weight") {
    await logWeight(userId, body.weightKg, body.date);
  } else if (body.type === "workout") {
    await logWorkout(userId, body.exerciseId, body.exerciseName, body.sets, body.date);
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const user = await getUser(userId);
    if (user && user.lastWorkoutDate !== todayStr) {
      const streak = user.lastWorkoutDate === yesterdayStr ? (user.currentStreak ?? 0) + 1 : 1;
      await updateUser(userId, { currentStreak: streak, lastWorkoutDate: todayStr });
    }
  } else if (body.type === "measurement") {
    const { type: _, date, ...measurements } = body;
    await logMeasurement(userId, measurements, date);
  }

  return NextResponse.json({ ok: true });
}
