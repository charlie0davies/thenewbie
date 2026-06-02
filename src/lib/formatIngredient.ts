/**
 * Formats an ingredient amount into a natural, human-readable string.
 * The AI sometimes returns grams for things that should be pieces/slices.
 * This corrects common cases.
 */
export function formatIngredient(name: string, amountG: number, unit: string): string {
  const n = name.toLowerCase();
  const u = (unit || "g").toLowerCase().trim();

  // Already a natural unit — just display it
  const naturalUnits = ["piece", "pieces", "slice", "slices", "tbsp", "tsp", "cup", "cups", "scoop", "scoops", "sachet", "ml", "l", "litre", "litres"];
  if (naturalUnits.includes(u)) {
    const plural = amountG !== 1 && !["ml", "l", "litre", "litres"].includes(u);
    return `${amountG} ${plural ? pluralise(u) : u}`;
  }

  // --- Smart overrides for things that shouldn't show in grams ---

  // Eggs (~55-60g each)
  if (/\begg\b/.test(n)) {
    const count = Math.max(1, Math.round(amountG / 57));
    return `${count} egg${count !== 1 ? "s" : ""}`;
  }

  // Bread / toast (~35g per slice)
  if (/bread|toast/.test(n) && u === "g") {
    const slices = Math.max(1, Math.round(amountG / 35));
    return `${slices} slice${slices !== 1 ? "s" : ""}`;
  }

  // Whole fruits
  if (/\b(banana|apple|orange|pear|peach|mango|kiwi|plum)\b/.test(n) && u === "g") {
    return "1 piece";
  }

  // Tablespoon-appropriate (oils, sauces, butter, honey, peanut butter)
  if (/\b(oil|butter|honey|sauce|mayo|ketchup|peanut butter|jam|spread|syrup|vinegar|mustard)\b/.test(n) && u === "g" && amountG <= 60) {
    const tbsp = Math.max(1, Math.round(amountG / 15));
    return `${tbsp} tbsp`;
  }

  // Teaspoon-appropriate (spices, small condiments)
  if (/\b(salt|pepper|cumin|turmeric|paprika|cinnamon|garlic powder|onion powder|chili|chilli|oregano|basil|thyme)\b/.test(n) && u === "g" && amountG <= 10) {
    const tsp = Math.max(1, Math.round(amountG / 4));
    return `${tsp} tsp`;
  }

  // Canned goods — show the can descriptor if large
  if (/\b(can|tin)\b/.test(n) && u === "g" && amountG >= 200) {
    return `1 can`;
  }

  // Default
  if (u === "ml") return `${amountG}ml`;
  return `${amountG}g`;
}

function pluralise(unit: string): string {
  const map: Record<string, string> = {
    piece: "pieces",
    slice: "slices",
    tbsp: "tbsp",
    tsp: "tsp",
    cup: "cups",
    scoop: "scoops",
    sachet: "sachets",
  };
  return map[unit] ?? unit;
}
