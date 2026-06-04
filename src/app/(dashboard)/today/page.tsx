"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Droplets,
  Dumbbell,
  Utensils,
  ChevronDown,
  ChevronUp,
  Pencil,
  ChevronRight,
  Camera,
  Flame,
} from "lucide-react";
import type { DailyRecord, DailyPlanItem } from "@/lib/db/daily";
import { formatIngredient } from "@/lib/formatIngredient";
import type { UserProfile } from "@/types";
import { useRef } from "react";

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const today = new Date().toISOString().slice(0, 10);

// ─── Quotes ───────────────────────────────────────────────────────────────────

const QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "Small steps every day lead to big results.",
  "Push yourself — no one else is going to do it for you.",
  "Every expert was once a beginner.",
  "Your body can do it. It's your mind you need to convince.",
  "Discipline is choosing what you want most over what you want now.",
  "The pain you feel today is the strength you'll feel tomorrow.",
  "Don't stop when it hurts. Stop when you're done.",
  "Motivation gets you started. Habit keeps you going.",
  "One day at a time. One rep at a time.",
  "You don't have to be extreme — just consistent.",
  "Progress, not perfection.",
  "The harder you work, the better you feel.",
  "Show up. Even on the bad days.",
  "Results happen over time, not overnight.",
  "Your future self will thank you.",
  "Eat well, train hard, sleep more.",
  "Strength comes from overcoming what you thought you couldn't.",
  "You are one workout away from a good mood.",
  "Take care of your body — it's the only place you have to live.",
  "Sweat, sacrifice, succeed.",
  "Tough times don't last. Tough people do.",
  "Success is the sum of small efforts repeated daily.",
  "Believe in yourself and all that you are.",
  "Train hard, recover harder.",
  "A little progress each day adds up to big results.",
  "Earn it.",
  "Be stronger than your excuses.",
];

