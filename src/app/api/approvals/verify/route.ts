import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews } from "@/db/schema/approvals";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { reviewId, token } = await req.json();

    if (!reviewId || !token) {
      return NextResponse.json(
        { error: "Missing reviewId or token" },
        { status: 400 },
      );
    }

    // Architecturally, the token should be verified cryptographically here
    // For now, we perform a basic database lookup to ensure the token matches the review
    const review = await db.query.reviews.findFirst({
      where: and(
        eq(reviews.reviewId, reviewId),
        eq(reviews.externalToken, token),
      ),
    });

    if (!review) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 403 },
      );
    }

    // Token is valid. Return success so the client portal can proceed.
    return NextResponse.json({
      success: true,
      reviewId: review.reviewId,
      externalEmail: review.externalEmail,
    });
  } catch (error) {
    console.error("Token verification failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
