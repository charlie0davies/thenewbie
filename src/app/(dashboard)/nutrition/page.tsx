"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatIngredient } from "@/lib/formatIngredient";
import { Flame, Beef, Wheat, Droplets, RefreshCw, CheckCircle2, Circle } from "lucide-react";
import type { MealPlan, MealTemplate, WorkoutPlan } from "@/lib/db/plans";
import type { DailyRecord, DailyPlanItem } from "@/lib/db/daily";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const todayDow = new Date().getDay();

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Get the ISO date for a given day-of-week in the current week */
function dateForDow(dow: number): string {
  const today = new Date();
  const diff = dow - today.getDay();
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

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

// ─── Meal card (from daily record item) ──────────────────────────────────────

function DailyMealCard({ item }: { item: DailyPlanItem }) {
  const [open, setOpen] = useState(false);
  const timeColors: Record<string, string> = {
    breakfast: "text-amber-500",
    lunch: "text-green-500",
    dinner: "text-blue-500",
    snack: "text-purple-500",
  };

  // Infer time from scheduledTime
  const timeLabel = item.scheduledTime
    ? item.scheduledTime <= "09:00" ? "breakfast"
      : item.scheduledTime <= "13:30" ? "lunch"
      : item.scheduledTime <= "16:30" ? "snack"
      : "dinner"
    : "meal";

  return (
    <div className={cn("bg-white border rounded-2xl overflow-hidden", item.completed ? "border-green-200" : "border-border")}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-left gap-3"
      >
        <div className="flex items-center gap-2 shrink-0">
          {item.completed
            ? <CheckCircle2 size={18} className="text-primary" />
            : <Circle size={18} className="text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <span className={cn("text-xs font-bold uppercase tracking-wide", timeColors[timeLabel] ?? "text-muted-foreground")}>
            {cap(timeLabel)}
            {item.scheduledTime && <span className="ml-1.5 font-normal normal-case text-muted-foreground">{item.scheduledTime}</span>}
          </span>
          <p className={cn("font-semibold mt-0.5 truncate", item.completed && "line-through text-muted-foreground")}>
            {cap(item.label)}
          </p>
        </div>
        {item.calories && <span className="text-sm font-semibold text-primary shrink-0">{item.calories} kcal</span>}
      </button>

      {open && item.detail && (
        <div className="px-4 pb-4 border-t border-border">
          <p className="text-xs text-muted-foreground mt-3">{item.detail}</p>
        </div>
      )}
    </div>
  );
}

// ─── Meal card (from plan template — for upgrade banner preview) ──────────────

function TemplateMealCard({ meal }: { meal: MealTemplate }) {
  const [open, setOpen] = useState(false);
  const timeColors: Record<string, string> = {
    breakfast: "text-amber-500", lunch: "text-green-500",
    dinner: "text-blue-500", snack: "text-purple-500",
  };

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <span className={cn("text-xs font-bold uppercase tracking-wide", timeColors[meal.time])}>{cap(meal.time)}</span>
          <p className="font-semibold mt-0.5">{cap(meal.name)}</p>
        </div>
        <span className="text-sm font-semibold text-primary">{meal.calories} kcal</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border">
          <div className="flex gap-2 mt-3 mb-3">
            {[`P: ${meal.proteinG}g`, `C: ${meal.carbsG}g`, `F: ${meal.fatG}g`].map((t) => (
              <span key={t} className="text-xs rounded-lg px-2.5 py-1 border border-border bg-muted font-medium">{t}</span>
            ))}
          </div>
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
  const [dailyRecord, setDailyRecord] = useState<DailyRecord | null>(null);
  const [selectedDay, setSelectedDay] = useState(todayDow);
  const [loading, setLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenDone, setRegenDone] = useState(false);

  async function loadPlans() {
    const [meal, workout] = await Promise.all([
      fetch("/api/plans?type=meal").then((r) => r.json()),
      fetch("/api/plans?type=workout").then((r) => r.json()),
    ]);
    setMealPlan(meal ?? null);
    setWorkoutPlan(workout ?? null);
  }

  // Fetch or generate the daily record for a given day-of-week
  const loadDay = useCallback(async (dow: number) => {
    setDayLoading(true);
    const date = dateForDow(dow);
    try {
      const res = await fetch(`/api/daily/${date}`);
      const existing = await res.json();
      if (existing?.items?.length) {
        setDailyRecord(existing);
        return;
      }
      // Not yet generated — create it
      const gen = await fetch("/api/daily/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const generated = await gen.json();
      setDailyRecord(generated?.items?.length ? generated : null);
    } catch {
      setDailyRecord(null);
    } finally {
      setDayLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadPlans();
      await loadDay(todayDow);
      setLoading(false);
    }
    init();
  }, [loadDay]);

  function handleSelectDay(dow: number) {
    setSelectedDay(dow);
    loadDay(dow);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/ai/regenerate-meals", { method: "POST" });
      if (!res.ok) throw new Error();
      await loadPlans();
      setRegenDone(true);
      // Reload current day with new plan
      await loadDay(selectedDay);
    } catch {
      /* leave banner */
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

  const hasSplitVariants = !!(mealPlan?.workoutDayVariants?.length && mealPlan?.restDayVariants?.length);
  const isWorkoutDay = workoutPlan?.weeklyRoutine?.find((d) => d.dayOfWeek === selectedDay)?.isWorkoutDay ?? false;

  const displayCalories = isWorkoutDay || !mealPlan?.restDayCalories
    ? mealPlan?.dailyCalories ?? 0
    : mealPlan.restDayCalories;
  const displayProtein = mealPlan?.dailyProteinG ?? 0;
  const displayCarbs = isWorkoutDay || !mealPlan?.restDayCarbsG
    ? mealPlan?.dailyCarbsG ?? 0
    : mealPlan.restDayCarbsG;
  const displayFat = mealPlan?.dailyFatG ?? 0;

  const mealItems = dailyRecord?.items.filter((i) => i.type === "meal") ?? [];

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
            <button key={i} onClick={() => handleSelectDay(i)}
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
            {/* Upgrade banner */}
            {!hasSplitVariants && !regenDone && (
              <div className="flex items-center justify-between gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">Each day shows the same meals?</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Tap Update to regenerate with 5 unique daily meal plans.
                  </p>
                </div>
                <Button size="sm" onClick={handleRegenerate} loading={regenerating}
                  className="shrink-0 bg-amber-500 hover:bg-amber-400 border-0 text-white"
                >
                  <RefreshCw size={14} className="mr-1" /> Update
                </Button>
              </div>
            )}

            {regenDone && (
              <div className="p-3 bg-green-50 rounded-2xl border border-green-100 text-center text-sm text-green-700 font-medium">
                ✓ Meal plan updated — each day now has unique meals!
              </div>
            )}

            {/* Day type + date */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border",
              isWorkoutDay ? "bg-orange-50 border-orange-100 text-orange-700" : "bg-blue-50 border-blue-100 text-blue-700"
            )}>
              <span>{isWorkoutDay ? "🏋️" : "🛋️"}</span>
              <span>{isWorkoutDay ? "Workout day — fuel up well" : "Rest day — lighter eating"}</span>
              <span className="ml-auto text-xs opacity-70">{dateForDow(selectedDay)}</span>
            </div>

            {/* Daily macro targets */}
            <Card>
              <CardHeader><CardTitle>Daily targets</CardTitle></CardHeader>
              <div className="flex gap-2">
                <MacroPill label="Calories" value={displayCalories} unit="kcal" color="text-primary" icon={<Flame size={14} />} />
                <MacroPill label="Protein" value={displayProtein} unit="g" color="text-green-600" icon={<Beef size={14} />} />
                <MacroPill label="Carbs" value={displayCarbs} unit="g" color="text-amber-500" icon={<Wheat size={14} />} />
                <MacroPill label="Fat" value={displayFat} unit="g" color="text-blue-500" icon={<Droplets size={14} />} />
              </div>
            </Card>

            {/* Meals for selected day */}
            {dayLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : mealItems.length ? (
              <>
                <p className="text-xs text-muted-foreground px-1">{mealItems.length} meals</p>
                {mealItems.map((item) => (
                  <DailyMealCard key={item.id} item={item} />
                ))}
              </>
            ) : (
              <Card className="text-center py-6">
                <p className="text-muted-foreground text-sm">No meals generated for this day yet.</p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