function getDailyQuote(): string {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start.getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

function getSessionLabel(exercises: DailyPlanItem[]): { label: string; why: string } {
  if (!exercises.length) return { label: "Rest day", why: "Recovery is when your muscles actually grow." };
  const text = exercises.map((e) => e.label.toLowerCase()).join(" ");
  if (/bench|chest|push\s*up|tricep|overhead|shoulder press|dip/.test(text))
    return { label: "Push session", why: "Chest, shoulders & triceps today." };
  if (/row|pull\s*up|lat|deadlift|back|bicep|chin\s*up/.test(text))
    return { label: "Pull session", why: "Back & biceps — the pulling muscles." };
  if (/squat|leg press|lunge|quad|glute|hamstring|calf|rdl/.test(text))
    return { label: "Leg session", why: "Lower body — your biggest muscle group." };
  if (/cardio|run|jog|cycle|swim|hiit|treadmill/.test(text))
    return { label: "Cardio session", why: "Heart health & calorie burn." };
  return { label: `Workout · ${exercises.length} exercise${exercises.length > 1 ? "s" : ""}`, why: "Full body or mixed session." };
}

// ─── Daily Briefing ───────────────────────────────────────────────────────────

function DailyBriefing({
  record,
  userName,
}: {
  record: DailyRecord;
  userName: string;
}) {
  const storageKey = `briefing-seen-${today}`;
  const [collapsed, setCollapsed] = useState(() => {
    try { return !!localStorage.getItem(storageKey); } catch { return false; }
  });

  function dismiss() {
    try { localStorage.setItem(storageKey, "1"); } catch { /* noop */ }
    setCollapsed(true);
  }

  const exercises = record.items.filter((i) => i.type === "exercise");
  const meals = record.items.filter((i) => i.type === "meal");
  const { label: sessionLabel, why: sessionWhy } = getSessionLabel(exercises);
  const quote = getDailyQuote();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 18 ? "Hey" : "Evening";
  const name = userName ? `, ${userName.split(" ")[0]}` : "";

  const goals = [
    exercises.length > 0 && `Complete ${exercises.length} exercise${exercises.length > 1 ? "s" : ""}`,
    meals.length > 0 && "Hit your nutrition targets",
    `Drink ${(record.waterMlTarget / 1000).toFixed(1)}L of water`,
  ].filter(Boolean) as string[];

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 border border-orange-100 rounded-2xl text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">☀️</span>
          <div>
            <p className="text-xs font-semibold text-orange-800">{sessionLabel}</p>
            <p className="text-xs text-orange-600">{sessionWhy}</p>
          </div>
        </div>
        <ChevronRight size={14} className="text-orange-400 shrink-0" />
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-4 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-orange-900">{greeting}{name}! 💪</p>
          <p className="text-sm text-orange-700 mt-0.5">{sessionLabel}</p>
          <p className="text-xs text-orange-600">{sessionWhy}</p>
        </div>
        <button onClick={dismiss} className="text-xs text-orange-400 hover:text-orange-600 shrink-0 mt-0.5">
          Dismiss
        </button>
      </div>

      <div className="bg-white/60 rounded-xl px-3 py-2.5">
        <p className="text-xs italic text-orange-800">&ldquo;{quote}&rdquo;</p>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-orange-700 uppercase tracking-wide mb-2">Today&apos;s goals</p>
        <div className="flex flex-col gap-1.5">
          {goals.map((g) => (
            <div key={g} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-orange-300 shrink-0" />
              <p className="text-xs text-orange-800">{g}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Celebration burst ────────────────────────────────────────────────────────

const PARTICLE_COLORS = ["#f97316","#22c55e","#3b82f6","#ec4899","#eab308","#8b5cf6"];

function CelebrationBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
      {PARTICLE_COLORS.map((color, i) => {
        const angle = (i / PARTICLE_COLORS.length) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = 26;
        const tx = Math.round(Math.cos(rad) * dist);
        const ty = Math.round(Math.sin(rad) * dist);
        return (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: 6, height: 6, background: color,
              top: "50%", left: "50%",
              animationName: "particle-fly",
              animationDuration: "0.5s",
              animationTimingFunction: "ease-out",
              animationFillMode: "forwards",
              animationDelay: `${i * 15}ms`,
              "--tx": `${tx}px`,
              "--ty": `${ty}px`,
            } as React.CSSProperties}
          />
        );
      })}
    </span>
  );
}

// ─── Exercise Performance Logger ──────────────────────────────────────────────

function ExercisePerf({
  item,
  onUpdateItem,
}: {
  item: DailyPlanItem;
  onUpdateItem: (id: string, updates: Partial<DailyPlanItem>) => void;
}) {
  const hasSaved = item.actualSets !== undefined || item.actualReps !== undefined || item.actualWeightKg !== undefined;
  const [editing, setEditing] = useState(!hasSaved);
  const [sets, setSets] = useState(String(item.actualSets ?? item.sets ?? ""));
  const [reps, setReps] = useState(item.actualReps ?? item.reps ?? "");
  const [weight, setWeight] = useState(String(item.actualWeightKg ?? item.weightKg ?? ""));

  function handleLog() {
    onUpdateItem(item.id, {
      actualSets: sets ? Number(sets) : undefined,
      actualReps: reps || undefined,
      actualWeightKg: weight ? Number(weight) : undefined,
    });
    setEditing(false);
  }

  const isBodyweight = !item.weightKg;

  return (
    <div className="flex flex-col gap-2 mt-1">
      {item.sets && (
        <div className="bg-muted rounded-lg px-3 py-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Target</p>
          <p className="text-xs text-foreground font-medium">
            {item.sets} sets × {item.reps}
            {item.weightKg ? ` @ ${item.weightKg}kg` : " (bodyweight)"}
          </p>
        </div>
      )}

      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">What you did</p>
        {!editing && hasSaved ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            <p className="text-xs text-green-700 font-medium">
              ✓ {item.actualSets} sets × {item.actualReps || item.reps}
              {item.actualWeightKg ? ` @ ${item.actualWeightKg}kg` : ""}
            </p>
            <button onClick={() => setEditing(true)} className="text-xs text-muted-foreground hover:text-foreground ml-2">
              Edit
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <div className="flex flex-col items-center gap-1 flex-1">
              <input
                type="number" inputMode="numeric" placeholder={String(item.sets ?? "")}
                value={sets} onChange={(e) => setSets(e.target.value)}
                className="w-full h-10 text-center text-sm rounded-lg border border-border bg-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[10px] text-muted-foreground">sets</span>
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <input
                type="text" inputMode="numeric" placeholder={item.reps ?? "10"}
                value={reps} onChange={(e) => setReps(e.target.value)}
                className="w-full h-10 text-center text-sm rounded-lg border border-border bg-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[10px] text-muted-foreground">reps</span>
            </div>
            {!isBodyweight && (
              <div className="flex flex-col items-center gap-1 flex-1">
                <input
                  type="number" inputMode="decimal" placeholder={String(item.weightKg ?? "")}
                  value={weight} onChange={(e) => setWeight(e.target.value)}
                  className="w-full h-10 text-center text-sm rounded-lg border border-border bg-muted focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[10px] text-muted-foreground">kg</span>
              </div>
            )}
            <button
              onClick={handleLog}
              className="h-10 px-3 rounded-lg bg-primary text-white text-xs font-semibold shrink-0"
            >
              Log
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onToggle,
  onUpdateItem,
}: {
  item: DailyPlanItem;
  onToggle: (id: string, done: boolean) => void;
  onUpdateItem: (id: string, updates: Partial<DailyPlanItem>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(item.partialNote || "");
  const [editing, setEditing] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  function handleCheck(e: React.MouseEvent) {
    e.stopPropagation();
    if (!item.completed) {
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 650);
    }
    onToggle(item.id, !item.completed);
  }

  const icon =
    item.type === "exercise" ? (
      <Dumbbell size={16} className="text-accent shrink-0" />
    ) : item.type === "water" ? (
      <Droplets size={16} className="text-blue-400 shrink-0" />
    ) : (
      <Utensils size={16} className="text-primary shrink-0" />
    );

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200",
        item.completed ? "border-green-200 bg-green-50/60" : "border-border bg-white"
      )}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <button
          type="button"
          onClick={handleCheck}
          className="shrink-0 relative"
        >
          <CelebrationBurst active={celebrating} />
          {item.completed ? (
            <CheckCircle2
              size={22}
              className={cn("text-primary transition-transform", celebrating && "animate-check-pop")}
            />
          ) : (
            <Circle size={22} className="text-muted-foreground" />
          )}
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {icon}
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm font-medium leading-snug",
                item.completed && "line-through text-muted-foreground"
              )}
            >
              {item.label}
            </p>
            {item.detail && (
              <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
            )}
          </div>
        </div>

        {item.scheduledTime && (
          <span className="text-xs text-muted-foreground shrink-0">{item.scheduledTime}</span>
        )}
        {item.calories && (
          <span className="text-xs text-accent shrink-0">{item.calories} kcal</span>
        )}
        {expanded ? (
          <ChevronUp size={16} className="text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground shrink-0" />
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-2 border-t border-border flex flex-col gap-2">
          {/* Exercise: target + actual performance logger */}
          {item.type === "exercise" && (
            <ExercisePerf item={item} onUpdateItem={onUpdateItem} />
          )}

          {/* Meal ingredients */}
          {item.type === "meal" && item.ingredients && item.ingredients.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Ingredients</p>
              {item.ingredients.map((ing, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-foreground">{cap(ing.name)}</span>
                  <span className="text-muted-foreground font-medium">
                    {formatIngredient(ing.name, ing.amountG, ing.unit)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {/* Macros for meals */}
          {item.type === "meal" && (item.proteinG || item.carbsG || item.fatG) && (
            <div className="flex gap-2 mt-1">
              {item.proteinG ? <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-md border border-green-100 font-medium">P {item.proteinG}g</span> : null}
              {item.carbsG ? <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-100 font-medium">C {item.carbsG}g</span> : null}
              {item.fatG ? <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 font-medium">F {item.fatG}g</span> : null}
            </div>
          )}
          {!item.completed && (
            <div className="flex items-center gap-2 mt-1">
              {editing ? (
                <>
                  <input
                    className="flex-1 text-xs bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="What did you actually do?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onToggle(item.id, true);
                      setEditing(false);
                    }}
                  >
                    Save
                  </Button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Pencil size={12} /> Mark as partial / add note
                </button>
              )}
            </div>
          )}
          {item.partialNote && (
            <p className="text-xs text-amber-400">Note: {item.partialNote}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Water tracker ────────────────────────────────────────────────────────────

function WaterTracker({
  done,
  target,
  onAdd,
}: {
  done: number;
  target: number;
  onAdd: (ml: number) => void;
}) {
  const pct = Math.min(100, Math.round((done / target) * 100));
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets size={18} className="text-blue-400" />
          <span className="font-semibold text-sm">Water</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {(done / 1000).toFixed(1)}L / {(target / 1000).toFixed(1)}L
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-blue-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex gap-2 mb-2">
        {[200, 250, 500].map((ml) => (
          <button
            key={ml}
            onClick={() => onAdd(ml)}
            className="flex-1 py-2 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-blue-100"
          >
            +{ml}ml
          </button>
        ))}
      </div>
      <button
        onClick={() => onAdd(-250)}
        disabled={done <= 0}
        className="w-full py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors border border-border disabled:opacity-40"
      >
        − 250ml
      </button>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface ScanResult { meal: string; calories: number; proteinG: number; carbsG: number; fatG: number; }

function resizeForScan(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82).split(",")[1]);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function TodayPage() {
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [streak, setStreak] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<{ avgCals: number; workoutDays: number; weightChange: string | null } | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((u: UserProfile | null) => {
        if (u?.name) setUserName(u.name);
        if (u?.currentStreak) setStreak(u.currentStreak);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/daily/${today}`);
        const data = await res.json();

        const needsRefresh =
          !data?.items ||
          (data?.items?.length && data.items.filter((i: { type: string }) => i.type === "meal").every((i: { ingredients?: unknown[] }) => !i.ingredients?.length));

        if (!needsRefresh && data?.items) {
          setRecord(data);
        } else {
          const gen = await fetch("/api/daily/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: today, force: needsRefresh }),
          });
          if (gen.ok) {
            const generated = await gen.json();
            setRecord(generated?.items ? generated : null);
          }
        }
      } catch {
        // leave record as null
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleToggle(itemId: string, completed: boolean) {
    await fetch(`/api/daily/${today}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", itemId, completed }),
    });
    setRecord((r) =>
      r
        ? { ...r, items: r.items.map((i) => i.id === itemId ? { ...i, completed } : i) }
        : null
    );
  }

  async function handleUpdateItem(itemId: string, updates: Partial<DailyPlanItem>) {
    await fetch(`/api/daily/${today}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_item", itemId, updates }),
    });
    setRecord((r) =>
      r
        ? { ...r, items: r.items.map((i) => i.id === itemId ? { ...i, ...updates } : i) }
        : null
    );
  }

  async function handleScanFood(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanResult(null);
    try {
      const imageBase64 = await resizeForScan(file);
      const res = await fetch("/api/ai/scan-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mediaType: file.type }),
      });
      if (res.ok) setScanResult(await res.json());
    } finally {
      setScanning(false);
      e.target.value = "";
    }
  }

  async function handleLogScan() {
    if (!scanResult) return;
    const item: DailyPlanItem = {
      id: `scan_${Date.now()}`,
      type: "meal",
      label: scanResult.meal,
      detail: `${scanResult.calories} kcal · ${scanResult.proteinG}g protein`,
      calories: scanResult.calories,
      proteinG: scanResult.proteinG,
      carbsG: scanResult.carbsG,
      fatG: scanResult.fatG,
      completed: true,
    } as DailyPlanItem;
    await fetch(`/api/daily/${today}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_item", item }),
    });
    setRecord((r) => r ? { ...r, items: [...r.items, item] } : null);
    setScanResult(null);
  }

  async function loadWeeklySummary() {
    if (weeklySummary) return;
    try {
      const res = await fetch("/api/progress/summary");
      const data = await res.json();
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const recentNutrition = (data.nutrition || []).filter((d: { date: string }) => d.date >= sevenDaysAgo);
      const avgCals = recentNutrition.length
        ? Math.round(recentNutrition.reduce((s: number, d: { calories: number }) => s + d.calories, 0) / recentNutrition.length)
        : 0;
      const workoutDays = Object.values(data.exercises || {}).flat().filter(
        (e) => (e as { date: string }).date >= sevenDaysAgo
      ).length;
      setWeeklySummary({ avgCals, workoutDays, weightChange: null });
    } catch { /* noop */ }
  }

  async function handleAddWater(ml: number) {
    const newAmount = (record?.waterMlDone || 0) + ml;
    await fetch(`/api/daily/${today}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "water", waterMlDone: newAmount }),
    });
    setRecord((r) => (r ? { ...r, waterMlDone: newAmount } : null));
  }

  const dateLabel = format(new Date(), "EEEE, d MMMM");
  const meals = record?.items.filter((i) => i.type === "meal") ?? [];
  const exercises = record?.items.filter((i) => i.type === "exercise") ?? [];
  const completedCount = record?.items.filter((i) => i.completed).length ?? 0;
  const totalCount = record?.items.length ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <Header
        title="Today"
        subtitle={dateLabel}
        right={
          record && totalCount > 0 ? (
            <span className="text-xs text-muted-foreground">
              {completedCount}/{totalCount} done
            </span>
          ) : undefined
        }
      />

      <div className="px-4 flex flex-col gap-4">
        {!record ? (
          <Card className="text-center py-8">
            <p className="text-muted-foreground text-sm mb-3">
              No plan for today yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Complete your onboarding to get your first plan.
            </p>
          </Card>
        ) : (
          <>
            {/* Daily briefing */}
            <DailyBriefing record={record} userName={userName} />

            {/* Progress ring */}
            {totalCount > 0 && (
              <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl">
                <div className="relative w-14 h-14 shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" strokeWidth="5" stroke="#e5e7eb" fill="none" />
                    <circle
                      cx="28"
                      cy="28"
                      r="22"
                      strokeWidth="5"
                      stroke="#22c55e"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      strokeDashoffset={`${2 * Math.PI * 22 * (1 - completedCount / totalCount)}`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                    {Math.round((completedCount / totalCount) * 100)}%
                  </span>
                </div>
                <div>
                  <p className="font-semibold">Today&apos;s progress</p>
                  <p className="text-sm text-muted-foreground">
                    {completedCount} of {totalCount} tasks complete
                  </p>
                  {streak > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Flame size={12} className="text-orange-500" />
                      <span className="text-xs font-semibold text-orange-500">{streak} day streak</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Meals */}
            {meals.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Meals</h2>
                  <button
                    onClick={() => scanInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs text-primary font-medium"
                  >
                    <Camera size={13} /> {scanning ? "Scanning…" : "Scan food"}
                  </button>
                  <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanFood} />
                </div>
                {scanResult && (
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-3 flex flex-col gap-2">
                    <div>
                      <p className="font-semibold text-sm">{scanResult.meal}</p>
                      <p className="text-xs text-muted-foreground">{scanResult.calories} kcal · P {scanResult.proteinG}g · C {scanResult.carbsG}g · F {scanResult.fatG}g</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleLogScan} className="flex-1 py-2 text-xs font-semibold bg-primary text-white rounded-xl">Log to today</button>
                      <button onClick={() => setScanResult(null)} className="flex-1 py-2 text-xs font-medium border border-border rounded-xl text-muted-foreground">Dismiss</button>
                    </div>
                  </div>
                )}
                {meals.map((item) => (
                  <ItemRow key={item.id} item={item} onToggle={handleToggle} onUpdateItem={handleUpdateItem} />
                ))}
              </div>
            )}

            {/* Workout */}
            {exercises.length > 0 && (
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  Workout
                </h2>
                {exercises.map((item) => (
                  <ItemRow key={item.id} item={item} onToggle={handleToggle} onUpdateItem={handleUpdateItem} />
                ))}
              </div>
            )}

            {/* Water */}
            <WaterTracker
              done={record.waterMlDone}
              target={record.waterMlTarget}
              onAdd={handleAddWater}
            />

            {/* Weekly summary */}
            <button
              onClick={() => { setWeeklyOpen((o) => !o); if (!weeklyOpen) loadWeeklySummary(); }}
              className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-2xl text-left"
            >
              <span className="text-sm font-semibold">Last 7 days</span>
              {weeklyOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
            </button>
            {weeklyOpen && (
              <Card className="flex flex-col gap-3">
                {weeklySummary ? (
                  <div className="flex gap-3">
                    <div className="flex-1 text-center bg-orange-50 rounded-xl p-3">
                      <p className="text-[10px] text-muted-foreground mb-1">Avg calories</p>
                      <p className="text-xl font-bold text-primary">{weeklySummary.avgCals || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">kcal/day</p>
                    </div>
                    <div className="flex-1 text-center bg-blue-50 rounded-xl p-3">
                      <p className="text-[10px] text-muted-foreground mb-1">Workout days</p>
                      <p className="text-xl font-bold">{weeklySummary.workoutDays}</p>
                      <p className="text-[10px] text-muted-foreground">of 7 days</p>
                    </div>
                    <div className="flex-1 text-center bg-green-50 rounded-xl p-3">
                      <p className="text-[10px] text-muted-foreground mb-1">Streak</p>
                      <p className="text-xl font-bold text-green-600">{streak}</p>
                      <p className="text-[10px] text-muted-foreground">days</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
