"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "aws-amplify/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, ChevronLeft, Dumbbell, Apple, Flame, ShoppingBag } from "lucide-react";

// ─── Conversion helpers ───────────────────────────────────────────────────────

function feetInchesToCm(feet: number, inches: number) {
  return Math.round((feet * 12 + inches) * 2.54);
}
function stoneLbsToKg(stone: number, lbs: number) {
  return Math.round((stone * 14 + lbs) * 0.453592 * 10) / 10;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  measurementSystem: "metric" | "imperial";
  name: string;
  gender: string;
  age: string;
  // metric
  heightCm: string;
  weightKg: string;
  targetWeight: string;
  // imperial
  heightFeet: string;
  heightInches: string;
  weightStone: string;
  weightLbs: string;
  // goals
  goal: string;
  // extra context
  extraContext: string;
  // workout
  experience: string;
  workoutType: string;
  workoutDays: number[];
  // diet
  dietaryRestrictions: string[];
  likedFoods: string;
  dislikedFoods: string;
  mealSimplicity: number;
  cookingSkill: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Shared components ────────────────────────────────────────────────────────

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
        selected ? "bg-primary border-primary text-white" : "bg-white border-border text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function OptionCard({
  label, desc, selected, onClick,
}: { label: string; desc: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-4 rounded-2xl border transition-all text-left w-full",
        selected ? "border-primary bg-orange-50" : "border-border bg-white"
      )}
    >
      <div>
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {selected && (
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 ml-3">
          <Check size={12} className="text-white" />
        </div>
      )}
    </button>
  );
}

function UnitToggle({ value, onChange }: { value: "metric" | "imperial"; onChange: (v: "metric" | "imperial") => void }) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-xl p-1 self-start">
      {(["metric", "imperial"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
            value === v ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
          )}
        >
          {v === "metric" ? "cm / kg" : "ft / st"}
        </button>
      ))}
    </div>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function StepAbout({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const imp = data.measurementSystem === "imperial";
  return (
    <div className="flex flex-col gap-5">
      <Input label="Full name" value={data.name} onChange={(e) => set("name", e.target.value)} placeholder="Charlie Davies" />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">Gender</label>
        <div className="flex gap-2 flex-wrap">
          {["male", "female", "other"].map((g) => (
            <Chip key={g} label={g.charAt(0).toUpperCase() + g.slice(1)} selected={data.gender === g} onClick={() => set("gender", g)} />
          ))}
        </div>
      </div>

      <Input label="Age" type="number" inputMode="numeric" value={data.age} onChange={(e) => set("age", e.target.value)} placeholder="25" />

      <UnitToggle value={data.measurementSystem} onChange={(v) => set("measurementSystem", v)} />

      {imp ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Height</label>
            <div className="flex gap-2">
              <Input type="number" inputMode="numeric" value={data.heightFeet} onChange={(e) => set("heightFeet", e.target.value)} placeholder="5" hint="ft" />
              <Input type="number" inputMode="numeric" value={data.heightInches} onChange={(e) => set("heightInches", e.target.value)} placeholder="10" hint="in" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Weight</label>
            <div className="flex gap-2">
              <Input type="number" inputMode="numeric" value={data.weightStone} onChange={(e) => set("weightStone", e.target.value)} placeholder="11" hint="st" />
              <Input type="number" inputMode="numeric" value={data.weightLbs} onChange={(e) => set("weightLbs", e.target.value)} placeholder="7" hint="lbs" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Height" type="number" inputMode="numeric" value={data.heightCm} onChange={(e) => set("heightCm", e.target.value)} placeholder="175" hint="cm" />
          <Input label="Weight" type="number" inputMode="decimal" value={data.weightKg} onChange={(e) => set("weightKg", e.target.value)} placeholder="75" hint="kg" />
        </div>
      )}
    </div>
  );
}

