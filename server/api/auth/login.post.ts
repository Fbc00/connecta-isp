import { defineEventHandler, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { authenticate, createSession } from "../../services/auth/auth";
import { setSessionCookie } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const db = useDatabase();
  const body = await readBody<{ email?: unknown; password?: unknown }>(event);
  const user = await authenticate(db, body?.email, body?.password);
  const token = await createSession(db, user.id);
  setSessionCookie(event, token);
  return { user };
});
