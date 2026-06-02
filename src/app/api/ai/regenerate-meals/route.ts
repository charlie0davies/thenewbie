import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { getUser } from "@/lib/db/users";
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
    if (!profile) {
      return NextResponse.json({ error: "Profile not found — complete onboarding first" }, { status: 404 });
    }

    const { gender, age, heightCm, weightKg, goal, workoutDays } = profile;
    const body = await req.json().catch(() => ({}));

    const tdee = calculateTDEE(weightKg, heightCm, age, gender, workoutDays.length);
    const targetCalories = goal === "lose_weight" ? tdee - 400 : goal === "build_muscle" ? tdee + 250 : tdee;
    const proteinG = Math.round(weightKg * 2);
    const fatG = Math.round((targetCalories * 0.25) / 9);
    const carbsG = Math.round((targetCalories - proteinG * 4 - fatG * 9) / 4);
    const restCalories = Math.round(targetCalories * 0.88);
    const restCarbsG = Math.round(carbsG * 0.75);

    const prompt = buildMealPrompt({
      gender, age, goal, targetCalories, proteinG, carbsG, fatG,
      restCalories, restCarbsG,
      weekStartDate: new Date().toISOString().slice(0, 10),
      extraContext: body.extraContext,
      proteinShakes: goal === "build_muscle" ? 1 : 0,
    });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
