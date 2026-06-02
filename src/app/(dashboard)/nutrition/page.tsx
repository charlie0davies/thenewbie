"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { Flame, Beef, Wheat, Droplets } from "lucide-react";
import type { MealPlan, MealTemplate } from "@/lib/db/plans";

function MacroPill({
  label,
  value,
  unit,
  color,
  icon,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 bg-muted rounded-xl p-3 flex-1">
      <div className={cn("text-sm", color)}>{icon}</div>
      <span className="text-base font-bold">{value}</span>
      <span className="text-[10px] text-muted-foreground">
        {unit} {label}
      </span>
    </div>
  );
}

function MealCard({ meal }: { meal: MealTemplate }) {
  const [open, setOpen] = useState(false);
  const timeColors: Record<string, string> = {
    breakfast: "text-amber-400",
    lunch: "text-green-400",
    dinner: "text-blue-400",
    snack: "text-purple-400",
  };

  return (
    <div className="bg-muted border border-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-semibold uppercase tracking-wide", timeColors[meal.time])}>
              {meal.time}
            </span>
            {meal.prepMinutes > 0 && (
              <span className="text-xs text-muted-foreground">· {meal.prepMinutes} min</span>
            )}
          </div>
          <p className="font-semibold mt-0.5">{meal.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-accent">{meal.calories} kcal</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border">
          <div className="flex gap-3 mt-3 mb-4">
            <div className="text-xs bg-background rounded-lg px-2 py-1 border border-border">
              P: <span className="font-medium">{meal.proteinG}g</span>
            </div>
            <div className="text-xs bg-background rounded-lg px-2 py-1 border border-border">
              C: <span className="font-medium">{meal.carbsG}g</span>
            </div>
            <div className="text-xs bg-background rounded-lg px-2 py-1 border border-border">
              F: <span className="font-medium">{meal.fatG}g</span>
            </div>
          </div>

          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Ingredients
          </p>
          <div className="flex flex-col gap-1.5">
            {meal.ingredients.map((ing, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{ing.name}</span>
                <span className="text-muted-foreground">
                  {ing.amountG}
                  {ing.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NutritionPage() {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plans?type=meal")
      .then((r) => r.json())
      .then((data) => {
        setPlan(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const meals = plan?.mealTemplates ?? [];
  const order = ["breakfast", "lunch", "dinner", "snack"];
  const sorted = [...meals].sort(
    (a, b) => order.indexOf(a.time) - order.indexOf(b.time)
  );

  return (
    <div>
      <Header title="Nutrition" subtitle="Your daily meal plan" />
      <div className="px-4 flex flex-col gap-4">
        {!plan ? (
          <Card className="text-center py-8">
            <p className="text-muted-foreground text-sm">
              Complete onboarding to see your meal plan.
            </p>
          </Card>
        ) : (
          <>
            {/* Daily macros */}
            <Card>
              <CardHeader>
                <CardTitle>Daily targets</CardTitle>
              </CardHeader>
              <div className="flex gap-2">
                <MacroPill
                  label="Calories"
                  value={plan.dailyCalories}
                  unit="kcal"
                  color="text-accent"
                  icon={<Flame size={14} />}
                />
                <MacroPill
                  label="Protein"
                  value={plan.dailyProteinG}
                  unit="g"
                  color="text-primary"
                  icon={<Beef size={14} />}
                />
                <MacroPill
                  label="Carbs"
                  value={plan.dailyCarbsG}
                  unit="g"
                  color="text-amber-400"
                  icon={<Wheat size={14} />}
                />
                <MacroPill
                  label="Fat"
                  value={plan.dailyFatG}
                  unit="g"
                  color="text-blue-400"
                  icon={<Droplets size={14} />}
                />
              </div>
              {plan.proteinShakesPerDay > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  + {plan.proteinShakesPerDay} protein shake/day
                </p>
              )}
            </Card>

            {/* Meals */}
            <p className="text-xs text-muted-foreground px-1">
              {meals.length} meals · tap to see ingredients
            </p>
            {sorted.map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
