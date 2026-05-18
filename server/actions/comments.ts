"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/date";
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

  // Upsert: if today already logged, overwrite
  const { error } = await db.from("comment_logs").upsert(
    { log_date: today, count },
    { onConflict: "log_date" }
  );

  if (error) return dbErr(error);

  revalidatePath("/comment-hacking");
  revalidatePath("/");
  return { success: true };
}
