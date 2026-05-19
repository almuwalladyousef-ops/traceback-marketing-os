export function dbErr(error: { message: string }): { error: string } {
  console.error("[DB Error]", error.message);
  return { error: error.message };
}
