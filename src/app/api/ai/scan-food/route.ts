import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";

export const maxDuration = 30;

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
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { imageBase64, mediaType = "image/jpeg" } = await req.json();
  if (!imageBase64) return NextResponse.json({ error: "No image" }, { status: 400 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: imageBase64 },
          },
          {
            type: "text",
            text: `Identify this food and estimate its nutritional content for the visible portion size.
Return ONLY valid JSON in this exact format, no other text:
{"meal":"<food name>","calories":<number>,"proteinG":<number>,"carbsG":<number>,"fatG":<number>}`,
          },
        ],
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  try {
    const result = JSON.parse(raw);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Could not parse food data" }, { status: 422 });
  }
}
