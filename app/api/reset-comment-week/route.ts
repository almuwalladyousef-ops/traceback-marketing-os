import { NextResponse } from "next/server";
import { resetThisWeekComments } from "@/server/actions/comments";

export async function GET() {
  const result = await resetThisWeekComments();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: "This week's comment logs cleared." });
}
