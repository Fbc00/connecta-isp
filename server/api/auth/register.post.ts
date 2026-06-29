import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { useDatabase } from "nitro/database";
import { createSession, register } from "../../services/auth/auth";
import { setSessionCookie } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const db = useDatabase();
  const body = await readBody<Record<string, unknown>>(event);
  const user = await register(db, {
    companyName: body?.companyName,
    name: body?.name,
    email: body?.email,
    password: body?.password,
  });
  // já loga o usuário recém-criado
  const token = await createSession(db, user.id);
  setSessionCookie(event, token);
  setResponseStatus(event, 201);
  return { user };
});
