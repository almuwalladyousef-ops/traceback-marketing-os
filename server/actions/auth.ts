"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthToken, COOKIE_NAME } from "@/lib/auth";

const PASSWORD = process.env.APP_PASSWORD;
if (!PASSWORD) throw new Error("APP_PASSWORD env var is required");

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 15;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function signIn(_prevState: { error?: string } | null, formData: FormData) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return { error: "Too many attempts. Please wait 15 minutes." };
  }

  const password = formData.get("password") as string;

  if (password !== PASSWORD) {
    return { error: "Incorrect password" };
  }

  const token = await createAuthToken();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  redirect("/");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/login");
}
