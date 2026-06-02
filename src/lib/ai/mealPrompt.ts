/**
 * Builds the meal-plan prompt used by both onboarding and regenerate-meals.
 * Asks for 3 workout-day variants + 2 rest-day variants so every day feels
 * different rather than repeating the same template.
 */
export interface MealPromptParams {
  gender: string;
  age: number;
  goal: string;
  targetCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  restCalories: number;
  restCarbsG: number;
  weekStartDate: string;
  dietaryRestrictions?: string[];
  likedFoods?: string;
  dislikedFoods?: string;
  mealSimplicity?: number;
  cookingSkill?: string;
  extraContext?: string;
  proteinShakes: number;
}

export function buildMealPrompt(p: MealPromptParams): string {
  const restrictions = p.dietaryRestrictions?.join(", ") || "none";
  const likes = p.likedFoods || "no preference";
  const dislikes = p.dislikedFoods || "none";
  const extra = p.extraContext ? `\nExtra context: ${p.extraContext}` : "";

  return `You are a UK nutritionist. Return JSON only — no markdown, no explanation.

Profile: ${p.gender}, age ${p.age}, goal: ${p.goal}.
Workout-day targets: ${p.targetCalories} kcal | ${p.proteinG}g protein | ${p.carbsG}g carbs | ${p.fatG}g fat
Rest-day targets: ${p.restCalories} kcal | ${p.proteinG}g protein | ${p.restCarbsG}g carbs | ${p.fatG}g fat
Dietary restrictions: ${restrictions}. Likes: ${likes}. Dislikes: ${dislikes}.
Simplicity: ${p.mealSimplicity ?? 2}/5. Cooking skill: ${p.cookingSkill ?? "beginner"}.${extra}

Generate:
- 3 different workout-day meal plans (A/B/C) — each should feel meaningfully different (different proteins, cooking styles, cuisines)
- 2 different rest-day meal plans (A/B) — lighter, more varied

Return ONLY this exact JSON structure:
{
  "dailyCalories": ${p.targetCalories},
  "dailyProteinG": ${p.proteinG},
  "dailyCarbsG": ${p.carbsG},
  "dailyFatG": ${p.fatG},
  "restDayCalories": ${p.restCalories},
  "restDayProteinG": ${p.proteinG},
  "restDayCarbsG": ${p.restCarbsG},
  "restDayFatG": ${p.fatG},
  "dailyWaterMl": 2500,
  "proteinShakesPerDay": ${p.proteinShakes},
  "mealTemplates": [],
  "workoutDayMeals": [],
  "restDayMeals": [],
  "workoutDayVariants": [
    [<meal>, <meal>, <meal>],
    [<meal>, <meal>, <meal>],
    [<meal>, <meal>, <meal>]
  ],
  "restDayVariants": [
    [<meal>, <meal>, <meal>],
    [<meal>, <meal>, <meal>]
  ]
}

Each <meal>:
{
  "id": "<unique across ALL meals — e.g. wd_a_breakfast>",
  "name": "<Meal name>",
  "time": "<breakfast|lunch|dinner>",
  "ingredients": [
    { "name": "<ingredient>", "amountG": <number>, "unit": "<piece|slice|tbsp|tsp|g|ml>" }
  ],
  "calories": <number>,
  "proteinG": <number>,
  "carbsG": <number>,
  "fatG": <number>,
  "prepMinutes": <number>
}

UNIT RULES (use natural units — not grams — for these):
- Eggs → amountG = egg count, unit "piece"
- Bread/toast → amountG = slice count, unit "slice"
- Whole fruit → amountG = 1, unit "piece"
- Oils/butter/honey/sauces (≤60g) → tbsp count, unit "tbsp"
- Spices/small seasonings (≤10g) → tsp count, unit "tsp"
- Liquids → unit "ml"
- Everything else → unit "g"

Other rules:
- Max 5 ingredients per meal
- workoutDayVariants: higher carbs + protein, fuel for training
- restDayVariants: lighter, fewer carbs, different enough to feel varied
- All three workout variants must be clearly different from each other (different main protein)
- Realistic UK ingredients and portion sizes`;
}
