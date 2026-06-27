import { defineEventHandler, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { register } from "../../services/auth/auth";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string; email?: string; password?: string }>(event);
  const db = useDatabase();
  return register(db, body?.name, body?.email, body?.password);
});