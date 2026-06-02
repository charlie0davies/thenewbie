import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { getActivePlan, WorkoutPlan, MealPlan, MealTemplate } from "@/lib/db/plans";
import { getDailyRecord, putDailyRecord, DailyRecord, DailyPlanItem } from "@/lib/db/daily";

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

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

/**
 * Pick a meal variant for a given day.
 * We rotate through variants based on how many workout/rest days have passed
 * in the week so each day genuinely gets different meals.
 */
function pickVariant(
  variants: MealTemplate[][],
  dayOfWeek: number,
  allDaysOfType: number[]
): MealTemplate[] {
  if (!variants?.length) return [];
  const position = allDaysOfType.sort((a, b) => a - b).indexOf(dayOfWeek);
  const idx = position >= 0 ? position % variants.length : dayOfWeek % variants.length;
  return variants[idx] ?? variants[0];
}

/** Resolve which meals to show for a given day, using v3 variants first */
function resolveMeals(
  mealPlan: MealPlan,
  dayOfWeek: number,
  isWorkoutDay: boolean,
  allWorkoutDays: number[],
  allRestDays: number[]
): MealTemplate[] {
  // v3 — variants (preferred: gives real daily variety)
  if (isWorkoutDay && mealPlan.workoutDayVariants?.length) {
    return pickVariant(mealPlan.workoutDayVariants, dayOfWeek, allWorkoutDays);
  }
  if (!isWorkoutDay && mealPlan.restDayVariants?.length) {
    return pickVariant(mealPlan.restDayVariants, dayOfWeek, allRestDays);
  }
  // v2 — single template per type
  if (isWorkoutDay && mealPlan.workoutDayMeals?.length) return mealPlan.workoutDayMeals;
  if (!isWorkoutDay && mealPlan.restDayMeals?.length) return mealPlan.restDayMeals;
  // v1 — same every day
  return mealPlan.mealTemplates ?? [];
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

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

    const dayOfWeek = new Date(date + "T12:00:00").getDay();
    const dayRoutine = workoutPlan?.weeklyRoutine?.find((d) => d.dayOfWeek === dayOfWeek);
    const isWorkoutDay = dayRoutine?.isWorkoutDay ?? false;

    // Build lists of all workout/rest days so we can pick the right variant index
    const allWorkoutDays = workoutPlan?.weeklyRoutine
      ?.filter((d) => d.isWorkoutDay)
      .map((d) => d.dayOfWeek) ?? [];
    const allRestDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !allWorkoutDays.includes(d));

    const mealSource = resolveMeals(mealPlan, dayOfWeek, isWorkoutDay, allWorkoutDays, allRestDays);

    const items: DailyPlanItem[] = [];

    const mealOrder = ["breakfast", "lunch", "snack", "dinner"];
    const sorted = [...mealSource].sort(
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

    // Workout exercises
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

    const targetCals = isWorkoutDay
      ? mealPlan.dailyCalories
      : mealPlan.restDayCalories ?? mealPlan.dailyCalories;

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
