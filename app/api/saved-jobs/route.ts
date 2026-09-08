import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { savedJobs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { deviceToken, postId } = await req.json();
  if (!deviceToken || !postId) {
    return NextResponse.json({ error: "deviceToken and postId are required" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(savedJobs)
    .where(and(eq(savedJobs.deviceToken, deviceToken), eq(savedJobs.postId, postId)))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ saved: true, alreadySaved: true });
  }

  await db.insert(savedJobs).values({ deviceToken, postId });
  return NextResponse.json({ saved: true });
}

export async function DELETE(req: NextRequest) {
  const { deviceToken, postId } = await req.json();
  if (!deviceToken || !postId) {
    return NextResponse.json({ error: "deviceToken and postId are required" }, { status: 400 });
  }

  await db.delete(savedJobs).where(and(eq(savedJobs.deviceToken, deviceToken), eq(savedJobs.postId, postId)));
  return NextResponse.json({ saved: false });
}

export async function GET(req: NextRequest) {
  const deviceToken = req.nextUrl.searchParams.get("deviceToken");
  if (!deviceToken) {
    return NextResponse.json({ error: "deviceToken is required" }, { status: 400 });
  }

  const rows = await db.select().from(savedJobs).where(eq(savedJobs.deviceToken, deviceToken));
  return NextResponse.json({ savedPostIds: rows.map((r) => r.postId) });
}
