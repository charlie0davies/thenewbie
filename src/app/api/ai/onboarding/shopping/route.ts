import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { saveShoppingList } from "@/lib/db/shopping";

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
    console.error(`[onboarding/shopping] Failed to parse ${label}. Raw tail:`, raw.slice(-300));
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
    const { goal, dietaryRestrictions, cookingSkill, dislikedFoods, extraContext } = body;
    const dislikes = dislikedFoods || "none";
    const hasExistingPlan = extraContext && extraContext.length > 200;
    const extraNote = hasExistingPlan
      ? `\nThe user has provided their existing meal plan below — base the shopping list on those specific meals and ingredients:\n${extraContext}`
      : "";

    const shoppingPrompt = `You are a UK nutritionist. Create a one-week shopping list as JSON only — no markdown, no explanation.

⚠️ ABSOLUTE RULE: NEVER include "${dislikes}" or any ingredient the user dislikes in the shopping list.
Dietary restrictions: ${dietaryRestrictions?.join(", ") || "none"}.${extraNote}
${!hasExistingPlan ? `The weekly meal plan has these daily meals: breakfast, lunch, dinner${goal === "build_muscle" ? ", protein shake" : ""}. Cooking skill: ${cookingSkill}.` : ""}

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
      "tescoUrl": "https://www.tesco.com/groceries/en-GB/search?query=<item+name+encoded>",
      "asdaUrl": "https://groceries.asda.com/search/<item-name-hyphenated>",
      "morrisonsUrl": "https://groceries.morrisons.com/search?entry=<item+name+encoded>",
      "waitroseUrl": "https://www.waitrose.com/ecom/shop/search?searchTerm=<item+name+encoded>"
    }
  ]
}

Rules: each URL must use the actual item name encoded for that retailer's search format. Realistic UK prices.`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: shoppingPrompt }],
    });
    if (msg.stop_reason === "max_tokens") throw new Error("Shopping list response was cut short");
    const shoppingRaw = (msg.content[0] as { type: string; text: string }).text;
    const shoppingList = parseJSON(shoppingRaw, "shopping");

    await saveShoppingList({
      userId, listId: "active", createdAt: new Date().toISOString(),
      totalEstimatedCostGbp: (shoppingList.items as { estimatedCostGbp: number }[]).reduce((s, i) => s + i.estimatedCostGbp, 0),
      ...shoppingList,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[onboarding/shopping]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
