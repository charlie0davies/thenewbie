"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatIngredient } from "@/lib/formatIngredient";
import { Flame, Beef, Wheat, Droplets, RefreshCw } from "lucide-react";
import type { MealPlan, MealTemplate, WorkoutPlan } from "@/lib/db/plans";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const todayDow = new Date().getDay();

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// ─── Macro pill ───────────────────────────────────────────────────────────────

function MacroPill({ label, value, unit, color, icon }: {
  label: string; value: number; unit: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 bg-muted rounded-xl p-3 flex-1">
      <div className={cn("text-sm", color)}>{icon}</div>
      <span className="text-base font-bold">{value}</span>
      <span className="text-[10px] text-muted-foreground">{unit} {label}</span>
    </div>
  );
}

// ─── Meal card ────────────────────────────────────────────────────────────────

function MealCard({ meal }: { meal: MealTemplate }) {
  const [open, setOpen] = useState(false);
  const timeColors: Record<string, string> = {
    breakfast: "text-amber-500",
    lunch: "text-green-500",
    dinner: "text-blue-500",
    snack: "text-purple-500",
  };

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-bold uppercase tracking-wide", timeColors[meal.time])}>
              {cap(meal.time)}
            </span>
            {meal.prepMinutes > 0 && (
              <span className="text-xs text-muted-foreground">· {meal.prepMinutes} min</span>
            )}
          </div>
          <p className="font-semibold mt-0.5">{cap(meal.name)}</p>
        </div>
        <span className="text-sm font-semibold text-primary">{meal.calories} kcal</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border">
          <div className="flex gap-2 mt-3 mb-4">
            {[
              { label: `P: ${meal.proteinG}g`, color: "text-green-600 bg-green-50 border-green-100" },
              { label: `C: ${meal.carbsG}g`, color: "text-amber-600 bg-amber-50 border-amber-100" },
              { label: `F: ${meal.fatG}g`, color: "text-blue-600 bg-blue-50 border-blue-100" },
            ].map(({ label, color }) => (
              <span key={label} className={cn("text-xs rounded-lg px-2.5 py-1 border font-medium", color)}>{label}</span>
            ))}
          </div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Ingredients</p>
          <div className="flex flex-col gap-1.5">
            {meal.ingredients.map((ing, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{cap(ing.name)}</span>
                <span className="text-muted-foreground font-medium">
                  {formatIngredient(ing.name, ing.amountG, ing.unit)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NutritionPage() {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(todayDow);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [regenDone, setRegenDone] = useState(false);

  async function loadPlans() {
    setLoading(true);
    try {
      const [meal, workout] = await Promise.all([
        fetch("/api/plans?type=meal").then((r) => r.json()),
        fetch("/api/plans?type=workout").then((r) => r.json()),
      ]);
      setMealPlan(meal);
      setWorkoutPlan(workout);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPlans(); }, []);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/ai/regenerate-meals", { method: "POST" });
      if (!res.ok) throw new Error("Regeneration failed");
      await loadPlans();
      setRegenDone(true);
    } catch {
      // silently fail — banner stays
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasSplitMeals = !!(mealPlan?.workoutDayMeals?.length && mealPlan?.restDayMeals?.length);

  const isWorkoutDay = workoutPlan?.weeklyRoutine?.find((d) => d.dayOfWeek === selectedDay)?.isWorkoutDay ?? false;

  // Pick the right meal set for the selected day
  const meals: MealTemplate[] = mealPlan
    ? isWorkoutDay && mealPlan.workoutDayMeals?.length
      ? mealPlan.workoutDayMeals
      : !isWorkoutDay && mealPlan.restDayMeals?.length
      ? mealPlan.restDayMeals
      : mealPlan.mealTemplates ?? []
    : [];

  const displayCalories = isWorkoutDay || !mealPlan?.restDayCalories
    ? mealPlan?.dailyCalories ?? 0
    : mealPlan.restDayCalories;
  const displayProtein = mealPlan?.dailyProteinG ?? 0;
  const displayCarbs = isWorkoutDay || !mealPlan?.restDayCarbsG
    ? mealPlan?.dailyCarbsG ?? 0
    : mealPlan.restDayCarbsG;
  const displayFat = mealPlan?.dailyFatG ?? 0;

  const mealOrder = ["breakfast", "lunch", "snack", "dinner"];
  const sorted = [...meals].sort((a, b) => mealOrder.indexOf(a.time) - mealOrder.indexOf(b.time));

  return (
    <div>
      <Header title="Nutrition" subtitle="Your daily meal plan" />

      {/* Day selector */}
      <div className="grid grid-cols-7 gap-1 px-4 pb-4">
        {DAY_NAMES.map((name, i) => {
          const isDayWorkout = workoutPlan?.weeklyRoutine?.find((d) => d.dayOfWeek === i)?.isWorkoutDay;
          const isSelected = selectedDay === i;
          const isToday = i === todayDow;
          return (
            <button key={i} onClick={() => setSelectedDay(i)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 rounded-xl border transition-all",
                isSelected ? "bg-primary border-primary text-white" :
                isToday ? "border-primary/40 bg-orange-50 text-primary" :
                "border-border bg-white text-muted-foreground"
              )}
            >
              <span className="text-xs font-semibold">{DAY_SHORT[i]}</span>
              <span className={cn("text-[9px]", isSelected ? "text-white/80" : "text-muted-foreground")}>{name}</span>
              {isDayWorkout && (
                <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-primary")} />
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4 flex flex-col gap-4">
        {!mealPlan ? (
          <Card className="text-center py-8">
            <p className="text-muted-foreground text-sm">Complete onboarding to see your meal plan.</p>
          </Card>
        ) : (
          <>
            {/* Upgrade banner — show if plan doesn't have split meals yet */}
            {!hasSplitMeals && !regenDone && (
              <div className="flex items-center justify-between gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">Same meals showing every day?</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Tap to regenerate your plan with separate workout &amp; rest day meals.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleRegenerate}
                  loading={regenerating}
                  className="shrink-0 bg-amber-500 hover:bg-amber-400 border-0"
                >
                  <RefreshCw size={14} className="mr-1" /> Update
                </Button>
              </div>
            )}

            {regenDone && (
              <div className="p-3 bg-green-50 rounded-2xl border border-green-100 text-center text-sm text-green-700 font-medium">
                ✓ Meal plan updated with workout &amp; rest day meals!
              </div>
            )}

            {/* Day type badge */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border",
              isWorkoutDay ? "bg-orange-50 border-orange-100 text-orange-700" : "bg-blue-50 border-blue-100 text-blue-700"
            )}>
              <span>{isWorkoutDay ? "🏋️" : "🛋️"}</span>
              <span>{isWorkoutDay ? "Workout day — fuel up well" : "Rest day — lighter eating"}</span>
            </div>

            {/* Daily macros */}
            <Card>
              <CardHeader><CardTitle>Daily targets</CardTitle></CardHeader>
              <div className="flex gap-2">
                <MacroPill label="Calories" value={displayCalories} unit="kcal" color="text-primary" icon={<Flame size={14} />} />
                <MacroPill label="Protein" value={displayProtein} unit="g" color="text-green-600" icon={<Beef size={14} />} />
                <MacroPill label="Carbs" value={displayCarbs} unit="g" color="text-amber-500" icon={<Wheat size={14} />} />
                <MacroPill label="Fat" value={displayFat} unit="g" color="text-blue-500" icon={<Droplets size={14} />} />
              </div>
              {mealPlan.proteinShakesPerDay > 0 && (
                <p className="text-xs text-muted-foreground mt-3">+ {mealPlan.proteinShakesPerDay} protein shake/day</p>
              )}
            </Card>

            {/* Meals */}
            <p className="text-xs text-muted-foreground px-1">{sorted.length} meals · tap to see ingredients</p>
            {sorted.map((meal) => <MealCard key={meal.id} meal={meal} />)}
          </>
        )}
      </div>
    </div>
  );
}
