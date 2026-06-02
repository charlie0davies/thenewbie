import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { getUser } from "@/lib/db/users";
import { getActivePlan } from "@/lib/db/plans";

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
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { messages } = await req.json();

  const [userProfile, workoutPlan, mealPlan] = await Promise.all([
    getUser(userId),
    getActivePlan(userId, "workout"),
    getActivePlan(userId, "meal"),
  ]);

  const profileSummary = userProfile
    ? `Name: ${userProfile.name}, Age: ${userProfile.age}, Height: ${userProfile.heightCm}cm, Weight: ${userProfile.weightKg}kg, Goal: ${userProfile.goal}, Experience: ${userProfile.experience}`
    : "Profile not loaded";

  const system = `You are a friendly, expert personal trainer and nutritionist called "Coach" for The Newbie fitness app.
You help beginners understand their workouts, improve their form, and make the most of their diet plan.

USER PROFILE: ${profileSummary}

YOUR ROLE:
- Explain exercises clearly and how to do them with good form
- Answer nutrition questions relevant to their plan
- Motivate and support the user
- Suggest plan modifications (explain what to change, but don't actually edit the plan)
- Keep answers concise and practical — this is a mobile app

TONE: Friendly, encouraging, straightforward. No jargon without explanation.`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
