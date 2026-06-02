import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { getActivePlan, WorkoutPlan, MealPlan } from "@/lib/db/plans";

const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
import { getDailyRecord, putDailyRecord, DailyRecord, DailyPlanItem } from "@/lib/db/daily";

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

const MEAL_TIMES: Record<string, string> = {
  breakfast: "07:30",
  lunch: "12:30",
  snack: "15:00",
  dinner: "18:30",
};

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    // Accept an optional date override, otherwise use today
    let date: string;
    try {
      const body = await req.json();
      date = body.date || new Date().toISOString().slice(0, 10);
    } catch {
      date = new Date().toISOString().slice(0, 10);
    }

    // Return existing record if already generated
    const existing = await getDailyRecord(userId, date);
    if (existing) return NextResponse.json(existing);

    const [workoutPlan, mealPlan] = await Promise.all([
      getActivePlan(userId, "workout") as Promise<WorkoutPlan | null>,
      getActivePlan(userId, "meal") as Promise<MealPlan | null>,
    ]);

    if (!mealPlan) {
      return NextResponse.json({ error: "No meal plan found" }, { status: 404 });
    }

    const items: DailyPlanItem[] = [];

    // Add meals in time order
    const mealOrder = ["breakfast", "lunch", "snack", "dinner"];
    const sorted = [...(mealPlan.mealTemplates || [])].sort(
      (a, b) => mealOrder.indexOf(a.time) - mealOrder.indexOf(b.time)
    );
    for (const meal of sorted) {
      items.push({
        id: `meal-${meal.id}-${date}`,
        type: "meal",
        label: capitalize(meal.name),
        detail: `${meal.calories} kcal · P ${meal.proteinG}g · C ${meal.carbsG}g · F ${meal.fatG}g`,
        completed: false,
        scheduledTime: MEAL_TIMES[meal.time],
        calories: meal.calories,
        proteinG: meal.proteinG,
        carbsG: meal.carbsG,
        fatG: meal.fatG,
      });
    }

    // Add workout exercises if today is a workout day
    if (workoutPlan) {
      const dayOfWeek = new Date(date + "T12:00:00").getDay();
      const dayRoutine = workoutPlan.weeklyRoutine?.find((d) => d.dayOfWeek === dayOfWeek);
      if (dayRoutine?.isWorkoutDay) {
        for (const ex of dayRoutine.exercises) {
          items.push({
            id: `exercise-${ex.id}-${date}`,
            type: "exercise",
            label: ex.name,
            detail: ex.muscleGroup,
            completed: false,
            sets: ex.sets,
            reps: ex.reps,
            weightKg: ex.startingWeightKg,
          });
        }
      }
    }

    // Add protein shake if prescribed
    if (mealPlan.proteinShakesPerDay > 0) {
      items.push({
        id: `shake-${date}`,
        type: "meal",
        label: "Protein shake",
        detail: `~${Math.round(mealPlan.dailyProteinG * 0.3)}g protein`,
        completed: false,
        scheduledTime: "16:00",
        calories: 150,
      });
    }

    const record: DailyRecord = {
      userId,
      date,
      items,
      waterMlTarget: mealPlan.dailyWaterMl || 2500,
      waterMlDone: 0,
      generatedAt: new Date().toISOString(),
    };

    await putDailyRecord(record);
    return NextResponse.json(record);
  } catch (err) {
    console.error("[daily/generate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate daily plan" },
      { status: 500 }
    );
  }
}
