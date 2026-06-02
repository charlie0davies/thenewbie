import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { awsConfig } from "./config";

const client = new DynamoDBClient(awsConfig);

export const db = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const Tables = {
  users: process.env.DYNAMODB_TABLE_USERS || "thenewbie-users",
  plans: process.env.DYNAMODB_TABLE_PLANS || "thenewbie-plans",
  daily: process.env.DYNAMODB_TABLE_DAILY || "thenewbie-daily",
  progress: process.env.DYNAMODB_TABLE_PROGRESS || "thenewbie-progress",
  shopping: process.env.DYNAMODB_TABLE_SHOPPING || "thenewbie-shopping",
};
