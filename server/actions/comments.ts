"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { todayStr, thisWeekRange } from "@/lib/date";
import { z } from "zod";
import { dbErr } from "@/server/db-error";

const LogSchema = z.object({
  count: z.number().int().min(0),
});

export async function logComments(formData: FormData) {
  const count = parseInt(formData.get("count") as string, 10);
  LogSchema.parse({ count });

  const db = createServerClient();
  const today = todayStr();

  const { data: existing } = await db
    .from("comment_logs")
    .select("count")
    .eq("log_date", today)
    .maybeSingle();

  const newCount = (existing?.count ?? 0) + count;

  const { error } = await db.from("comment_logs").upsert(
    { log_date: today, count: newCount },
    { onConflict: "log_date" }
  );

  if (error) return dbErr(error);

  revalidatePath("/comment-hacking");
  revalidatePath("/");
  return { success: true };
}

const SetSchema = z.object({
  count: z.number().int().min(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function setCommentCount(formData: FormData) {
  const count = parseInt(formData.get("count") as string, 10);
  const date = formData.get("date") as string;
  SetSchema.parse({ count, date });

  const db = createServerClient();

  const { error } = await db.from("comment_logs").upsert(
    { log_date: date, count },
    { onConflict: "log_date" }
  );

  if (error) return dbErr(error);

  revalidatePath("/comment-hacking");
  revalidatePath("/");
  return { success: true };
}

export async function resetThisWeekComments() {
  const db = createServerClient();
  const { start, end } = thisWeekRange();

  const { error } = await db
    .from("comment_logs")
    .delete()
    .gte("log_date", start)
    .lte("log_date", end);

  if (error) return dbErr(error);

  revalidatePath("/comment-hacking");
  revalidatePath("/");
  return { success: true };
}
