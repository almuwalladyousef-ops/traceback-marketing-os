export function dbErr(error: { message: string }): { error: string } {
  if (process.env.NODE_ENV === "development") return { error: error.message };
  return { error: "Database operation failed" };
}
