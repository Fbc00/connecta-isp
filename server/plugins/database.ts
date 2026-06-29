import { definePlugin } from "nitro";
import { useDatabase } from "nitro/database";
import { initSchema } from "../database/db";

export default definePlugin(async () => {
  await initSchema(useDatabase());
});
