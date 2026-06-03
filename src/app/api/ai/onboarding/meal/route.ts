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

    const mealPrompt = buildMealPrompt({
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
