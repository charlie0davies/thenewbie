"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { Dumbbell, Check, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { WorkoutPlan, DayRoutine, PlanExercise } from "@/lib/db/plans";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const todayDow = new Date().getDay();

// ─── Exercise card ────────────────────────────────────────────────────────────

function ExerciseCard({ exercise }: { exercise: PlanExercise }) {
  const [open, setOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [sets, setSets] = useState(
    Array.from({ length: exercise.sets }, () => ({
      reps: exercise.reps.split("-")[0] || exercise.reps,
      weightKg: String(exercise.startingWeightKg || 0),
      done: false,
    }))
  );

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
  }

  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + " exercise form tutorial")}`;
  const allDone = sets.every((s) => s.done);

  return (
    <div className={cn("bg-white border rounded-2xl overflow-hidden transition-all", allDone ? "border-green-200" : "border-border")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all", allDone ? "bg-green-100" : "bg-orange-50")}>
            <Dumbbell size={16} className={allDone ? "text-green-500" : "text-primary"} />
          </div>
          <div>
            <p className="font-semibold text-sm">{exercise.name}</p>
            <p className="text-xs text-muted-foreground">
              {exercise.sets} × {exercise.reps} · {exercise.muscleGroup}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {allDone && <Check size={16} className="text-green-500" />}
          <span className="text-xs text-muted-foreground">{exercise.startingWeightKg ? `${exercise.startingWeightKg}kg` : "BW"}</span>
          {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border">
          {/* Notes + links */}
          <div className="flex items-start justify-between gap-2 mt-3 mb-3">
            <div className="flex-1">
              {exercise.notes && (
                <p className="text-xs text-muted-foreground italic">{exercise.notes}</p>
              )}
            </div>
            <a
              href={ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 shrink-0"
            >
              <ExternalLink size={12} /> How-to
            </a>
          </div>

          {/* Set logger */}
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
                <button
                  onClick={() => handleLogSet(i)}
                  className={cn(
                    "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-all",
                    set.done ? "bg-primary border-primary text-white" : "border-border text-muted-foreground hover:border-primary"
                  )}
                >
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkoutPage() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(todayDow);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plans?type=workout")
      .then((r) => r.json())
      .then((data) => { setPlan(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const dayRoutine: DayRoutine | undefined = plan?.weeklyRoutine?.find(
    (d) => d.dayOfWeek === selectedDay
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Header title="Workout" subtitle="Track your sets and reps" />

      {/* Day selector — grid fits all 7 on one line */}
      <div className="grid grid-cols-7 gap-1 px-4 pb-4">
        {DAY_NAMES.map((name, i) => {
          const isWorkoutDay = plan?.weeklyRoutine?.find((d) => d.dayOfWeek === i)?.isWorkoutDay;
          const isSelected = selectedDay === i;
          const isToday = i === todayDow;
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 rounded-xl border transition-all",
                isSelected ? "bg-primary border-primary text-white" :
                isToday ? "border-primary/40 bg-orange-50 text-primary" :
                "border-border bg-white text-muted-foreground"
              )}
            >
              <span className="text-xs font-semibold">{DAY_SHORT[i]}</span>
              <span className={cn("text-[9px]", isSelected ? "text-white/80" : "text-muted-foreground")}>
                {name}
              </span>
              {isWorkoutDay && (
                <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-primary")} />
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4 flex flex-col gap-3">
        {!plan ? (
          <Card className="text-center py-8">
            <p className="text-muted-foreground text-sm">Complete onboarding to see your workout plan.</p>
          </Card>
        ) : !dayRoutine || !dayRoutine.isWorkoutDay ? (
          <Card className="text-center py-8">
            <div className="text-4xl mb-3">🛋️</div>
            <p className="font-semibold">Rest day</p>
            <p className="text-sm text-muted-foreground mt-1">Recovery is just as important as training.</p>
          </Card>
        ) : (
          <>
            <p className="text-xs text-muted-foreground px-1">
              {dayRoutine.exercises.length} exercises · tap to log sets · How-to links included
            </p>
            {dayRoutine.exercises.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
