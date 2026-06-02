"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { Dumbbell, Plus, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { WorkoutPlan, DayRoutine, PlanExercise } from "@/lib/db/plans";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const today = new Date().getDay();

function ExerciseCard({ exercise }: { exercise: PlanExercise }) {
  const [open, setOpen] = useState(false);
  const [sets, setSets] = useState<{ reps: string; weightKg: string; done: boolean }[]>(
    Array.from({ length: exercise.sets }, () => ({
      reps: exercise.reps.split("-")[0] || exercise.reps,
      weightKg: String(exercise.startingWeightKg || 0),
      done: false,
    }))
  );

  async function handleLogSet(index: number) {
    const set = sets[index];
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
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, done: true } : s))
    );
  }

  return (
    <div className="bg-muted border border-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Dumbbell size={16} className="text-accent" />
          </div>
          <div>
            <p className="font-semibold text-sm">{exercise.name}</p>
            <p className="text-xs text-muted-foreground">
              {exercise.sets} × {exercise.reps} · {exercise.muscleGroup}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{exercise.startingWeightKg}kg</span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border">
          {exercise.notes && (
            <p className="text-xs text-muted-foreground mt-3 mb-4 italic">{exercise.notes}</p>
          )}
          <div className="flex flex-col gap-2 mt-3">
            {sets.map((set, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-6 text-center">
                  {i + 1}
                </span>
                <div className="flex gap-2 flex-1">
                  <Input
                    placeholder="Reps"
                    type="number"
                    inputMode="numeric"
                    value={set.reps}
                    onChange={(e) =>
                      setSets((prev) =>
                        prev.map((s, j) =>
                          j === i ? { ...s, reps: e.target.value } : s
                        )
                      )
                    }
                    className="h-9 text-sm"
                  />
                  <Input
                    placeholder="kg"
                    type="number"
                    inputMode="decimal"
                    value={set.weightKg}
                    onChange={(e) =>
                      setSets((prev) =>
                        prev.map((s, j) =>
                          j === i ? { ...s, weightKg: e.target.value } : s
                        )
                      )
                    }
                    className="h-9 text-sm"
                  />
                </div>
                <button
                  onClick={() => handleLogSet(i)}
                  className={cn(
                    "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-all",
                    set.done
                      ? "bg-primary border-primary text-white"
                      : "border-border text-muted-foreground"
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

export default function WorkoutPage() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(today);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plans?type=workout")
      .then((r) => r.json())
      .then((data) => {
        setPlan(data);
        setLoading(false);
      })
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

      {/* Day selector */}
      <div className="flex gap-1.5 px-4 pb-4 overflow-x-auto scrollbar-none">
        {DAY_NAMES.map((name, i) => {
          const isWorkoutDay = plan?.weeklyRoutine?.find((d) => d.dayOfWeek === i)?.isWorkoutDay;
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border min-w-[48px] transition-all",
                selectedDay === i
                  ? "bg-primary border-primary text-white"
                  : i === today
                  ? "border-primary/50 bg-primary/5 text-primary"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              <span className="text-xs font-medium">{name}</span>
              {isWorkoutDay && (
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    selectedDay === i ? "bg-white" : "bg-primary"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4 flex flex-col gap-3">
        {!plan ? (
          <Card className="text-center py-8">
            <p className="text-muted-foreground text-sm">
              Complete onboarding to see your workout plan.
            </p>
          </Card>
        ) : !dayRoutine || !dayRoutine.isWorkoutDay ? (
          <Card className="text-center py-8">
            <div className="text-4xl mb-3">🛋️</div>
            <p className="font-semibold">Rest day</p>
            <p className="text-sm text-muted-foreground mt-1">
              Recovery is just as important as training.
            </p>
          </Card>
        ) : (
          <>
            <p className="text-xs text-muted-foreground px-1">
              {dayRoutine.exercises.length} exercises · tap an exercise to log sets
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
