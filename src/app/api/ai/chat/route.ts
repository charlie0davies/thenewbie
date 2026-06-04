import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { getUser, updateUser } from "@/lib/db/users";
import { getActivePlan } from "@/lib/db/plans";

const FREE_LIMIT = 5;

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

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [userProfile, workoutPlan, mealPlan] = await Promise.all([
    getUser(userId),
    getActivePlan(userId, "workout"),
    getActivePlan(userId, "meal"),
  ]);

  if (userProfile) {
    const plan = userProfile.plan ?? "free";
    const usedCount = userProfile.coachMessagesMonth === currentMonth
      ? (userProfile.coachMessagesUsed ?? 0) : 0;
    if (plan === "free" && usedCount >= FREE_LIMIT) {
      return NextResponse.json({ error: "limit_reached", used: usedCount, limit: FREE_LIMIT }, { status: 402 });
    }
    await updateUser(userId, {
      coachMessagesUsed: usedCount + 1,
      coachMessagesMonth: currentMonth,
    });
  }

  const profileSummary = userProfile
    ? `Name: ${userProfile.name}, Age: ${userProfile.age}, Height: ${userProfile.heightCm}cm, Weight: ${userProfile.weightKg}kg, Goal: ${userProfile.goal}, Experience: ${userProfile.experience}`
    : "Profile not loaded";

  const system = `You are "Coach" — expert personal trainer and nutritionist for The Newbie fitness app.

USER: ${profileSummary}

RESPONSE FORMAT — follow this exactly every time:
• One direct answer sentence first (no filler like "Great question!")
• Then 2-4 bullet points using • symbol for key details or steps
• Use **bold** for important terms, numbers, or exercise names
• End with a single short follow-up offer only when genuinely useful, e.g. "Want me to show you a progression plan?"
• Max 120 words total
• Never write full paragraphs — bullets only after the opening line

TONE: Direct, confident, supportive. No waffle.`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = await client.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
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
