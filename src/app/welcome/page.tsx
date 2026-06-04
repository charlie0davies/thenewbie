"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Apple, Zap, TrendingDown, TrendingUp, Heart, ArrowRight, Calendar } from "lucide-react";
import type { UserProfile, FitnessGoal } from "@/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Mifflin-St Jeor BMR → TDEE
function calcTDEE(user: UserProfile): number {
  const { weightKg, heightCm, age, gender, workoutDays } = user;
  const bmr = gender === "male"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const days = workoutDays?.length ?? 3;
  const multiplier = days <= 1 ? 1.2 : days <= 3 ? 1.375 : days <= 5 ? 1.55 : 1.725;
  return Math.round(bmr * multiplier);
}

interface GoalConfig {
  icon: React.ReactNode;
  headline: string;
  targetCalories: (tdee: number) => number;
  calorieLabel: string;
  points: string[];
  colour: string;
}

const GOAL_CONFIG: Record<FitnessGoal, GoalConfig> = {
  lose_weight: {
    icon: <TrendingDown size={22} />,
    headline: "You're here to lose weight",
    targetCalories: (tdee) => tdee - 500,
    calorieLabel: "daily calorie target",
    points: [
      "A **calorie deficit** means eating less than you burn — your body uses stored fat as fuel.",
      "At ~500 kcal/day under maintenance, expect to lose **0.5kg per week** safely.",
      "**Protein is your best friend** — it keeps you full and protects your muscle while you lose fat.",
      "Don't aim for perfection. **80% consistency** beats 100% for two weeks then giving up.",
    ],
    colour: "blue",
  },
  build_muscle: {
    icon: <TrendingUp size={22} />,
    headline: "You're here to build muscle",
    targetCalories: (tdee) => tdee + 300,
    calorieLabel: "daily calorie target",
    points: [
      "Muscle needs fuel — a small **calorie surplus** (~300 kcal/day) gives your body the energy to grow.",
      "**Progressive overload** is the key: gradually increase weight or reps each week.",
      "Aim for **1.6–2g of protein per kg** of bodyweight daily.",
      "Muscles grow during **rest, not training** — your sleep and recovery days matter.",
    ],
    colour: "orange",
  },
  maintain: {
    icon: <Heart size={22} />,
    headline: "You're here to stay toned",
    targetCalories: (tdee) => tdee,
    calorieLabel: "daily maintenance calories",
    points: [
      "Maintenance means **eating roughly what you burn** — your weight stays stable.",
      "Your training focuses on **improving strength and fitness** without bulk.",
      "**Consistency beats intensity** — showing up regularly is what changes your body.",
      "Track your progress by how you feel and perform, not just the scale.",
    ],
    colour: "green",
  },
  improve_fitness: {
    icon: <Zap size={22} />,
    headline: "You're here to get fitter",
    targetCalories: (tdee) => tdee,
    calorieLabel: "daily maintenance calories",
    points: [
      "Fitness improves through **progressive challenge** — push a little harder each week.",
      "Cardio builds your aerobic base; **strength training** boosts metabolism and protects your joints.",
      "Fuel your workouts well — **don't skip meals** on training days.",
      "Consistency is everything — **3 sessions a week** for 3 months beats any short-term push.",
    ],
    colour: "purple",
  },
};

const COLOUR_CLASSES = {
  blue: { bg: "bg-blue-50", border: "border-blue-100", icon: "bg-blue-100 text-blue-600", text: "text-blue-800", sub: "text-blue-600" },
  orange: { bg: "bg-orange-50", border: "border-orange-100", icon: "bg-orange-100 text-orange-600", text: "text-orange-800", sub: "text-orange-600" },
  green: { bg: "bg-green-50", border: "border-green-100", icon: "bg-green-100 text-green-600", text: "text-green-800", sub: "text-green-600" },
  purple: { bg: "bg-purple-50", border: "border-purple-100", icon: "bg-purple-100 text-purple-600", text: "text-purple-800", sub: "text-purple-600" },
};

function renderBold(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((u: UserProfile | null) => { setUser(u); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const goal = user.goal ?? "improve_fitness";
  const config = GOAL_CONFIG[goal];
  const colours = COLOUR_CLASSES[config.colour as keyof typeof COLOUR_CLASSES];
  const tdee = calcTDEE(user);
  const targetCals = config.targetCalories(tdee);
  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-lg mx-auto px-5 pt-10 flex flex-col gap-6">

          {/* Hero */}
          <div className="text-center flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
              <span className="text-3xl">🎉</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">You&apos;re all set, {firstName}!</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Your personalised workout, meals, and shopping list are ready.
              </p>
            </div>
          </div>

          {/* Goal card */}
          <div className={`${colours.bg} border ${colours.border} rounded-2xl p-4 flex flex-col gap-4`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${colours.icon} flex items-center justify-center`}>
                {config.icon}
              </div>
              <div>
                <p className={`font-semibold text-sm ${colours.text}`}>{config.headline}</p>
                <p className={`text-xs ${colours.sub}`}>Here&apos;s what that means for you</p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {config.points.map((point, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full ${colours.icon} flex items-center justify-center text-[10px] font-bold`}>
                    {i + 1}
                  </span>
                  <p className={`text-sm ${colours.text} leading-relaxed`}>
                    {renderBold(point)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Calorie target */}
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Apple size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{config.calorieLabel}</p>
              <p className="text-2xl font-bold">{targetCals} <span className="text-sm font-normal text-muted-foreground">kcal</span></p>
              <p className="text-xs text-muted-foreground">Maintenance: {tdee} kcal · Your meals are built around this</p>
            </div>
          </div>

          {/* Workout days */}
          {user.workoutDays && user.workoutDays.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Your training days</p>
                  <p className="text-xs text-muted-foreground">{user.workoutDays.length} sessions per week</p>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {DAY_NAMES.map((name, i) => (
                  <div
                    key={i}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                      user.workoutDays.includes(i)
                        ? "bg-primary border-primary text-white"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What's next */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-sm font-semibold mb-3">What&apos;s next</p>
            <div className="flex flex-col gap-2.5">
              {[
                { icon: <Dumbbell size={14} className="text-primary" />, text: "Check your Workout page to see your full programme" },
                { icon: <Apple size={14} className="text-primary" />, text: "Visit Today to tick off your first meals and exercises" },
                { icon: <Zap size={14} className="text-amber-500" />, text: "Ask Coach anything — form, swaps, nutrition questions" },
              ].map(({ icon, text }, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    {icon}
                  </div>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-pb">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push("/today")}
            className="w-full h-14 bg-primary text-white rounded-2xl font-semibold flex items-center justify-center gap-2 text-base"
          >
            Let&apos;s go! <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </main>
  );
}
