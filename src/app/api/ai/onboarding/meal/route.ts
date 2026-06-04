import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { saveActivePlan } from "@/lib/db/plans";
import { calculateTDEE } from "@/lib/utils";
import { buildMealPrompt } from "@/lib/ai/mealPrompt";

export const maxDuration = 60;

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

function parseJSON(raw: string, label: string) {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    text = fence[1].trim();
  } else {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  }
  try {
    return JSON.parse(text);
  } catch {
    console.error(`[onboarding/meal] Failed to parse ${label}. Raw tail:`, raw.slice(-300));
    throw new Error(`Failed to parse ${label} response`);
  }
}

function buildConversionPrompt(params: {
  extraContext: string;
  targetCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  restCalories: number;
  restCarbsG: number;
  goal: string;
  restrictions: string;
  dislikes: string;
}): string {
  const { extraContext, targetCalories, proteinG, carbsG, fatG, restCalories, restCarbsG, goal, restrictions, dislikes } = params;
  return `You are converting a user's existing meal plan into a JSON format. Return ONLY valid JSON — no markdown, no explanation.

⚠️ ABSOLUTE RULES:
1. NEVER include "${dislikes}" or any of those ingredients in any meal, even if they appear in the user's plan.
2. Dietary restrictions to honour: ${restrictions || "none"}.
3. Use their ACTUAL meals from the plan below. Do not invent new meals.
4. Use plain simple meal names: "Chicken and Rice", "Oats and Yogurt", "Mince and Veg" etc.
5. The user's context below contains BOTH workout exercises AND nutrition/meals. Ignore the exercise lists — extract ONLY the meal sections (Breakfast, Lunch, Dinner, Snacks) for each day.
6. Macros appear in the format "430 kcal | 42P | 38C | 8F" — this means: calories=430, proteinG=42, carbsG=38, fatG=8.

THE USER'S EXISTING PLAN (contains workouts AND meals — extract ONLY the Breakfast/Lunch/Dinner/Snacks sections):
${extraContext}

Identify which days have gym/exercise sessions (workout days) and which days are rest/recovery only (rest days). Then convert the MEAL sections into the JSON below:
- workoutDayVariants: 3 arrays — pick meals from 3 different workout days
- restDayVariants: 2 arrays — pick meals from 2 different rest/recovery days
- Include snacks where listed (time: "snack")
- Use the macros already stated in the plan for each meal — do NOT recalculate them

{
  "dailyCalories": ${targetCalories},
  "dailyProteinG": ${proteinG},
  "dailyCarbsG": ${carbsG},
  "dailyFatG": ${fatG},
  "restDayCalories": ${restCalories},
  "restDayProteinG": ${proteinG},
  "restDayCarbsG": ${restCarbsG},
  "restDayFatG": ${fatG},
  "dailyWaterMl": 2500,
  "proteinShakesPerDay": ${goal === "build_muscle" ? 1 : 0},
  "mealTemplates": [],
  "workoutDayMeals": [],
  "restDayMeals": [],
  "workoutDayVariants": [
    [<workout day 1: breakfast obj, lunch obj, dinner obj, snack obj>],
    [<workout day 2: breakfast obj, lunch obj, dinner obj, snack obj>],
    [<workout day 3: breakfast obj, lunch obj, dinner obj, snack obj>]
  ],
  "restDayVariants": [
    [<rest day 1: breakfast obj, lunch obj, dinner obj, snack obj>],
    [<rest day 2: breakfast obj, lunch obj, dinner obj, snack obj>]
  ]
}

Each meal object MUST follow this shape exactly:
{
  "id": "unique_snake_case_id",
  "name": "Simple meal name",
  "time": "breakfast" | "lunch" | "dinner" | "snack",
  "ingredients": [
    { "name": "ingredient", "amountG": <number>, "unit": "g" | "ml" | "piece" | "slice" | "tbsp" | "tsp" }
  ],
  "calories": <number from the plan>,
  "proteinG": <number from the plan>,
  "carbsG": <number from the plan>,
  "fatG": <number from the plan>,
  "prepMinutes": 10
}

UNIT RULES: eggs → unit "piece", bread → unit "slice", whole fruit → unit "piece", oils/sauces ≤60g → unit "tbsp", everything else → unit "g".`;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await req.json();
    const {
      gender, age, weightKg, heightCm, goal, workoutDays,
      dietaryRestrictions, likedFoods, dislikedFoods,
      mealSimplicity, cookingSkill, extraContext,
    } = body;

    const tdee = calculateTDEE(weightKg, heightCm, age, gender, workoutDays.length);
    const targetCalories =
      goal === "lose_weight" ? tdee - 400 :
      goal === "build_muscle" ? tdee + 250 : tdee;
    const proteinG = Math.round(weightKg * 2);
    const fatG = Math.round((targetCalories * 0.25) / 9);
    const carbsG = Math.round((targetCalories - proteinG * 4 - fatG * 9) / 4);
    const restCalories = Math.round(targetCalories * 0.88);
    const restCarbsG = Math.round(carbsG * 0.75);

    const hasExistingPlan = extraContext && extraContext.length > 200;
    const restrictions = dietaryRestrictions?.join(", ") || "none";
    const dislikes = dislikedFoods || "none";

    const mealPrompt = hasExistingPlan
      ? buildConversionPrompt({
          extraContext, targetCalories, proteinG, carbsG, fatG,
          restCalories, restCarbsG, goal, restrictions, dislikes,
        })
      : buildMealPrompt({
          gender, age, goal, targetCalories, proteinG, carbsG, fatG,
          restCalories, restCarbsG,
          weekStartDate: new Date().toISOString().slice(0, 10),
          dietaryRestrictions, likedFoods, dislikedFoods,
          mealSimplicity, cookingSkill,
          extraContext,
          proteinShakes: goal === "build_muscle" ? 1 : 0,
        });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8000,
      messages: [{ role: "user", content: mealPrompt }],
    });
    if (msg.stop_reason === "max_tokens") throw new Error("Meal plan response was cut short");
    const mealRaw = (msg.content[0] as { type: string; text: string }).text;
    const mealPlan = parseJSON(mealRaw, "meal");

    await saveActivePlan({ userId, planId: "active-meal", createdAt: new Date().toISOString(), ...mealPlan }, "meal");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[onboarding/meal]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
