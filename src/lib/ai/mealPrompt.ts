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
  const extra = p.extraContext ? `\nUser notes: ${p.extraContext}` : "";
  const isVeg = p.dietaryRestrictions?.some((r) =>
    ["vegetarian", "vegan"].includes(r.toLowerCase())
  );

  // Assign completely different protein sources per variant to force variety
  const workoutProteins = isVeg
    ? ["tofu", "chickpeas/lentils", "halloumi/eggs"]
    : ["chicken breast", "salmon/tuna", "lean beef/turkey mince"];
  const restProteins = isVeg
    ? ["eggs/cheese", "mixed beans"]
    : ["white fish/prawns", "eggs/cottage cheese"];

  return `You are a UK nutritionist. Return ONLY valid JSON — no markdown, no explanation, no extra text.

Profile: ${p.gender}, age ${p.age}, goal: ${p.goal}.
Workout-day calorie target: ${p.targetCalories} kcal | ${p.proteinG}g protein | ${p.carbsG}g carbs | ${p.fatG}g fat
Rest-day calorie target: ${p.restCalories} kcal | ${p.proteinG}g protein | ${p.restCarbsG}g carbs | ${p.fatG}g fat
Dietary restrictions: ${restrictions} | Likes: ${likes} | Dislikes: ${dislikes}
Simplicity: ${p.mealSimplicity ?? 2}/5 | Cooking skill: ${p.cookingSkill ?? "beginner"}${extra}

━━━ VARIETY RULES — THIS IS THE MOST IMPORTANT PART ━━━
Each variant MUST use a completely different main protein AND different ingredients.
Sharing the same main ingredient across variants is NOT allowed.

WORKOUT DAY VARIANT A — main protein: ${workoutProteins[0]}
  Breakfast: oats/porridge with fruit and seeds
  Lunch: ${workoutProteins[0]} with rice and vegetables
  Dinner: ${workoutProteins[0]} with sweet potato or pasta

WORKOUT DAY VARIANT B — main protein: ${workoutProteins[1]}
  Breakfast: scrambled eggs or omelette (NO oats)
  Lunch: ${workoutProteins[1]} with quinoa or couscous (NO rice)
  Dinner: ${workoutProteins[1]} with different vegetables to variant A

WORKOUT DAY VARIANT C — main protein: ${workoutProteins[2]}
  Breakfast: Greek yogurt or protein shake with granola (NO eggs, NO oats)
  Lunch: ${workoutProteins[2]} in wrap/pitta or with noodles (NO rice, NO quinoa)
  Dinner: ${workoutProteins[2]} with different carb to variants A and B

REST DAY VARIANT A — main protein: ${restProteins[0]}
  Lighter meals, more vegetables, no heavy carbs
  Must feel completely different from all workout variants

REST DAY VARIANT B — main protein: ${restProteins[1]}
  Different ingredients to rest variant A
  Could include soup, salad, lighter options
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return this EXACT JSON structure:
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
    [VARIANT_A_BREAKFAST, VARIANT_A_LUNCH, VARIANT_A_DINNER],
    [VARIANT_B_BREAKFAST, VARIANT_B_LUNCH, VARIANT_B_DINNER],
    [VARIANT_C_BREAKFAST, VARIANT_C_LUNCH, VARIANT_C_DINNER]
  ],
  "restDayVariants": [
    [REST_A_BREAKFAST, REST_A_LUNCH, REST_A_DINNER],
    [REST_B_BREAKFAST, REST_B_LUNCH, REST_B_DINNER]
  ]
}

Each meal object:
{
  "id": "unique_id_no_spaces",
  "name": "Full descriptive meal name",
  "time": "breakfast" | "lunch" | "dinner",
  "ingredients": [
    { "name": "ingredient name", "amountG": <number>, "unit": "piece|slice|tbsp|tsp|g|ml" }
  ],
  "calories": <number>,
  "proteinG": <number>,
  "carbsG": <number>,
  "fatG": <number>,
  "prepMinutes": <number>
}

UNIT RULES:
- Eggs → amountG = count, unit "piece"
- Bread/toast → amountG = slices, unit "slice"
- Whole fruit → amountG = 1, unit "piece"
- Oils/butter/honey/sauces ≤60g → tbsp count, unit "tbsp"
- Spices/seasonings ≤10g → tsp count, unit "tsp"
- Liquids → unit "ml" | Everything else → unit "g"

Max 5 ingredients per meal. Use realistic UK ingredients and portion sizes.`;
}
