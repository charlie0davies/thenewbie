import {
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, Tables } from "@/lib/aws/dynamo";

export interface WeightEntry {
  userId: string;
  sortKey: string; // WEIGHT#<ISO timestamp>
  type: "weight";
  date: string;
  weightKg: number;
}

export interface WorkoutLogEntry {
  userId: string;
  sortKey: string; // WORKOUT#<exerciseId>#<ISO timestamp>
  type: "workout";
  date: string;
  exerciseName: string;
  exerciseId: string;
  sets: { reps: number; weightKg: number }[];
}

export type ProgressEntry = WeightEntry | WorkoutLogEntry;

export async function logWeight(
  userId: string,
  weightKg: number,
  date?: string
): Promise<void> {
  const now = new Date();
  const isoDate = date || now.toISOString().slice(0, 10);
  const entry: WeightEntry = {
    userId,
    sortKey: `WEIGHT#${now.toISOString()}`,
    type: "weight",
    date: isoDate,
    weightKg,
  };
  await db.send(new PutCommand({ TableName: Tables.progress, Item: entry }));
}

export async function logWorkout(
  userId: string,
  exerciseId: string,
  exerciseName: string,
  sets: { reps: number; weightKg: number }[],
  date?: string
): Promise<void> {
  const now = new Date();
  const isoDate = date || now.toISOString().slice(0, 10);
  const entry: WorkoutLogEntry = {
    userId,
    sortKey: `WORKOUT#${exerciseId}#${now.toISOString()}`,
    type: "workout",
    date: isoDate,
    exerciseName,
    exerciseId,
    sets,
  };
  await db.send(new PutCommand({ TableName: Tables.progress, Item: entry }));
}

export async function getWeightHistory(
  userId: string,
  limit = 30
): Promise<WeightEntry[]> {
  const { Items = [] } = await db.send(
    new QueryCommand({
      TableName: Tables.progress,
      KeyConditionExpression:
        "userId = :uid AND begins_with(sortKey, :prefix)",
      ExpressionAttributeValues: {
        ":uid": userId,
        ":prefix": "WEIGHT#",
      },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return Items as WeightEntry[];
}

export async function getWorkoutHistory(
  userId: string,
  exerciseId?: string,
  limit = 50
): Promise<WorkoutLogEntry[]> {
  const prefix = exerciseId ? `WORKOUT#${exerciseId}#` : "WORKOUT#";
  const { Items = [] } = await db.send(
    new QueryCommand({
      TableName: Tables.progress,
      KeyConditionExpression:
        "userId = :uid AND begins_with(sortKey, :prefix)",
      ExpressionAttributeValues: {
        ":uid": userId,
        ":prefix": prefix,
      },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return Items as WorkoutLogEntry[];
}
