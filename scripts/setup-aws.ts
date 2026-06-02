import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  CreateUserPoolClientCommand,
  ListUserPoolsCommand,
  DescribeUserPoolCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
  ScalarAttributeType,
  KeyType,
  BillingMode,
} from "@aws-sdk/client-dynamodb";

const region = process.env.NEXT_PUBLIC_AWS_REGION || "eu-west-2";
const credentials = {
  accessKeyId: process.env.MY_APP_AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.MY_APP_AWS_SECRET_ACCESS_KEY!,
};

if (!credentials.accessKeyId || !credentials.secretAccessKey) {
  console.error("❌  AWS credentials missing — check .env");
  process.exit(1);
}

const dynamo = new DynamoDBClient({ region, credentials });
const cognito = new CognitoIdentityProviderClient({ region, credentials });

// ─── DynamoDB Tables ──────────────────────────────────────────────────────────

const S = ScalarAttributeType.S;
const HASH = KeyType.HASH;
const RANGE = KeyType.RANGE;

const tables = [
  {
    TableName: "thenewbie-users",
    KeySchema: [{ AttributeName: "userId", KeyType: HASH }],
    AttributeDefinitions: [{ AttributeName: "userId", AttributeType: S }],
  },
  {
    TableName: "thenewbie-plans",
    KeySchema: [
      { AttributeName: "userId", KeyType: HASH },
      { AttributeName: "planId", KeyType: RANGE },
    ],
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: S },
      { AttributeName: "planId", AttributeType: S },
    ],
  },
  {
    TableName: "thenewbie-daily",
    KeySchema: [
      { AttributeName: "userId", KeyType: HASH },
      { AttributeName: "date", KeyType: RANGE },
    ],
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: S },
      { AttributeName: "date", AttributeType: S },
    ],
  },
  {
    TableName: "thenewbie-progress",
    KeySchema: [
      { AttributeName: "userId", KeyType: HASH },
      { AttributeName: "sortKey", KeyType: RANGE },
    ],
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: S },
      { AttributeName: "sortKey", AttributeType: S },
    ],
  },
  {
    TableName: "thenewbie-shopping",
    KeySchema: [
      { AttributeName: "userId", KeyType: HASH },
      { AttributeName: "listId", KeyType: RANGE },
    ],
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: S },
      { AttributeName: "listId", AttributeType: S },
    ],
  },
];

async function createTables() {
  const { TableNames = [] } = await dynamo.send(new ListTablesCommand({}));
  for (const table of tables) {
    if (TableNames.includes(table.TableName)) {
      console.log(`  ✓  ${table.TableName} (already exists)`);
      continue;
    }
    await dynamo.send(
      new CreateTableCommand({ ...table, BillingMode: "PAY_PER_REQUEST" })
    );
    console.log(`  ✓  ${table.TableName} created`);
  }
}

// ─── Cognito User Pool ────────────────────────────────────────────────────────

async function createUserPool(): Promise<{ poolId: string; clientId: string }> {
  // Check for existing pool
  let nextToken: string | undefined;
  do {
    const resp = await cognito.send(
      new ListUserPoolsCommand({ MaxResults: 60, NextToken: nextToken })
    );
    const existing = (resp.UserPools ?? []).find(
      (p) => p.Name === "thenewbie-users"
    );
    if (existing && existing.Id) {
      console.log(`  ✓  User Pool (already exists): ${existing.Id}`);
      const detail = await cognito.send(
        new DescribeUserPoolCommand({ UserPoolId: existing.Id })
      );
      const clients = detail.UserPool?.SchemaAttributes; // placeholder — we need client id
      // Re-create is not safe; user must check console for existing client id
      // Return poolId with placeholder clientId — will be overwritten below
      return { poolId: existing.Id, clientId: "CHECK_CONSOLE" };
    }
    nextToken = resp.NextToken;
  } while (nextToken);

  // Create pool
  const pool = await cognito.send(
    new CreateUserPoolCommand({
      PoolName: "thenewbie-users",
      AutoVerifiedAttributes: ["email"],
      UsernameAttributes: ["email"],
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireUppercase: true,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: false,
        },
      },
      Schema: [
        {
          Name: "name",
          AttributeDataType: "String",
          Required: true,
          Mutable: true,
        },
        {
          Name: "email",
          AttributeDataType: "String",
          Required: true,
          Mutable: true,
        },
      ],
      VerificationMessageTemplate: {
        DefaultEmailOption: "CONFIRM_WITH_CODE",
        EmailMessage:
          "Your The Newbie verification code is {####}",
        EmailSubject: "Verify your The Newbie account",
      },
    })
  );
  const poolId = pool.UserPool!.Id!;
  console.log(`  ✓  User Pool created: ${poolId}`);

  // Create app client
  const client = await cognito.send(
    new CreateUserPoolClientCommand({
      UserPoolId: poolId,
      ClientName: "thenewbie-web",
      GenerateSecret: false,
      ExplicitAuthFlows: [
        "ALLOW_USER_SRP_AUTH",
        "ALLOW_USER_PASSWORD_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
      ],
      PreventUserExistenceErrors: "ENABLED",
      AccessTokenValidity: 60,
      IdTokenValidity: 60,
      RefreshTokenValidity: 30,
      TokenValidityUnits: {
        AccessToken: "minutes",
        IdToken: "minutes",
        RefreshToken: "days",
      },
      SupportedIdentityProviders: ["COGNITO"],
    })
  );
  const clientId = client.UserPoolClient!.ClientId!;
  console.log(`  ✓  App Client created: ${clientId}`);

  return { poolId, clientId };
}

// ─── Update .env ──────────────────────────────────────────────────────────────

function updateEnv(poolId: string, clientId: string) {
  const envPath = path.resolve(process.cwd(), ".env");
  let content = fs.readFileSync(envPath, "utf-8");

  const vars: Record<string, string> = {
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: poolId,
    NEXT_PUBLIC_COGNITO_CLIENT_ID: clientId,
    DYNAMODB_TABLE_USERS: "thenewbie-users",
    DYNAMODB_TABLE_PLANS: "thenewbie-plans",
    DYNAMODB_TABLE_DAILY: "thenewbie-daily",
    DYNAMODB_TABLE_PROGRESS: "thenewbie-progress",
    DYNAMODB_TABLE_SHOPPING: "thenewbie-shopping",
  };

  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    const line = `${key}=${value}`;
    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content += `\n${line}`;
    }
  }

  fs.writeFileSync(envPath, content);
  console.log("\n  ✓  .env updated with Cognito IDs and table names");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🚀  Setting up AWS resources for The Newbie...\n");

  console.log("📦  DynamoDB Tables");
  await createTables();

  console.log("\n🔐  Cognito User Pool");
  const { poolId, clientId } = await createUserPool();

  if (clientId !== "CHECK_CONSOLE") {
    updateEnv(poolId, clientId);
  } else {
    console.log(
      "\n⚠️  User Pool already existed — check AWS Console for the App Client ID"
    );
    console.log(
      "   Then manually add NEXT_PUBLIC_COGNITO_CLIENT_ID=<id> to your .env\n"
    );
    updateEnv(poolId, "REPLACE_WITH_CLIENT_ID_FROM_CONSOLE");
  }

  console.log("\n✅  Done!\n");
}

main().catch((err) => {
  console.error("❌ ", err.message || err);
  process.exit(1);
});