function StepGoal({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const showTarget = data.goal === "lose_weight" || data.goal === "build_muscle";
  return (
    <div className="flex flex-col gap-3">
      {[
        { id: "lose_weight", label: "Lose weight", desc: "Burn fat, feel lighter" },
        { id: "build_muscle", label: "Build muscle", desc: "Get stronger and bigger" },
        { id: "maintain", label: "Stay toned", desc: "Maintain & improve fitness" },
        { id: "improve_fitness", label: "Get fitter", desc: "Cardio & general health" },
      ].map((g) => (
        <OptionCard key={g.id} {...g} selected={data.goal === g.id} onClick={() => set("goal", g.id)} />
      ))}
      {showTarget && (
        <div className="pt-2">
          <Input
            label={data.measurementSystem === "imperial" ? "Target weight (optional)" : "Target weight (optional)"}
            type="number"
            inputMode="decimal"
            value={data.targetWeight}
            onChange={(e) => set("targetWeight", e.target.value)}
            placeholder={data.measurementSystem === "imperial" ? "e.g. 10 st" : "e.g. 70 kg"}
            hint={data.measurementSystem === "imperial" ? "stone (decimal, e.g. 10.5)" : "kg"}
          />
        </div>
      )}
    </div>
  );
}

function StepWorkout({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  function toggleDay(d: number) {
    const cur = data.workoutDays;
    set("workoutDays", cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]);
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">Experience level</label>
        <div className="flex flex-col gap-2">
          {[
            { id: "complete_beginner", label: "Complete beginner", desc: "Never trained before" },
            { id: "some_experience", label: "Some experience", desc: "Trained a few times" },
            { id: "intermediate", label: "Intermediate", desc: "Training 6+ months" },
          ].map((e) => (
            <OptionCard key={e.id} {...e} selected={data.experience === e.id} onClick={() => set("experience", e.id)} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">Workout location</label>
        <div className="flex gap-2">
          {[{ id: "gym", label: "Gym" }, { id: "home", label: "Home" }, { id: "both", label: "Both" }].map((w) => (
            <Chip key={w.id} label={w.label} selected={data.workoutType === w.id} onClick={() => set("workoutType", w.id)} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">
          Workout days <span className="text-muted-foreground font-normal">({data.workoutDays.length} selected)</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {DAY_NAMES.map((name, i) => (
            <Chip key={i} label={name} selected={data.workoutDays.includes(i)} onClick={() => toggleDay(i)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepDiet({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const restrictions = ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Halal", "Kosher"];
  function toggleR(r: string) {
    const cur = data.dietaryRestrictions;
    set("dietaryRestrictions", cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]);
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">Dietary restrictions</label>
        <div className="flex flex-wrap gap-2">
          {restrictions.map((r) => (
            <Chip key={r} label={r} selected={data.dietaryRestrictions.includes(r)} onClick={() => toggleR(r)} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">
          Meal simplicity
          <span className="text-muted-foreground ml-2 font-normal text-xs">
            {["", "Very simple", "Simple", "Moderate", "Quite involved", "Elaborate"][data.mealSimplicity]}
          </span>
        </label>
        <input type="range" min={1} max={5} value={data.mealSimplicity} onChange={(e) => set("mealSimplicity", Number(e.target.value))} className="w-full accent-primary" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Quick &amp; easy</span>
          <span>Chef-level</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">Cooking skill</label>
        <div className="flex gap-2 flex-wrap">
          {["Beginner", "Intermediate", "Advanced"].map((s) => (
            <Chip key={s} label={s} selected={data.cookingSkill === s.toLowerCase()} onClick={() => set("cookingSkill", s.toLowerCase())} />
          ))}
        </div>
      </div>
      <Input label="Foods you love (optional)" value={data.likedFoods} onChange={(e) => set("likedFoods", e.target.value)} placeholder="e.g. chicken, rice, eggs, broccoli" />
      <Input label="Foods you hate (optional)" value={data.dislikedFoods} onChange={(e) => set("dislikedFoods", e.target.value)} placeholder="e.g. fish, mushrooms" />
    </div>
  );
}

// ─── Extra context step ───────────────────────────────────────────────────────

const CONTEXT_CHIPS = [
  "I've tried keto before",
  "I have a knee/back injury",
  "I train at home with dumbbells only",
  "I'm vegetarian",
  "I meal prep on Sundays",
  "I've done Starting Strength before",
  "I struggle with consistency",
  "I have a busy schedule",
  "I already have chicken, rice & veg in",
];

function StepExtraContext({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  function addChip(chip: string) {
    const current = data.extraContext.trim();
    const newVal = current ? `${current}. ${chip}` : chip;
    set("extraContext", newVal);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
        <p className="text-sm font-semibold text-orange-800 mb-1">This is your chance to tell NewbieAI anything</p>
        <p className="text-xs text-orange-700">
          Previous training plans, injuries, foods you already have, diets you&apos;ve tried, exact meals you love —
          the more detail you give, the more personalised your plan will be.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Tell us more (optional)</label>
        <textarea
          value={data.extraContext}
          onChange={(e) => set("extraContext", e.target.value)}
          placeholder={`Examples:\n• "I used to do 5x5 stronglifts but found it boring"\n• "I have oats, chicken breasts and brown rice already"\n• "I tried calorie counting before and gave up after a month"\n• "I have a bad lower back so no deadlifts please"`}
          rows={7}
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground text-right">{data.extraContext.length} chars</p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick add</p>
        <div className="flex flex-wrap gap-2">
          {CONTEXT_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => addChip(chip)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-border text-foreground hover:border-primary hover:bg-orange-50 transition-all"
            >
              + {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState("Analysing your profile...");
  const [error, setError] = useState("");

  const [data, setData] = useState<FormData>({
    measurementSystem: "metric",
    name: "", gender: "", age: "",
    heightCm: "", weightKg: "", targetWeight: "",
    heightFeet: "", heightInches: "", weightStone: "", weightLbs: "",
    goal: "", experience: "", workoutType: "gym", workoutDays: [1, 3, 5],
    dietaryRestrictions: [], likedFoods: "", dislikedFoods: "",
    mealSimplicity: 2, cookingSkill: "beginner",
    extraContext: "",
  });

  function set(key: keyof FormData, value: unknown) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function canProceed() {
    if (step === 0) {
      const hasBasic = data.name && data.gender && data.age;
      if (data.measurementSystem === "imperial") {
        return hasBasic && data.heightFeet && data.weightStone;
      }
      return hasBasic && data.heightCm && data.weightKg;
    }
    if (step === 1) return !!data.goal;
    if (step === 2) return data.experience && data.workoutDays.length > 0 && data.workoutType;
    return true; // steps 3 and 4 are optional
  }

  async function handleNext() {
    if (step < 4) { setStep((s) => s + 1); return; }

    setGenerating(true);
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
      const interval = setInterval(() => { i = (i + 1) % messages.length; setGenProgress(messages[i]); }, 2500);

      // Resolve measurements to metric
      let heightCm: number;
      let weightKg: number;
      if (data.measurementSystem === "imperial") {
        heightCm = feetInchesToCm(Number(data.heightFeet), Number(data.heightInches || 0));
        weightKg = stoneLbsToKg(Number(data.weightStone), Number(data.weightLbs || 0));
      } else {
        heightCm = Number(data.heightCm);
        weightKg = Number(data.weightKg);
      }

      let targetWeightKg: number | undefined;
      if (data.targetWeight) {
        targetWeightKg = data.measurementSystem === "imperial"
          ? stoneLbsToKg(Number(data.targetWeight), 0)
          : Number(data.targetWeight);
      }

      const payload = JSON.stringify({
        name: data.name,
        email: user.signInDetails?.loginId || "",
        gender: data.gender,
        age: Number(data.age),
        heightCm,
        weightKg,
        targetWeightKg,
        goal: data.goal,
        experience: data.experience,
        workoutType: data.workoutType,
        workoutDays: data.workoutDays,
        dietaryRestrictions: data.dietaryRestrictions,
        likedFoods: data.likedFoods,
        dislikedFoods: data.dislikedFoods,
        mealSimplicity: data.mealSimplicity,
        cookingSkill: data.cookingSkill,
        extraContext: data.extraContext,
      });
      const fetchOpts = { method: "POST", headers: { "Content-Type": "application/json" }, body: payload };

      const [workoutRes, mealRes, shoppingRes] = await Promise.all([
        fetch("/api/ai/onboarding", fetchOpts),
        fetch("/api/ai/onboarding/meal", fetchOpts),
        fetch("/api/ai/onboarding/shopping", fetchOpts),
      ]);

      clearInterval(interval);

      for (const res of [workoutRes, mealRes, shoppingRes]) {
        if (!res.ok) {
          let errMsg = `Server error ${res.status}`;
          try {
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
              const b = await res.json();
              errMsg = b.error || errMsg;
            }
          } catch { /* leave default */ }
          throw new Error(errMsg);
        }
      }

      await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingComplete: true }),
      });

      // Pre-generate today's daily plan so it's ready immediately
      await fetch("/api/daily/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
      }).catch(() => { /* non-fatal — Today page will generate on load */ });

      router.push("/today");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setGenerating(false);
    }
  }

  const stepTitles = [
    "Tell us about yourself",
    "What's your main goal?",
    "Your workout preferences",
    "Your diet preferences",
    "Anything else? (optional)",
  ];
  const stepSubtitles = [
    "We'll use this to personalise everything",
    "We'll tailor your plan around this",
    "Tell us how you like to train",
    "Help us build meals you'll actually enjoy",
    "Previous plans, specific foods, injuries — the more you share, the better your plan",
  ];

  if (generating) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-8 text-center max-w-sm">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-4 border-border" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Flame size={32} className="text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Building your plan...</h2>
            <p className="text-muted-foreground">{genProgress}</p>
          </div>
          <div className="flex gap-8 text-muted-foreground">
            <div className="flex flex-col items-center gap-1"><Dumbbell size={20} /><span className="text-xs">Workout</span></div>
            <div className="flex flex-col items-center gap-1"><Apple size={20} /><span className="text-xs">Meals</span></div>
            <div className="flex flex-col items-center gap-1"><ShoppingBag size={20} /><span className="text-xs">Shopping</span></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="h-1.5 bg-muted">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((step + 1) / 5) * 100}%` }} />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-3 py-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={cn("transition-all rounded-full", i <= step ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-border")} />
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-lg mx-auto px-5 py-2">
          <div className="mb-6">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Step {step + 1} of 5</p>
            <h1 className="text-2xl font-bold">{stepTitles[step]}</h1>
            <p className="text-muted-foreground text-sm mt-1">{stepSubtitles[step]}</p>
          </div>

          {step === 0 && <StepAbout data={data} set={set} />}
          {step === 1 && <StepGoal data={data} set={set} />}
          {step === 2 && <StepWorkout data={data} set={set} />}
          {step === 3 && <StepDiet data={data} set={set} />}
          {step === 4 && <StepExtraContext data={data} set={set} />}

          {error && (
            <p className="text-sm text-destructive mt-4 p-3 bg-red-50 rounded-xl border border-red-100">{error}</p>
          )}
        </div>
      </div>

      {/* Fixed footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-pb">
        <div className="flex gap-3 max-w-lg mx-auto">
          {step > 0 && (
            <Button variant="outline" size="md" onClick={() => setStep((s) => s - 1)} className="flex items-center gap-1">
              <ChevronLeft size={18} /> Back
            </Button>
          )}
          <Button size="lg" onClick={handleNext} disabled={!canProceed()} className="flex-1 flex items-center justify-center gap-1">
            {step === 4 ? "Build my plan ✨" : <><span>Continue</span><ChevronRight size={18} /></>}
          </Button>
        </div>
      </div>
    </main>
  );
}
