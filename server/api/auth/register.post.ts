import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { useDatabase } from "nitro/database";
import { logAudit } from "../../services/audit/audit";
import { createSession, register } from "../../services/auth/auth";
import { authRateLimit } from "../../utils/rateLimit";
import { setSessionCookie } from "../../utils/session";

export default defineEventHandler(async (event) => {
  authRateLimit(event, "register");
  const db = useDatabase();
  const body = await readBody<Record<string, unknown>>(event);
  const user = await register(db, {
    companyName: body?.companyName,
    name: body?.name,
    email: body?.email,
    password: body?.password,
  });
  const token = await createSession(db, user.id);
  setSessionCookie(event, token);
  await logAudit(db, {
    userId: user.id,
    companyId: user.company_id,
    action: "auth.register",
    detail: user.email,
  });
  setResponseStatus(event, 201);
  return { user };
});
