import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    demoMode: process.env.DEMO_MODE === "true",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    buildNumber: process.env.NEXT_PUBLIC_BUILD_NUMBER || "local-dev",
    framework: "Next.js",
  });
}
