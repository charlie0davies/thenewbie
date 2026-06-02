import {
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, Tables } from "@/lib/aws/dynamo";

export interface WorkoutPlan {
  userId: string;
  planId: string;
  createdAt: string;
  weeklyRoutine: DayRoutine[];
}

export interface DayRoutine {
  dayOfWeek: number; // 0=Sun ... 6=Sat
  isWorkoutDay: boolean;
  exercises: PlanExercise[];
}

export interface PlanExercise {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  restSeconds: number;
  startingWeightKg: number;
  notes?: string;
}

export interface MealPlan {
  userId: string;
  planId: string;
  createdAt: string;
  dailyCalories: number;
  dailyProteinG: number;
  dailyCarbsG: number;
  dailyFatG: number;
  dailyWaterMl: number;
  proteinShakesPerDay: number;
  mealTemplates: MealTemplate[];
}

export interface MealTemplate {
  id: string;
  name: string;
  time: "breakfast" | "lunch" | "dinner" | "snack";
  ingredients: { name: string; amountG: number; unit: string }[];
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  prepMinutes: number;
}

export async function getActivePlan(
  userId: string,
  type: "workout" | "meal"
): Promise<WorkoutPlan | MealPlan | null> {
  const { Item } = await db.send(
    new GetCommand({
      TableName: Tables.plans,
      Key: { userId, planId: `active-${type}` },
    })
  );
  return (Item as WorkoutPlan | MealPlan) ?? null;
}

export async function saveActivePlan(
  plan: WorkoutPlan | MealPlan,
  type: "workout" | "meal"
): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: Tables.plans,
      Item: { ...plan, planId: `active-${type}` },
    })
  );
}
