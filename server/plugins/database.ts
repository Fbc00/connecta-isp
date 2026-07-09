import { definePlugin } from "nitro";
import { useDatabase } from "nitro/database";
import { initSchema } from "../database/db";
import { seedDemo, seedSuperAdmin } from "../database/seed";

export default definePlugin(async () => {
  const db = useDatabase();
  await initSchema(db);
  await seedSuperAdmin(db);
  if (process.env.NODE_ENV !== "production") {
    await seedDemo(db);
  }
});
