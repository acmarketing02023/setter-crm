import { initializeDatabase } from "@/lib/init-db";

export async function InitDB() {
  await initializeDatabase();
  return null;
}
