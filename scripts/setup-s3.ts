import "dotenv/config";
import {
  S3Client,
  CreateBucketCommand,
  PutBucketCorsCommand,
  PutPublicAccessBlockCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

const BUCKET = "thenewbie-photos";
const REGION = process.env.NEXT_PUBLIC_AWS_REGION || "eu-west-2";

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.MY_APP_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_APP_AWS_SECRET_ACCESS_KEY!,
  },
});

async function run() {
  // Check if bucket already exists
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    console.log(`Bucket ${BUCKET} already exists.`);
  } catch {
    // Create bucket
    await s3.send(
      new CreateBucketCommand({
        Bucket: BUCKET,
        ...(REGION !== "us-east-1" && {
          CreateBucketConfiguration: { LocationConstraint: REGION as "eu-west-2" },
        }),
      })
    );
    console.log(`Created bucket: ${BUCKET}`);
  }

  // Block all public access
  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: BUCKET,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    })
  );
  console.log("Public access blocked.");

  // CORS for presigned PUT from the web app
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ["https://thenewbie.org", "http://localhost:3000"],
            AllowedMethods: ["PUT", "GET"],
            AllowedHeaders: ["Content-Type", "Content-Length"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    })
  );
  console.log("CORS configured.");

  console.log(`\nDone! Add this to your Amplify environment variables:\nMY_APP_S3_BUCKET=${BUCKET}`);
}

run().catch((err) => { console.error(err); process.exit(1); });
