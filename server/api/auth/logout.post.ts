import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { deleteSession } from "../../services/auth/auth";
import { clearSessionCookie, getSessionToken } from "../../utils/session";

export default defineEventHandler(async (event) => {
  await deleteSession(useDatabase(), getSessionToken(event));
  clearSessionCookie(event);
  return { ok: true };
});
