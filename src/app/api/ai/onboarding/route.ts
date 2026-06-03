import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { putUser } from "@/lib/db/users";
import { saveActivePlan } from "@/lib/db/plans";
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
    console.error(`[onboarding/workout] Failed to parse ${label}. Raw tail:`, raw.slice(-300));
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
      name, email, gender, age, heightCm, weightKg, targetWeightKg,
      goal, experience, workoutType, workoutDays, extraContext,
    } = body;

    const profile: UserProfile = {
      userId, name, email, gender, age, heightCm, weightKg, targetWeightKg, goal, experience, workoutType,
      workoutDays: [...workoutDays].sort((a: number, b: number) => a - b),
      createdAt: new Date().toISOString(),
    };
    await putUser(profile);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const workoutDayNames = (workoutDays as number[]).map((d) => dayNames[d]).join(", ");
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const hasExistingPlan = extraContext && extraContext.length > 200;
    const extraContextNote = extraContext
      ? `\n\nUSER'S ADDITIONAL CONTEXT (READ CAREFULLY):\n${extraContext}`
      : "";

    const workoutPrompt = `You are a personal trainer. Return ONLY valid JSON — no markdown, no explanation.

Profile: ${gender}, age ${age}, ${heightCm}cm, ${weightKg}kg, goal: ${goal}, experience: ${experience}, equipment: ${workoutType}.
Workout days (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat): ${workoutDayNames}. Rest days: the others.${extraContextNote}

${hasExistingPlan ? `CRITICAL: The user has provided their existing workout plan above. You MUST replicate it exactly — use the same exercises, sets, reps, and structure. Do not substitute or invent exercises. For days listed as rehab/stretching only, set isWorkoutDay: true and include those movements as exercises. Honour any injury notes (e.g. knee surgery — avoid loading the knee).` : `Rules: 6-10 exercises/movements per workout day (include warm-up, main lifts, and stretches/cool-down). Rest days have empty exercises array. Beginner-appropriate weights.`}

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
          "sets": <number>,
          "reps": "<e.g. 10 or 45 sec>",
          "restSeconds": <60-120>,
          "startingWeightKg": <0 for bodyweight>,
          "notes": "<one tip>"
        }
      ]
    }
  ]
}`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 6000,
      messages: [{ role: "user", content: workoutPrompt }],
    });
    if (msg.stop_reason === "max_tokens") throw new Error("Workout plan response was cut short");
    const workoutRaw = (msg.content[0] as { type: string; text: string }).text;
    const workoutPlan = parseJSON(workoutRaw, "workout");

    const existingDays = new Set((workoutPlan.weeklyRoutine as { dayOfWeek: number }[]).map((d) => d.dayOfWeek));
    for (const d of allDays) {
      if (!existingDays.has(d)) workoutPlan.weeklyRoutine.push({ dayOfWeek: d, isWorkoutDay: false, exercises: [] });
    }
    workoutPlan.weeklyRoutine.sort((a: { dayOfWeek: number }, b: { dayOfWeek: number }) => a.dayOfWeek - b.dayOfWeek);

    await saveActivePlan({ userId, planId: "active-workout", createdAt: new Date().toISOString(), ...workoutPlan }, "workout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[onboarding/workout]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
