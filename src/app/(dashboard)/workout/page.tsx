"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Dumbbell, Check, ChevronDown, ChevronUp, ExternalLink, Plus, Trash2, X, Clock, Flame, Timer } from "lucide-react";
import type { WorkoutPlan, DayRoutine, PlanExercise } from "@/lib/db/plans";

function estimateSessionMins(exercises: PlanExercise[]): number {
  const secs = exercises.reduce((t, ex) => {
    const rest = ex.restSeconds ?? 90;
    return t + ex.sets * 45 + (ex.sets - 1) * rest + 30;
  }, 0);
  return Math.round(secs / 60);
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const todayDow = new Date().getDay();

// ─── Exercise card ────────────────────────────────────────────────────────────

function ExerciseCard({ exercise, onDelete }: { exercise: PlanExercise; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [sets, setSets] = useState(
    Array.from({ length: exercise.sets || 1 }, () => ({
      reps: exercise.reps?.split("-")[0] || exercise.reps || "10",
      weightKg: String(exercise.startingWeightKg || 0),
      done: false,
    }))
  );
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function startRest(seconds: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestTimer(seconds);
    timerRef.current = setInterval(() => {
      setRestTimer((prev) => {
        if (prev === null || prev <= 1) { clearInterval(timerRef.current!); return null; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleLogSet(i: number) {
    const set = sets[i];
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "workout",
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: [{ reps: Number(set.reps), weightKg: Number(set.weightKg) }],
      }),
    });
    setSets((prev) => prev.map((s, j) => (j === i ? { ...s, done: true } : s)));
    const remaining = sets.filter((_, j) => j !== i && !sets[j].done).length;
    if (remaining > 0) startRest(exercise.restSeconds ?? 90);
  }

  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + " exercise form tutorial")}`;
  const allDone = sets.every((s) => s.done);
  const isBodyweight = !exercise.startingWeightKg || exercise.startingWeightKg === 0;

  return (
    <div className={cn("bg-white border rounded-2xl overflow-hidden transition-all", allDone ? "border-green-200" : "border-border")}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all", allDone ? "bg-green-100" : "bg-orange-50")}>
              <Dumbbell size={16} className={allDone ? "text-green-500" : "text-primary"} />
            </div>
            <div>
              <p className="font-semibold text-sm">{exercise.name}</p>
              <p className="text-xs text-muted-foreground">
                {exercise.sets} × {exercise.reps} · {exercise.muscleGroup} · {exercise.restSeconds ?? 90}s rest
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {allDone && <Check size={16} className="text-green-500" />}
            <span className="text-xs text-muted-foreground">{isBodyweight ? "BW" : `${exercise.startingWeightKg}kg`}</span>
            {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </div>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="pr-4 pl-1 text-muted-foreground hover:text-destructive transition-colors"
          title="Remove exercise"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-border">
          <div className="flex items-start justify-between gap-2 mt-3 mb-3">
            <div className="flex-1 flex flex-col gap-1">
              {exercise.notes && <p className="text-xs text-muted-foreground italic">{exercise.notes}</p>}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Timer size={11} />
                <span>Rest {exercise.restSeconds ?? 90}s between sets</span>
              </div>
            </div>
            <a href={ytUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 shrink-0">
              <ExternalLink size={12} /> How-to
            </a>
          </div>

          {restTimer !== null && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mt-1">
              <Timer size={14} className="text-blue-500 shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-blue-700">Rest — {restTimer}s</span>
                  <button onClick={() => { clearInterval(timerRef.current!); setRestTimer(null); }} className="text-blue-400 text-[10px]">Skip</button>
                </div>
                <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                    style={{ width: `${(restTimer / (exercise.restSeconds ?? 90)) * 100}%` }} />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium px-1">
              <span>Set</span><span>Reps</span><span>Weight (kg)</span>
            </div>
            {sets.map((set, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 text-center font-bold">{i + 1}</span>
                <div className="flex gap-2 flex-1">
                  <Input type="number" inputMode="numeric" value={set.reps}
                    onChange={(e) => setSets((p) => p.map((s, j) => j === i ? { ...s, reps: e.target.value } : s))}
                    className="h-9 text-sm" />
                  <Input type="number" inputMode="decimal" value={set.weightKg}
                    onChange={(e) => setSets((p) => p.map((s, j) => j === i ? { ...s, weightKg: e.target.value } : s))}
                    className="h-9 text-sm" />
                </div>
                <button onClick={() => handleLogSet(i)}
                  className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-all",
                    set.done ? "bg-primary border-primary text-white" : "border-border text-muted-foreground hover:border-primary")}>
                  <Check size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add exercise panel ───────────────────────────────────────────────────────

interface AddExerciseFormData {
  name: string;
  muscleGroup: string;
  sets: string;
  reps: string;
  weightKg: string;
  notes: string;
}

function AddExercisePanel({ onAdd, onClose }: { onAdd: (ex: PlanExercise) => void; onClose: () => void }) {
  const [form, setForm] = useState<AddExerciseFormData>({
    name: "", muscleGroup: "", sets: "3", reps: "10", weightKg: "0", notes: "",
  });

  function set(k: keyof AddExerciseFormData, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleAdd() {
    if (!form.name.trim()) return;
    const exercise: PlanExercise = {
      id: form.name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now(),
      name: form.name.trim(),
      muscleGroup: form.muscleGroup.trim() || "General",
      sets: Number(form.sets) || 3,
      reps: form.reps.trim() || "10",
      restSeconds: 90,
      startingWeightKg: Number(form.weightKg) || 0,
      notes: form.notes.trim() || undefined,
    };
    onAdd(exercise);
  }

  return (
    <div className="bg-white border border-primary/30 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">Add exercise</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>
      <Input label="Exercise name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Leg Press" />
      <div className="grid grid-cols-2 gap-2">
        <Input label="Muscle group" value={form.muscleGroup} onChange={(e) => set("muscleGroup", e.target.value)} placeholder="e.g. Legs" />
        <Input label="Sets" type="number" inputMode="numeric" value={form.sets} onChange={(e) => set("sets", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Reps / duration" value={form.reps} onChange={(e) => set("reps", e.target.value)} placeholder="e.g. 10 or 45 sec" />
        <Input label="Starting weight (kg)" type="number" inputMode="decimal" value={form.weightKg} onChange={(e) => set("weightKg", e.target.value)} hint="0=BW" />
      </div>
      <Input label="Notes (optional)" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. Keep back straight" />
      <Button size="md" onClick={handleAdd} disabled={!form.name.trim()}>Add to today</Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkoutPage() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(todayDow);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetch("/api/plans?type=workout")
      .then((r) => r.json())
      .then((data) => { setPlan(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const savePlan = useCallback(async (updated: WorkoutPlan) => {
    setSaving(true);
    try {
      await fetch("/api/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "workout", plan: updated }),
      });
    } finally {
      setSaving(false);
    }
  }, []);

  function handleDeleteExercise(exerciseId: string) {
    if (!plan) return;
    const updated: WorkoutPlan = {
      ...plan,
      weeklyRoutine: plan.weeklyRoutine.map((day) =>
        day.dayOfWeek === selectedDay
          ? { ...day, exercises: day.exercises.filter((e) => e.id !== exerciseId) }
          : day
      ),
    };
    setPlan(updated);
    savePlan(updated);
  }

  function handleAddExercise(exercise: PlanExercise) {
    if (!plan) return;
    const updated: WorkoutPlan = {
      ...plan,
      weeklyRoutine: plan.weeklyRoutine.map((day) =>
        day.dayOfWeek === selectedDay
          ? { ...day, exercises: [...day.exercises, exercise], isWorkoutDay: true }
          : day
      ),
    };
    setPlan(updated);
    savePlan(updated);
    setShowAdd(false);
  }

  const dayRoutine: DayRoutine | undefined = plan?.weeklyRoutine?.find((d) => d.dayOfWeek === selectedDay);
  const hasExercises = (dayRoutine?.exercises?.length ?? 0) > 0;
  const isRestDay = !dayRoutine?.isWorkoutDay && !hasExercises;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Header title="Workout" subtitle={saving ? "Saving..." : "Track your sets and reps"} />

      <div className="grid grid-cols-7 gap-1 px-4 pb-4">
        {DAY_NAMES.map((name, i) => {
          const routine = plan?.weeklyRoutine?.find((d) => d.dayOfWeek === i);
          const isActive = routine?.isWorkoutDay || (routine?.exercises?.length ?? 0) > 0;
          const isSelected = selectedDay === i;
          const isToday = i === todayDow;
          return (
            <button key={i} onClick={() => { setSelectedDay(i); setShowAdd(false); }}
              className={cn("flex flex-col items-center gap-0.5 py-2 rounded-xl border transition-all",
                isSelected ? "bg-primary border-primary text-white" :
                isToday ? "border-primary/40 bg-orange-50 text-primary" :
                "border-border bg-white text-muted-foreground"
              )}>
              <span className="text-xs font-semibold">{DAY_SHORT[i]}</span>
              <span className={cn("text-[9px]", isSelected ? "text-white/80" : "text-muted-foreground")}>{name}</span>
              {isActive && <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-primary")} />}
            </button>
          );
        })}
      </div>

      <div className="px-4 flex flex-col gap-3 pb-6">
        {!plan ? (
          <Card className="text-center py-8">
            <p className="text-muted-foreground text-sm">Complete onboarding to see your workout plan.</p>
          </Card>
        ) : isRestDay ? (
          <>
            <Card className="text-center py-8">
              <div className="text-4xl mb-3">🛋️</div>
              <p className="font-semibold">Rest day</p>
              <p className="text-sm text-muted-foreground mt-1">Recovery is just as important as training.</p>
            </Card>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-all">
              <Plus size={16} /> Add exercise to this day
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 px-1 flex-wrap">
              <p className="text-xs text-muted-foreground">
                {dayRoutine?.exercises.length ?? 0} exercises
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={11} />
                <span>~{estimateSessionMins(dayRoutine?.exercises ?? [])} min</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-orange-500">
                <Flame size={11} />
                <span>~{Math.round(estimateSessionMins(dayRoutine?.exercises ?? []) * 5)} kcal</span>
              </div>
            </div>
            {dayRoutine?.exercises.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} onDelete={() => handleDeleteExercise(ex.id)} />
            ))}
            {showAdd ? (
              <AddExercisePanel onAdd={handleAddExercise} onClose={() => setShowAdd(false)} />
            ) : (
              <button onClick={() => setShowAdd(true)}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-all">
                <Plus size={16} /> Add exercise
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
