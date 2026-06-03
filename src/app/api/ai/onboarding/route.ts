import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { putUser, updateUser } from "@/lib/db/users";
import { saveActivePlan } from "@/lib/db/plans";
import { saveShoppingList } from "@/lib/db/shopping";
import { calculateTDEE } from "@/lib/utils";
import { buildMealPrompt } from "@/lib/ai/mealPrompt";
import type { UserProfile } from "@/types";

export const maxDuration = 120;

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

  // Strip markdown code fences
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
  } catch (err) {
    console.error(`[onboarding] Failed to parse ${label}. stop_reason may be max_tokens.`);
    console.error(`[onboarding] Raw tail (last 300 chars):`, raw.slice(-300));
    throw err;
  }
}

async function callClaude(client: Anthropic, prompt: string) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  if (msg.stop_reason === "max_tokens") {
    throw new Error("Response was cut short (max_tokens). Retrying with a smaller request.");
  }

  return (msg.content[0] as { type: string; text: string }).text;
}

export async function POST(req: NextRequest) {
  // Top-level catch — every code path must return JSON
  try {
  if (!process.env.ANTHROPIC_API_KEY) {
    const keys = Object.keys(process.env).filter(k => k.includes("ANTHROPIC") || k.includes("API")).join(", ");
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured", presentKeys: keys || "(none)" }, { status: 500 });
  }

  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const {
    name, email, gender, age, heightCm, weightKg, targetWeightKg,
    goal, experience, workoutType, workoutDays,
    dietaryRestrictions, likedFoods, dislikedFoods,
    mealSimplicity, cookingSkill,
  } = body;

  const tdee = calculateTDEE(weightKg, heightCm, age, gender, workoutDays.length);
  const targetCalories =
    goal === "lose_weight" ? tdee - 400 :
    goal === "build_muscle" ? tdee + 250 : tdee;
  const proteinG = Math.round(weightKg * 2);
  const fatG = Math.round((targetCalories * 0.25) / 9);
  const carbsG = Math.round((targetCalories - proteinG * 4 - fatG * 9) / 4);

  const profile: UserProfile = {
    userId, name, email, gender, age, heightCm, weightKg, targetWeightKg, goal, experience, workoutType,
    workoutDays: workoutDays.sort((a: number, b: number) => a - b),
    createdAt: new Date().toISOString(),
  };
  await putUser(profile);

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const workoutDayNums: number[] = workoutDays;
  const workoutDayNames = workoutDayNums.map((d) => dayNames[d]).join(", ");
  const allDays = [0, 1, 2, 3, 4, 5, 6];

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // ── Call 1: Workout plan ──────────────────────────────────────────────────

  const extraContextNote = body.extraContext
    ? `\nAdditional context from user: "${body.extraContext}"`
    : "";

  const workoutPrompt = `You are a personal trainer. Create a beginner workout plan as JSON only — no markdown, no explanation.

Profile: ${gender}, age ${age}, ${heightCm}cm, ${weightKg}kg, goal: ${goal}, experience: ${experience}, equipment: ${workoutType}.
Workout days (0=Sun): ${workoutDayNames}. Rest days: the others.${extraContextNote}

Return ONLY this JSON (all 7 days must be included):
{
  "weeklyRoutine": [
    {
      "dayOfWeek": <0-6>,
      "isWorkoutDay": <true|false>,
      "exercises": [
        {
          "id": "<unique_snake_case>",
          "name": "<exercise>",
          "muscleGroup": "<muscle>",
          "sets": <2-4>,
          "reps": "<e.g. 8-12>",
          "restSeconds": <60-120>,
          "startingWeightKg": <0 for bodyweight>,
          "notes": "<one beginner tip>"
        }
      ]
    }
  ]
}

Rules: 4-5 exercises on workout days, empty array on rest days. Beginner-appropriate weights.`;

  // ── Call 2: Meal plan (3 workout variants + 2 rest variants) ─────────────

  const restCalories = Math.round(targetCalories * 0.88);
  const restCarbsG = Math.round(carbsG * 0.75);

  const mealPrompt = buildMealPrompt({
    gender, age, goal, targetCalories, proteinG, carbsG, fatG,
    restCalories, restCarbsG,
    weekStartDate: new Date().toISOString().slice(0, 10),
    dietaryRestrictions, likedFoods, dislikedFoods,
    mealSimplicity, cookingSkill,
    extraContext: body.extraContext,
    proteinShakes: goal === "build_muscle" ? 1 : 0,
  });

  // ── Call 3: Shopping list ─────────────────────────────────────────────────

  const shoppingPrompt = `You are a UK nutritionist. Create a one-week shopping list as JSON only — no markdown, no explanation.

The weekly meal plan has these daily meals: breakfast, lunch, dinner${goal === "build_muscle" ? ", protein shake" : ""}.
Dietary restrictions: ${dietaryRestrictions?.join(", ") || "none"}. Cooking skill: ${cookingSkill}.

Return ONLY this JSON (10-18 items covering a full week):
{
  "weekStartDate": "${new Date().toISOString().slice(0, 10)}",
  "items": [
    {
      "id": "<unique_id>",
      "name": "<item>",
      "category": "<Proteins|Dairy|Produce|Grains|Condiments|Supplements>",
      "quantity": "<e.g. 1kg, 6 pack, 500ml>",
      "estimatedCostGbp": <number like 2.50>,
      "buyByDate": null,
      "tescoUrl": "https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent("<item name>")}",
      "asdaUrl": "https://groceries.asda.com/search/<item-name-hyphenated>",
      "morrisonsUrl": "https://groceries.morrisons.com/search?entry=<item+name+encoded>",
      "waitroseUrl": "https://www.waitrose.com/ecom/shop/search?searchTerm=<item+name+encoded>"
    }
  ]
}

Rules: each URL must use the actual item name encoded for that retailer's search format. Realistic UK prices.`;

  try {
    const [workoutRaw, mealRaw, shoppingRaw] = await Promise.all([
      callClaude(client, workoutPrompt),
      callClaude(client, mealPrompt),
      callClaude(client, shoppingPrompt),
    ]);

    const workoutPlan = parseJSON(workoutRaw, "workout");
    const mealPlan = parseJSON(mealRaw, "meal");
    const shoppingList = parseJSON(shoppingRaw, "shopping");

    // Ensure all 7 days are present (fill any missing as rest days)
    const existingDays = new Set((workoutPlan.weeklyRoutine as { dayOfWeek: number }[]).map((d) => d.dayOfWeek));
    for (const d of allDays) {
      if (!existingDays.has(d)) {
        workoutPlan.weeklyRoutine.push({ dayOfWeek: d, isWorkoutDay: false, exercises: [] });
      }
    }
    workoutPlan.weeklyRoutine.sort((a: { dayOfWeek: number }, b: { dayOfWeek: number }) => a.dayOfWeek - b.dayOfWeek);

    await saveActivePlan({ userId, planId: "active-workout", createdAt: new Date().toISOString(), ...workoutPlan }, "workout");
    await saveActivePlan({ userId, planId: "active-meal", createdAt: new Date().toISOString(), ...mealPlan }, "meal");
    await saveShoppingList({
      userId, listId: "active", createdAt: new Date().toISOString(),
      totalEstimatedCostGbp: (shoppingList.items as { estimatedCostGbp: number }[]).reduce((s, i) => s + i.estimatedCostGbp, 0),
      ...shoppingList,
    });
    await updateUser(userId, { onboardingComplete: true });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Plan generation failed";
    console.error("[onboarding] inner catch:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  } catch (err: unknown) {
    // Top-level safety net — ensures we always return JSON
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[onboarding] top-level catch:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
