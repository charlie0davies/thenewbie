import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { getUser } from "@/lib/db/users";
import { saveActivePlan } from "@/lib/db/plans";
import { calculateTDEE } from "@/lib/utils";

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

function parseJSON(raw: string) {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  else {
    const s = text.indexOf("{"), e = text.lastIndexOf("}");
    if (s !== -1 && e !== -1) text = text.slice(s, e + 1);
  }
  return JSON.parse(text);
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const profile = await getUser(userId);
    if (!profile) return NextResponse.json({ error: "Profile not found — complete onboarding first" }, { status: 404 });

    const { gender, age, heightCm, weightKg, goal, workoutDays } = profile;

    const tdee = calculateTDEE(weightKg, heightCm, age, gender, workoutDays.length);
    const targetCalories = goal === "lose_weight" ? tdee - 400 : goal === "build_muscle" ? tdee + 250 : tdee;
    const proteinG = Math.round(weightKg * 2);
    const fatG = Math.round((targetCalories * 0.25) / 9);
    const carbsG = Math.round((targetCalories - proteinG * 4 - fatG * 9) / 4);
    const restCalories = Math.round(targetCalories * 0.88);
    const restCarbsG = Math.round(carbsG * 0.75);

    const body = await req.json().catch(() => ({}));
    const extraContext = body.extraContext || "";

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const mealPrompt = `You are a nutritionist. Create a UK meal plan as JSON only — no markdown, no explanation.

Profile: ${gender}, age ${age}, goal: ${goal}.
WORKOUT day targets: ${targetCalories} kcal, ${proteinG}g protein, ${carbsG}g carbs, ${fatG}g fat.
REST day targets: ${restCalories} kcal, ${proteinG}g protein, ${restCarbsG}g carbs, ${fatG}g fat (fewer carbs, same protein).${extraContext ? `\nExtra info: ${extraContext}` : ""}

Return ONLY this JSON. Each array must have 3-4 meals. IDs must be unique across both arrays:
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
  "workoutDayMeals": [
    {
      "id": "wd_<unique>",
      "name": "<meal name>",
      "time": "<breakfast|lunch|dinner|snack>",
      "ingredients": [{ "name": "<ingredient>", "amountG": <number>, "unit": "<unit>" }],
      "calories": <number>, "proteinG": <number>, "carbsG": <number>, "fatG": <number>, "prepMinutes": <number>
    }
  ],
  "restDayMeals": [
    {
      "id": "rd_<unique>",
      "name": "<meal name>",
      "time": "<breakfast|lunch|dinner|snack>",
      "ingredients": [{ "name": "<ingredient>", "amountG": <number>, "unit": "<unit>" }],
      "calories": <number>, "proteinG": <number>, "carbsG": <number>, "fatG": <number>, "prepMinutes": <number>
    }
  ]
}

UNIT RULES:
- Eggs → amountG = count, unit: "piece"
- Bread/toast → amountG = slice count, unit: "slice"
- Whole fruits → amountG: 1, unit: "piece"
- Oils/butter/honey/sauces → amountG = tbsp count, unit: "tbsp"
- Spices → amountG = tsp count, unit: "tsp"
- Liquids → unit: "ml" — everything else → unit: "g"

workoutDayMeals = higher carb/protein. restDayMeals = lighter. Max 6 ingredients per meal.`;

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: mealPrompt }],
    });

    if (msg.stop_reason === "max_tokens") {
      return NextResponse.json({ error: "Response too long — try again" }, { status: 500 });
    }

    const raw = (msg.content[0] as { type: string; text: string }).text;
    const mealPlan = parseJSON(raw);

    await saveActivePlan(
      { userId, planId: "active-meal", createdAt: new Date().toISOString(), ...mealPlan },
      "meal"
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[regenerate-meals]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
