"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { formatIngredient } from "@/lib/formatIngredient";
import {
  Flame, Beef, Wheat, Droplets, RefreshCw, CheckCircle2, Circle,
  Pencil, Plus, X, Trash2,
} from "lucide-react";
import type { MealPlan, MealTemplate, WorkoutPlan } from "@/lib/db/plans";
import type { DailyRecord, DailyPlanItem } from "@/lib/db/daily";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const todayDow = new Date().getDay();

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const MEAL_SCHEDULED_TIMES: Record<string, string> = {
  breakfast: "07:30", lunch: "12:30", snack: "15:00", dinner: "18:30",
};

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

// ─── Ingredient edit row ──────────────────────────────────────────────────────

interface IngRow { name: string; amountG: number; unit: string; }

function IngredientRow({
  ing, index, onChange, onDelete,
}: { ing: IngRow; index: number; onChange: (i: number, v: IngRow) => void; onDelete: (i: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        value={ing.name}
        onChange={(e) => onChange(index, { ...ing, name: e.target.value })}
        placeholder="Ingredient"
        className="flex-1 h-9 px-2.5 text-sm rounded-lg border border-border bg-muted focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <input
        type="number" inputMode="decimal"
        value={ing.amountG || ""}
        onChange={(e) => onChange(index, { ...ing, amountG: Number(e.target.value) })}
        placeholder="100"
        className="w-16 h-9 px-2 text-sm text-center rounded-lg border border-border bg-muted focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <input
        value={ing.unit}
        onChange={(e) => onChange(index, { ...ing, unit: e.target.value })}
        placeholder="g"
        className="w-11 h-9 px-2 text-sm text-center rounded-lg border border-border bg-muted focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <button
        type="button"
        onClick={() => onDelete(index)}
        className="w-8 h-9 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── Meal edit form (inline) ──────────────────────────────────────────────────

interface EditState {
  label: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  ingredients: IngRow[];
}

function makEditState(item: DailyPlanItem): EditState {
  return {
    label: item.label,
    calories: String(item.calories ?? ""),
    proteinG: String(item.proteinG ?? ""),
    carbsG: String(item.carbsG ?? ""),
    fatG: String(item.fatG ?? ""),
    ingredients: item.ingredients?.map((i) => ({ ...i })) ?? [],
  };
}

function MealEditForm({
  item,
  onSave,
  onCancel,
}: {
  item: DailyPlanItem;
  onSave: (updates: Partial<DailyPlanItem>) => Promise<void>;
  onCancel: () => void;
}) {
  const [state, setState] = useState<EditState>(() => makEditState(item));
  const [saving, setSaving] = useState(false);

  function set<K extends keyof EditState>(k: K, v: EditState[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  function updateIng(i: number, v: IngRow) {
    setState((s) => ({ ...s, ingredients: s.ingredients.map((r, j) => j === i ? v : r) }));
  }
  function deleteIng(i: number) {
    setState((s) => ({ ...s, ingredients: s.ingredients.filter((_, j) => j !== i) }));
  }
  function addIng() {
    setState((s) => ({ ...s, ingredients: [...s.ingredients, { name: "", amountG: 0, unit: "g" }] }));
  }

  async function handleSave() {
    setSaving(true);
    const cals = Number(state.calories) || 0;
    const protein = Number(state.proteinG) || 0;
    const carbs = Number(state.carbsG) || 0;
    const fat = Number(state.fatG) || 0;
    await onSave({
      label: state.label.trim() || item.label,
      calories: cals,
      proteinG: protein,
      carbsG: carbs,
      fatG: fat,
      detail: `${cals} kcal · P ${protein}g · C ${carbs}g · F ${fat}g`,
      ingredients: state.ingredients.filter((i) => i.name.trim()),
    });
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-3 pt-3 border-t border-border">
      <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">Editing meal</p>

      <Input
        label="Meal name"
        value={state.label}
        onChange={(e) => set("label", e.target.value)}
        placeholder="e.g. Chicken & rice"
      />

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Macros</p>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Calories (kcal)" type="number" inputMode="numeric"
            value={state.calories} onChange={(e) => set("calories", e.target.value)} placeholder="400" />
          <Input label="Protein (g)" type="number" inputMode="decimal"
            value={state.proteinG} onChange={(e) => set("proteinG", e.target.value)} placeholder="30" />
          <Input label="Carbs (g)" type="number" inputMode="decimal"
            value={state.carbsG} onChange={(e) => set("carbsG", e.target.value)} placeholder="50" />
          <Input label="Fat (g)" type="number" inputMode="decimal"
            value={state.fatG} onChange={(e) => set("fatG", e.target.value)} placeholder="10" />
        </div>
      </div>

      {state.ingredients.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-medium text-muted-foreground">Ingredients</p>
            <div className="flex gap-1 text-[10px] text-muted-foreground ml-auto">
              <span className="w-16 text-center">Amount</span>
              <span className="w-11 text-center">Unit</span>
              <span className="w-8" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {state.ingredients.map((ing, i) => (
              <IngredientRow key={i} ing={ing} index={i} onChange={updateIng} onDelete={deleteIng} />
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={addIng}
        className="flex items-center gap-1.5 text-xs text-primary font-medium self-start"
      >
        <Plus size={13} /> Add ingredient
      </button>

      <div className="flex gap-2 pt-1">
        <Button size="md" onClick={handleSave} loading={saving} className="flex-1">Save changes</Button>
        <Button size="md" variant="outline" onClick={onCancel} className="shrink-0">Cancel</Button>
      </div>
    </div>
  );
}

// ─── Meal card (from daily record item) ──────────────────────────────────────

function DailyMealCard({
  item,
  onUpdateItem,
}: {
  item: DailyPlanItem;
  onUpdateItem: (id: string, updates: Partial<DailyPlanItem>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const timeColors: Record<string, string> = {
    breakfast: "text-amber-500", lunch: "text-green-500",
    dinner: "text-blue-500", snack: "text-purple-500",
  };
  const timeLabel = item.scheduledTime
    ? item.scheduledTime <= "09:00" ? "breakfast"
      : item.scheduledTime <= "13:30" ? "lunch"
      : item.scheduledTime <= "16:30" ? "snack"
      : "dinner"
    : "meal";

  async function handleSave(updates: Partial<DailyPlanItem>) {
    await onUpdateItem(item.id, updates);
    setEditing(false);
  }

  return (
    <div className={cn("bg-white border rounded-2xl overflow-hidden", item.completed ? "border-green-200" : "border-border")}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => { if (!editing) setOpen((o) => !o); }}
          className="flex-1 flex items-center gap-3 p-4 text-left min-w-0"
        >
          <div className="shrink-0">
            {item.completed
              ? <CheckCircle2 size={18} className="text-primary" />
              : <Circle size={18} className="text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <span className={cn("text-xs font-bold uppercase tracking-wide", timeColors[timeLabel] ?? "text-muted-foreground")}>
              {cap(timeLabel)}
              {item.scheduledTime && (
                <span className="ml-1.5 font-normal normal-case text-muted-foreground">{item.scheduledTime}</span>
              )}
            </span>
            <p className={cn("font-semibold mt-0.5 leading-snug truncate", item.completed && "line-through text-muted-foreground")}>
              {cap(item.label)}
            </p>
          </div>
          {item.calories && (
            <span className="text-sm font-semibold text-primary shrink-0">{item.calories} kcal</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => { setEditing(true); setOpen(true); }}
          className="pr-4 pl-1 text-muted-foreground hover:text-primary transition-colors shrink-0"
          title="Edit meal"
        >
          <Pencil size={15} />
        </button>
      </div>

      {(open || editing) && (
        <div className="px-4 pb-4 border-t border-border">
          {editing ? (
            <MealEditForm item={item} onSave={handleSave} onCancel={() => setEditing(false)} />
          ) : (
            <>
              {(item.proteinG || item.carbsG || item.fatG) && (
                <div className="flex gap-2 mt-3 mb-3">
                  {item.proteinG ? <span className="text-xs rounded-lg px-2.5 py-1 border border-green-100 bg-green-50 text-green-700 font-medium">P: {item.proteinG}g</span> : null}
                  {item.carbsG ? <span className="text-xs rounded-lg px-2.5 py-1 border border-amber-100 bg-amber-50 text-amber-700 font-medium">C: {item.carbsG}g</span> : null}
                  {item.fatG ? <span className="text-xs rounded-lg px-2.5 py-1 border border-blue-100 bg-blue-50 text-blue-700 font-medium">F: {item.fatG}g</span> : null}
                </div>
              )}
              {item.ingredients && item.ingredients.length > 0 ? (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ingredients</p>
                  <div className="flex flex-col gap-1.5">
                    {item.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{cap(ing.name)}</span>
                        <span className="text-muted-foreground font-medium">
                          {formatIngredient(ing.name, ing.amountG, ing.unit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                item.detail && <p className="text-xs text-muted-foreground mt-3">{item.detail}</p>
              )}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                <Pencil size={12} /> Edit this meal
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Meal card (plan template — for upgrade banner preview) ──────────────────

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

// ─── Add custom meal panel ────────────────────────────────────────────────────

function AddMealPanel({
  onAdd,
  onClose,
}: {
  onAdd: (item: DailyPlanItem) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [time, setTime] = useState<"breakfast" | "lunch" | "snack" | "dinner">("lunch");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [ingredients, setIngredients] = useState<IngRow[]>([]);
  const [saving, setSaving] = useState(false);

  function updateIng(i: number, v: IngRow) {
    setIngredients((p) => p.map((r, j) => j === i ? v : r));
  }
  function deleteIng(i: number) {
    setIngredients((p) => p.filter((_, j) => j !== i));
  }

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    const cals = Number(calories) || 0;
    const prot = Number(protein) || 0;
    const carb = Number(carbs) || 0;
    const f = Number(fat) || 0;
    const item: DailyPlanItem = {
      id: `custom-${Date.now()}`,
      type: "meal",
      label: name.trim(),
      completed: false,
      scheduledTime: MEAL_SCHEDULED_TIMES[time],
      calories: cals,
      proteinG: prot,
      carbsG: carb,
      fatG: f,
      detail: `${cals} kcal · P ${prot}g · C ${carb}g · F ${f}g`,
      ingredients: ingredients.filter((i) => i.name.trim()),
    };
    await onAdd(item);
    setSaving(false);
  }

  return (
    <div className="bg-white border border-primary/30 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">Add custom meal</p>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>

      <Input
        label="Meal name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Chicken & rice"
      />

      <div>
        <p className="text-sm font-medium mb-2">Meal time</p>
        <div className="flex gap-2 flex-wrap">
          {(["breakfast", "lunch", "snack", "dinner"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTime(t)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all capitalize",
                time === t ? "bg-primary border-primary text-white" : "bg-muted border-border text-muted-foreground"
              )}
            >{t}</button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Macros</p>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Calories (kcal)" type="number" inputMode="numeric"
            value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="400" />
          <Input label="Protein (g)" type="number" inputMode="decimal"
            value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="30" />
          <Input label="Carbs (g)" type="number" inputMode="decimal"
            value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="50" />
          <Input label="Fat (g)" type="number" inputMode="decimal"
            value={fat} onChange={(e) => setFat(e.target.value)} placeholder="10" />
        </div>
      </div>

      {ingredients.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-medium text-muted-foreground">Ingredients</p>
            <div className="flex gap-1 text-[10px] text-muted-foreground ml-auto">
              <span className="w-16 text-center">Amount</span>
              <span className="w-11 text-center">Unit</span>
              <span className="w-8" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {ingredients.map((ing, i) => (
              <IngredientRow key={i} ing={ing} index={i} onChange={updateIng} onDelete={deleteIng} />
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIngredients((p) => [...p, { name: "", amountG: 0, unit: "g" }])}
        className="flex items-center gap-1.5 text-xs text-primary font-medium self-start"
      >
        <Plus size={13} /> Add ingredient (optional)
      </button>

      <Button size="md" onClick={handleAdd} loading={saving} disabled={!name.trim()}>
        Add to today
      </Button>
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
  const [showAddMeal, setShowAddMeal] = useState(false);

  async function loadPlans() {
    const [meal, workout] = await Promise.all([
      fetch("/api/plans?type=meal").then((r) => r.json()),
      fetch("/api/plans?type=workout").then((r) => r.json()),
    ]);
    setMealPlan(meal ?? null);
    setWorkoutPlan(workout ?? null);
  }

  const loadDay = useCallback(async (dow: number, force = false) => {
    setDayLoading(true);
    const date = dateForDow(dow);
    try {
      if (!force) {
        const res = await fetch(`/api/daily/${date}`);
        const existing = await res.json();
        if (existing?.items?.length) {
          setDailyRecord(existing);
          return;
        }
      }
      const gen = await fetch("/api/daily/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, force }),
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
    setShowAddMeal(false);
    loadDay(dow);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/ai/regenerate-meals", { method: "POST" });
      if (!res.ok) throw new Error();
      await loadPlans();
      setRegenDone(true);
      setDailyRecord(null);
      await loadDay(selectedDay, true);
    } catch {
      /* leave banner */
    } finally {
      setRegenerating(false);
    }
  }

  async function handleUpdateItem(itemId: string, updates: Partial<DailyPlanItem>) {
    const date = dateForDow(selectedDay);
    await fetch(`/api/daily/${date}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_item", itemId, updates }),
    });
    setDailyRecord((r) =>
      r ? { ...r, items: r.items.map((i) => i.id === itemId ? { ...i, ...updates } : i) } : null
    );
  }

  async function handleAddItem(item: DailyPlanItem) {
    const date = dateForDow(selectedDay);
    await fetch(`/api/daily/${date}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_item", item }),
    });
    setDailyRecord((r) =>
      r ? { ...r, items: [...r.items, item] } : null
    );
    setShowAddMeal(false);
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

      <div className="px-4 flex flex-col gap-4 pb-6">
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
            ) : (
              <>
                {mealItems.length > 0 && (
                  <p className="text-xs text-muted-foreground px-1">{mealItems.length} meals</p>
                )}
                {mealItems.map((item) => (
                  <DailyMealCard key={item.id} item={item} onUpdateItem={handleUpdateItem} />
                ))}

                {/* Add meal */}
                {showAddMeal ? (
                  <AddMealPanel onAdd={handleAddItem} onClose={() => setShowAddMeal(false)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddMeal(true)}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-all"
                  >
                    <Plus size={16} /> Add custom meal
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
