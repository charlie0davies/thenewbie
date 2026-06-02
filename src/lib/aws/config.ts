export const awsConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || "eu-west-2",
  credentials: {
    accessKeyId: process.env.MY_APP_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_APP_AWS_SECRET_ACCESS_KEY!,
  },
};
