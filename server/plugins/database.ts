import { definePlugin } from "nitro";
import { useDatabase } from "nitro/database";
import { initSchema } from "../database/db";

// inicializa o schema na subida do servidor
export default definePlugin(async () => {
  await initSchema(useDatabase());
});
