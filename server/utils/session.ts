import { createError, deleteCookie, getCookie, type H3Event, setCookie } from "h3";
import { useDatabase } from "nitro/database";
import { getSessionUser, hasRole, type Role, type User } from "../services/auth/auth";

export const SESSION_COOKIE = "connecta_session";
const SESSION_TTL_SECONDS = 7 * 86_400;

export function setSessionCookie(event: H3Event, token: string): void {
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, { path: "/" });
}

export function getSessionToken(event: H3Event): string | undefined {
  return getCookie(event, SESSION_COOKIE);
}

export async function requireUser(event: H3Event): Promise<User> {
  // biome-ignore lint/correctness/useHookAtTopLevel: useDatabase é util do Nitro, não um hook React
  const user = await getSessionUser(useDatabase(), getSessionToken(event));
  if (!user) throw createError({ statusCode: 401, message: "Não autenticado" });
  return user;
}

export async function requireRole(event: H3Event, min: Role): Promise<User> {
  const user = await requireUser(event);
  if (!hasRole(user.role, min)) {
    throw createError({ statusCode: 403, message: "Acesso negado" });
  }
  return user;
}
