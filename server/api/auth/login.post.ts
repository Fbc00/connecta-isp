import { defineEventHandler, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { login } from "../../services/auth/auth";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string; password?: string }>(event);
  const db = useDatabase();
  return login(db, body?.email, body?.password);
});
