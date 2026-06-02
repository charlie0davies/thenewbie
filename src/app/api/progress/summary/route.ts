import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { getRecentDays } from "@/lib/db/daily";
import { getWorkoutHistory } from "@/lib/db/progress";

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
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const [recentDays, workoutLogs] = await Promise.all([
      getRecentDays(userId, 30),
      getWorkoutHistory(userId, undefined, 100),
    ]);

    // Nutrition per day from completed meal items
    const nutrition = recentDays
      .map((record) => {
        const meals = record.items.filter((i) => i.type === "meal" && i.completed);
        return {
          date: record.date,
          calories: meals.reduce((s, i) => s + (i.calories || 0), 0),
          proteinG: meals.reduce((s, i) => s + ((i as { proteinG?: number }).proteinG || 0), 0),
          carbsG: meals.reduce((s, i) => s + ((i as { carbsG?: number }).carbsG || 0), 0),
          fatG: meals.reduce((s, i) => s + ((i as { fatG?: number }).fatG || 0), 0),
        };
      })
      .filter((d) => d.calories > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Exercise progress — group by exercise name, pick max weight per day
    const exerciseMap: Record<string, { date: string; maxWeightKg: number; totalVolumeKg: number }[]> = {};
    for (const log of workoutLogs) {
      const name = log.exerciseName;
      if (!exerciseMap[name]) exerciseMap[name] = [];
      const maxWeight = Math.max(...log.sets.map((s) => s.weightKg));
      const volume = log.sets.reduce((s, set) => s + set.reps * set.weightKg, 0);
      exerciseMap[name].push({ date: log.date, maxWeightKg: maxWeight, totalVolumeKg: volume });
    }

    // Sort each exercise history by date
    for (const name in exerciseMap) {
      exerciseMap[name] = exerciseMap[name]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-20);
    }

    return NextResponse.json({ nutrition, exercises: exerciseMap });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
