import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatWeight(kg: number): string {
  return `${kg.toFixed(1)} kg`;
}

export function kgToStoneLbs(kg: number): { stone: number; lbs: number } {
  const totalLbs = kg / 0.453592;
  const stone = Math.floor(totalLbs / 14);
  const lbs = Math.round((totalLbs % 14) * 10) / 10;
  return { stone, lbs };
}

export function stoneLbsToKg(stone: number, lbs: number): number {
  return Math.round((stone * 14 + lbs) * 0.453592 * 10) / 10;
}

export function formatWeightSt(kg: number): string {
  const { stone, lbs } = kgToStoneLbs(kg);
  return `${stone}st ${lbs}lb`;
}

export function formatCurrency(gbp: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(gbp);
}

/** BMR via Mifflin-St Jeor, then apply activity multiplier */
export function calculateTDEE(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: "male" | "female" | "other",
  workoutDaysPerWeek: number
): number {
  const bmr =
    gender === "female"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
      : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;

  const multipliers = [1.2, 1.375, 1.375, 1.55, 1.55, 1.725, 1.725, 1.9];
  return Math.round(bmr * (multipliers[workoutDaysPerWeek] ?? 1.55));
}
