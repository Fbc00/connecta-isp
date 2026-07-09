import { defineEventHandler, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { logAudit } from "../../services/audit/audit";
import { authenticate, createSession } from "../../services/auth/auth";
import { authRateLimit } from "../../utils/rateLimit";
import { setSessionCookie } from "../../utils/session";

export default defineEventHandler(async (event) => {
  authRateLimit(event, "login");
  const db = useDatabase();
  const body = await readBody<{ email?: unknown; password?: unknown }>(event);
  const user = await authenticate(db, body?.email, body?.password);
  const token = await createSession(db, user.id);
  setSessionCookie(event, token);
  await logAudit(db, {
    userId: user.id,
    companyId: user.company_id,
    action: "auth.login",
    detail: user.email,
  });
  return { user };
});
