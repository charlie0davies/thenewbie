// Core domain types for The Newbie

export type Gender = "male" | "female" | "other";
export type FitnessGoal = "lose_weight" | "build_muscle" | "maintain" | "improve_fitness";
export type ExperienceLevel = "complete_beginner" | "some_experience" | "intermediate";
export type WorkoutType = "gym" | "home" | "both";

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  goal: FitnessGoal;
  experience: ExperienceLevel;
  workoutType: WorkoutType;
  workoutDays: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  targetWeightKg?: number;
  createdAt: string;
  onboardingComplete?: boolean;
  plan?: "free" | "premium";
  coachMessagesUsed?: number;
  coachMessagesMonth?: string; // "YYYY-MM"
}

export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string; // e.g. "8-12"
  restSeconds: number;
  weightKg?: number;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  exercises: Exercise[];
  completed: boolean;
  durationMinutes?: number;
}

export interface Meal {
  id: string;
  name: string;
  time: "breakfast" | "lunch" | "dinner" | "snack";
  ingredients: Ingredient[];
  macros: Macros;
  recipeUrl?: string;
}

export interface Ingredient {
  name: string;
  amountG: number;
  unit: string;
}

export interface ShoppingItem {
  name: string;
  quantity: string;
  estimatedCostGbp: number;
  tescoUrl?: string;
  asdaUrl?: string;
  morrisonsUrl?: string;
  waitroseUrl?: string;
}

export interface DailyPlan {
  date: string;
  meals: Meal[];
  workout?: WorkoutSession;
  waterMl: number;
  proteinShakes: number;
  completedItems: string[];
}

export interface WeightLog {
  date: string;
  weightKg: number;
}

export interface WorkoutLog {
  date: string;
  exerciseId: string;
  sets: { reps: number; weightKg: number }[];
}
