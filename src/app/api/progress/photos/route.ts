import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";
import { logPhoto, getPhotoHistory } from "@/lib/db/progress";
import { awsConfig } from "@/lib/aws/config";

const s3 = new S3Client(awsConfig);
const BUCKET = process.env.MY_APP_S3_BUCKET!;

async function getUserId(req: NextRequest) {
  const res = NextResponse.next();
  return runWithAmplifyServerContext({
    nextServerContext: { request: req, response: res },
    operation: async (ctx) => {
      const session = await fetchAuthSession(ctx);
      return session.tokens?.accessToken?.payload?.sub as string | undefined;
    },
  });
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const photos = await getPhotoHistory(userId);
  const withUrls = await Promise.all(
    photos.map(async (p) => {
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: p.s3Key }),
        { expiresIn: 3600 }
      );
      return { ...p, url };
    })
  );

  return NextResponse.json(withUrls);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { caption, date, contentType = "image/jpeg" } = await req.json();
  const s3Key = `photos/${userId}/${Date.now()}.jpg`;

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: contentType,
    }),
    { expiresIn: 300 }
  );

  await logPhoto(userId, s3Key, caption, date);

  return NextResponse.json({ uploadUrl, s3Key });
}
