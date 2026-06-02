import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, Tables } from "@/lib/aws/dynamo";

export interface DailyPlanItem {
  id: string;
  type: "meal" | "exercise" | "water" | "protein_shake";
  label: string;
  detail?: string;
  completed: boolean;
  partialNote?: string;
  scheduledTime?: string; // HH:MM
  calories?: number;
  sets?: number;
  reps?: string;
  weightKg?: number;
}

export interface DailyRecord {
  userId: string;
  date: string; // YYYY-MM-DD
  items: DailyPlanItem[];
  waterMlTarget: number;
  waterMlDone: number;
  generatedAt: string;
}

export async function getDailyRecord(
  userId: string,
  date: string
): Promise<DailyRecord | null> {
  const { Item } = await db.send(
    new GetCommand({
      TableName: Tables.daily,
      Key: { userId, date },
    })
  );
  return (Item as DailyRecord) ?? null;
}

export async function putDailyRecord(record: DailyRecord): Promise<void> {
  await db.send(new PutCommand({ TableName: Tables.daily, Item: record }));
}

export async function toggleItemComplete(
  userId: string,
  date: string,
  itemId: string,
  completed: boolean,
  partialNote?: string
): Promise<void> {
  const record = await getDailyRecord(userId, date);
  if (!record) return;

  const items = record.items.map((item) =>
    item.id === itemId ? { ...item, completed, partialNote } : item
  );

  await db.send(
    new UpdateCommand({
      TableName: Tables.daily,
      Key: { userId, date },
      UpdateExpression: "SET #items = :items",
      ExpressionAttributeNames: { "#items": "items" },
      ExpressionAttributeValues: { ":items": items },
    })
  );
}

export async function updateWater(
  userId: string,
  date: string,
  waterMlDone: number
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: Tables.daily,
      Key: { userId, date },
      UpdateExpression: "SET waterMlDone = :w",
      ExpressionAttributeValues: { ":w": waterMlDone },
    })
  );
}

export async function getRecentDays(
  userId: string,
  days = 7
): Promise<DailyRecord[]> {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  const oldest = dates[dates.length - 1];
  const newest = dates[0];

  const { Items = [] } = await db.send(
    new QueryCommand({
      TableName: Tables.daily,
      KeyConditionExpression:
        "userId = :uid AND #date BETWEEN :oldest AND :newest",
      ExpressionAttributeNames: { "#date": "date" },
      ExpressionAttributeValues: {
        ":uid": userId,
        ":oldest": oldest,
        ":newest": newest,
      },
    })
  );
  return Items as DailyRecord[];
}
