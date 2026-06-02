import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, Tables } from "@/lib/aws/dynamo";

export interface ShoppingListItem {
  id: string;
  name: string;
  category: string;
  quantity: string;
  estimatedCostGbp: number;
  bought: boolean;
  buyByDate?: string;
  tescoUrl?: string;
  asdaUrl?: string;
  morrisonsUrl?: string;
  waitroseUrl?: string;
}

export interface ShoppingList {
  userId: string;
  listId: string;
  weekStartDate: string;
  items: ShoppingListItem[];
  totalEstimatedCostGbp: number;
  createdAt: string;
}

export async function getActiveShoppingList(
  userId: string
): Promise<ShoppingList | null> {
  const { Item } = await db.send(
    new GetCommand({
      TableName: Tables.shopping,
      Key: { userId, listId: "active" },
    })
  );
  return (Item as ShoppingList) ?? null;
}

export async function saveShoppingList(list: ShoppingList): Promise<void> {
  await db.send(new PutCommand({ TableName: Tables.shopping, Item: list }));
}

export async function toggleItemBought(
  userId: string,
  listId: string,
  itemId: string,
  bought: boolean
): Promise<void> {
  const { Item } = await db.send(
    new GetCommand({ TableName: Tables.shopping, Key: { userId, listId } })
  );
  if (!Item) return;

  const list = Item as ShoppingList;
  const items = list.items.map((i) =>
    i.id === itemId ? { ...i, bought } : i
  );

  await db.send(
    new UpdateCommand({
      TableName: Tables.shopping,
      Key: { userId, listId },
      UpdateExpression: "SET #items = :items",
      ExpressionAttributeNames: { "#items": "items" },
      ExpressionAttributeValues: { ":items": items },
    })
  );
}
