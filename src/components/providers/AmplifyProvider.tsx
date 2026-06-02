"use client";

import { Amplify } from "aws-amplify";
import { amplifyConfig } from "@/lib/auth/amplify-config";

Amplify.configure(amplifyConfig, { ssr: true });

export default function AmplifyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
