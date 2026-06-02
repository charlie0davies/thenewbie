import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { putUser } from "@/lib/db/users";
import { saveActivePlan } from "@/lib/db/plans";
import { saveShoppingList } from "@/lib/db/shopping";
import { calculateTDEE } from "@/lib/utils";
import type { UserProfile } from "@/types";

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

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const {
    name, email, gender, age, heightCm, weightKg,
    goal, experience, workoutType, workoutDays,
    dietaryRestrictions, likedFoods, dislikedFoods,
    mealSimplicity, cookingSkill,
  } = body;

  const tdee = calculateTDEE(weightKg, heightCm, age, gender, workoutDays.length);
  const targetCalories =
    goal === "lose_weight" ? tdee - 400 :
    goal === "build_muscle" ? tdee + 250 : tdee;

  const profile: UserProfile = {
    id: userId,
    name, email, gender, age, heightCm, weightKg,
    goal, experience, workoutType,
    workoutDays: workoutDays.sort((a: number, b: number) => a - b),
    createdAt: new Date().toISOString(),
  };
  await putUser(profile);

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const workoutDayNames = workoutDays.map((d: number) => dayNames[d]).join(", ");

  const prompt = `You are an expert personal trainer and nutritionist creating a beginner fitness plan.

USER PROFILE:
- Name: ${name}
- Gender: ${gender}, Age: ${age}
- Height: ${heightCm}cm, Weight: ${weightKg}kg
- Goal: ${goal}
- Experience: ${experience}
- Workout type: ${workoutType}
- Workout days: ${workoutDayNames} (${workoutDays.length} days/week)
- TDEE: ${tdee} kcal/day, Target calories: ${targetCalories} kcal/day
- Dietary restrictions: ${dietaryRestrictions?.join(", ") || "none"}
- Liked foods: ${likedFoods || "no preference"}
- Disliked foods: ${dislikedFoods || "none"}
- Meal simplicity preference: ${mealSimplicity} (1=very simple, 5=elaborate)
- Cooking skill: ${cookingSkill}

Return ONLY valid JSON (no markdown, no explanation) in this exact structure:

{
  "workoutPlan": {
    "weeklyRoutine": [
      {
        "dayOfWeek": <0-6 where 0=Sun>,
        "isWorkoutDay": <true|false>,
        "exercises": [
          {
            "id": "<snake_case_unique_id>",
            "name": "<exercise name>",
            "muscleGroup": "<primary muscle>",
            "sets": <number>,
            "reps": "<e.g. 8-12 or 30 sec>",
            "restSeconds": <number>,
            "startingWeightKg": <number, use 0 for bodyweight>,
            "notes": "<beginner tip>"
          }
        ]
      }
    ]
  },
  "mealPlan": {
    "dailyCalories": ${targetCalories},
    "dailyProteinG": <number>,
    "dailyCarbsG": <number>,
    "dailyFatG": <number>,
    "dailyWaterMl": <number>,
    "proteinShakesPerDay": <0 or 1>,
    "mealTemplates": [
      {
        "id": "<unique_id>",
        "name": "<meal name>",
        "time": "<breakfast|lunch|dinner|snack>",
        "ingredients": [
          { "name": "<ingredient>", "amountG": <number>, "unit": "<g|ml|tbsp|tsp|piece>" }
        ],
        "calories": <number>,
        "proteinG": <number>,
        "carbsG": <number>,
        "fatG": <number>,
        "prepMinutes": <number>
      }
    ]
  },
  "shoppingList": {
    "weekStartDate": "${new Date().toISOString().slice(0, 10)}",
    "items": [
      {
        "id": "<unique_id>",
        "name": "<item name>",
        "category": "<Proteins|Dairy|Produce|Grains|Condiments|Supplements>",
        "quantity": "<e.g. 500g, 1 dozen, 2 litres>",
        "estimatedCostGbp": <number>,
        "buyByDate": "<YYYY-MM-DD or null>",
        "tescoUrl": "https://www.tesco.com/groceries/en-GB/search?query=<url-encoded-name>",
        "asdaUrl": "https://groceries.asda.com/search/<url-encoded-name>",
        "morrisonsUrl": "https://groceries.morrisons.com/search?entry=<url-encoded-name>",
        "waitroseUrl": "https://www.waitrose.com/ecom/shop/search?searchTerm=<url-encoded-name>"
      }
    ]
  }
}

Rules:
- Keep it beginner-friendly with clear exercise names and tips
- 4-6 exercises per workout day, full body or push/pull/legs
- 3-4 meals per day, realistic for UK shopping
- Shopping list covers one full week
- Supermarket search URLs must use the actual item name URL-encoded
- Meal ingredients must be specific and measurable`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text;

  // Strip markdown code fences if Claude wraps the response
  let jsonText = raw.trim();
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonText = fenceMatch[1].trim();
  } else {
    // Find first { to last } in case there's any leading/trailing text
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start !== -1 && end !== -1) jsonText = jsonText.slice(start, end + 1);
  }

  let plan: ReturnType<typeof JSON.parse>;
  try {
    plan = JSON.parse(jsonText);
  } catch {
    console.error("Failed to parse AI response:", raw.slice(0, 500));
    return NextResponse.json(
      { error: "AI returned an unexpected format. Please try again." },
      { status: 500 }
    );
  }

  await saveActivePlan(
    { userId, planId: "active-workout", createdAt: new Date().toISOString(), ...plan.workoutPlan },
    "workout"
  );
  await saveActivePlan(
    { userId, planId: "active-meal", createdAt: new Date().toISOString(), ...plan.mealPlan },
    "meal"
  );
  await saveShoppingList({
    userId,
    listId: "active",
    createdAt: new Date().toISOString(),
    totalEstimatedCostGbp: plan.shoppingList.items.reduce(
      (sum: number, i: { estimatedCostGbp: number }) => sum + i.estimatedCostGbp,
      0
    ),
    ...plan.shoppingList,
  });

  return NextResponse.json({ ok: true, plan });
}
