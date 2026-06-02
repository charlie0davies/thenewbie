"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "aws-amplify/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, ChevronLeft, Dumbbell, Apple, Flame } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  gender: string;
  age: string;
  heightCm: string;
  weightKg: string;
  goal: string;
  experience: string;
  workoutType: string;
  workoutDays: number[];
  dietaryRestrictions: string[];
  likedFoods: string;
  dislikedFoods: string;
  mealSimplicity: number;
  cookingSkill: string;
}

const STEPS = ["About you", "Your goal", "Workouts", "Diet", "Building plan"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Option chips ─────────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
        selected
          ? "bg-primary border-primary text-white"
          : "bg-muted border-border text-foreground"
      )}
    >
      {label}
    </button>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function StepAbout({
  data,
  set,
}: {
  data: FormData;
  set: (k: keyof FormData, v: unknown) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Input
        label="Full name"
        value={data.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="Charlie Davies"
      />
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-300">Gender</label>
        <div className="flex gap-2 flex-wrap">
          {["male", "female", "other"].map((g) => (
            <Chip
              key={g}
              label={g.charAt(0).toUpperCase() + g.slice(1)}
              selected={data.gender === g}
              onClick={() => set("gender", g)}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Age"
          type="number"
          inputMode="numeric"
          value={data.age}
          onChange={(e) => set("age", e.target.value)}
          placeholder="25"
        />
        <Input
          label="Height (cm)"
          type="number"
          inputMode="numeric"
          value={data.heightCm}
          onChange={(e) => set("heightCm", e.target.value)}
          placeholder="175"
        />
        <Input
          label="Weight (kg)"
          type="number"
          inputMode="decimal"
          value={data.weightKg}
          onChange={(e) => set("weightKg", e.target.value)}
          placeholder="75"
        />
      </div>
    </div>
  );
}

function StepGoal({
  data,
  set,
}: {
  data: FormData;
  set: (k: keyof FormData, v: unknown) => void;
}) {
  const goals = [
    { id: "lose_weight", label: "Lose weight", desc: "Burn fat, feel lighter" },
    { id: "build_muscle", label: "Build muscle", desc: "Get stronger and bigger" },
    { id: "maintain", label: "Stay toned", desc: "Maintain & improve fitness" },
    { id: "improve_fitness", label: "Get fitter", desc: "Cardio & general health" },
  ];
  return (
    <div className="flex flex-col gap-3">
      {goals.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => set("goal", g.id)}
          className={cn(
            "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
            data.goal === g.id
              ? "border-primary bg-primary/10"
              : "border-border bg-muted"
          )}
        >
          <div>
            <p className="font-semibold">{g.label}</p>
            <p className="text-sm text-muted-foreground">{g.desc}</p>
          </div>
          {data.goal === g.id && (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Check size={14} className="text-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function StepWorkout({
  data,
  set,
}: {
  data: FormData;
  set: (k: keyof FormData, v: unknown) => void;
}) {
  function toggleDay(d: number) {
    const current = data.workoutDays;
    set(
      "workoutDays",
      current.includes(d) ? current.filter((x) => x !== d) : [...current, d]
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-300">Experience level</label>
        <div className="flex flex-col gap-2">
          {[
            { id: "complete_beginner", label: "Complete beginner", desc: "Never trained before" },
            { id: "some_experience", label: "Some experience", desc: "Trained a few times" },
            { id: "intermediate", label: "Intermediate", desc: "Training 6+ months" },
          ].map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => set("experience", e.id)}
              className={cn(
                "flex items-center justify-between p-3.5 rounded-xl border transition-all text-left",
                data.experience === e.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted"
              )}
            >
              <div>
                <p className="font-medium text-sm">{e.label}</p>
                <p className="text-xs text-muted-foreground">{e.desc}</p>
              </div>
              {data.experience === e.id && (
                <Check size={16} className="text-primary shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-300">Workout location</label>
        <div className="flex gap-2">
          {[
            { id: "gym", label: "Gym" },
            { id: "home", label: "Home" },
            { id: "both", label: "Both" },
          ].map((w) => (
            <Chip
              key={w.id}
              label={w.label}
              selected={data.workoutType === w.id}
              onClick={() => set("workoutType", w.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-300">
          Workout days <span className="text-muted-foreground">({data.workoutDays.length} selected)</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {DAY_NAMES.map((name, i) => (
            <Chip
              key={i}
              label={name}
              selected={data.workoutDays.includes(i)}
              onClick={() => toggleDay(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepDiet({
  data,
  set,
}: {
  data: FormData;
  set: (k: keyof FormData, v: unknown) => void;
}) {
  const restrictions = ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Halal", "Kosher"];

  function toggleRestriction(r: string) {
    const cur = data.dietaryRestrictions;
    set(
      "dietaryRestrictions",
      cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-300">Dietary restrictions</label>
        <div className="flex flex-wrap gap-2">
          {restrictions.map((r) => (
            <Chip
              key={r}
              label={r}
              selected={data.dietaryRestrictions.includes(r)}
              onClick={() => toggleRestriction(r)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-300">
          Meal simplicity
          <span className="text-muted-foreground ml-2 font-normal">
            {["", "Very simple", "Simple", "Moderate", "Quite involved", "Elaborate"][data.mealSimplicity]}
          </span>
        </label>
        <input
          type="range"
          min={1}
          max={5}
          value={data.mealSimplicity}
          onChange={(e) => set("mealSimplicity", Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Quick &amp; easy</span>
          <span>Chef-level</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-300">Cooking skill</label>
        <div className="flex gap-2 flex-wrap">
          {["Beginner", "Intermediate", "Advanced"].map((s) => (
            <Chip
              key={s}
              label={s}
              selected={data.cookingSkill === s.toLowerCase()}
              onClick={() => set("cookingSkill", s.toLowerCase())}
            />
          ))}
        </div>
      </div>

      <Input
        label="Foods you love (optional)"
        value={data.likedFoods}
        onChange={(e) => set("likedFoods", e.target.value)}
        placeholder="e.g. chicken, rice, eggs, broccoli"
      />
      <Input
        label="Foods you hate (optional)"
        value={data.dislikedFoods}
        onChange={(e) => set("dislikedFoods", e.target.value)}
        placeholder="e.g. fish, mushrooms"
      />
    </div>
  );
}

function StepGenerating({ progress }: { progress: string }) {
  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-4 border-border" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Flame size={32} className="text-primary" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Building your plan...</h2>
        <p className="text-muted-foreground text-sm max-w-xs">{progress}</p>
      </div>
      <div className="flex gap-6">
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Dumbbell size={20} />
          <span className="text-xs">Workout</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Apple size={20} />
          <span className="text-xs">Meal plan</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <ShoppingIcon />
          <span className="text-xs">Shopping</span>
        </div>
      </div>
    </div>
  );
}

function ShoppingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

// ─── Main Onboarding Page ─────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState("Analysing your profile...");
  const [error, setError] = useState("");

  const [data, setData] = useState<FormData>({
    name: "",
    gender: "",
    age: "",
    heightCm: "",
    weightKg: "",
    goal: "",
    experience: "",
    workoutType: "gym",
    workoutDays: [1, 3, 5],
    dietaryRestrictions: [],
    likedFoods: "",
    dislikedFoods: "",
    mealSimplicity: 2,
    cookingSkill: "beginner",
  });

  function set(key: keyof FormData, value: unknown) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function canProceed() {
    if (step === 0) return data.name && data.gender && data.age && data.heightCm && data.weightKg;
    if (step === 1) return !!data.goal;
    if (step === 2) return data.experience && data.workoutDays.length > 0 && data.workoutType;
    return true;
  }

  async function handleNext() {
    if (step < 3) {
      setStep((s) => s + 1);
      return;
    }
    // Step 3 → generate
    setGenerating(true);
    setStep(4);
    try {
      const user = await getCurrentUser();
      const messages = [
        "Analysing your profile...",
        "Building your workout routine...",
        "Crafting your meal plan...",
        "Generating your shopping list...",
        "Almost there...",
      ];
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setGenProgress(messages[i]);
      }, 2500);

      const res = await fetch("/api/ai/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          email: user.signInDetails?.loginId || "",
          age: Number(data.age),
          heightCm: Number(data.heightCm),
          weightKg: Number(data.weightKg),
        }),
      });

      clearInterval(interval);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Plan generation failed");
      }

      router.push("/today");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setGenerating(false);
      setStep(3);
    }
  }

  const stepTitles = [
    "Tell us about yourself",
    "What's your main goal?",
    "Your workout preferences",
    "Your diet preferences",
  ];
  const stepSubtitles = [
    "We'll use this to personalise everything",
    "We'll tailor your plan around this",
    "Tell us how you like to train",
    "Help us build meals you'll actually enjoy",
  ];

  if (generating) {
    return (
      <main className="flex flex-col min-h-screen bg-background px-6">
        <div className="flex-1 flex flex-col justify-center">
          <StepGenerating progress={genProgress} />
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen bg-background">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 pt-6 pb-2">
        {STEPS.slice(0, 4).map((label, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                i < step
                  ? "bg-primary text-white"
                  : i === step
                  ? "bg-primary/20 text-primary border border-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            {i < 3 && <div className={cn("w-6 h-px", i < step ? "bg-primary" : "bg-border")} />}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 pt-4 pb-32 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{stepTitles[step]}</h1>
          <p className="text-muted-foreground text-sm mt-1">{stepSubtitles[step]}</p>
        </div>

        {step === 0 && <StepAbout data={data} set={set} />}
        {step === 1 && <StepGoal data={data} set={set} />}
        {step === 2 && <StepWorkout data={data} set={set} />}
        {step === 3 && <StepDiet data={data} set={set} />}

        {error && (
          <p className="text-sm text-destructive mt-4 p-3 bg-destructive/10 rounded-xl">{error}</p>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <div className="flex gap-3 max-w-sm mx-auto">
          {step > 0 && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1"
            >
              <ChevronLeft size={18} />
              Back
            </Button>
          )}
          <Button
            size="lg"
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1 flex items-center justify-center gap-1"
          >
            {step === 3 ? "Build my plan" : "Continue"}
            {step < 3 && <ChevronRight size={18} />}
          </Button>
        </div>
      </div>
    </main>
  );
}
