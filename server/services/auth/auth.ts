import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Database } from "db0";
import { createError } from "h3";

// ── RBAC ────────────────────────────────────────────────────────────────────
// hierarquia simples: owner > admin > member. requireRole compara o nível.
export const ROLES = ["member", "admin", "owner"] as const;
export type Role = (typeof ROLES)[number];

export function roleRank(role: Role): number {
  return ROLES.indexOf(role);
}

// true se `role` satisfaz o nível mínimo `min`
export function hasRole(role: Role, min: Role): boolean {
  return roleRank(role) >= roleRank(min);
}

// ── tipos ─────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  company_id: number;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

interface UserRow extends User {
  password_hash: string;
}

const SESSION_TTL_DAYS = 7;

const conflict = (msg: string) => createError({ statusCode: 409, message: msg });
const badRequest = (msg: string) => createError({ statusCode: 400, message: msg });
const unauthorized = (msg = "Não autenticado") =>
  createError({ statusCode: 401, message: msg });

// ── hashing de senha (node:crypto scrypt, sem dependências) ──────────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = Buffer.from(hashHex, "hex");
  const candidate = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  return hash.length === candidate.length && timingSafeEqual(hash, candidate);
}

function publicUser(row: UserRow | User): User {
  const { id, company_id, name, email, role, created_at } = row;
  return { id, company_id, name, email, role, created_at };
}

// ── register: cria empresa + usuário owner ───────────────────────────────────
export interface RegisterInput {
  companyName: unknown;
  name: unknown;
  email: unknown;
  password: unknown;
}

export async function register(db: Database, input: RegisterInput): Promise<User> {
  const companyName = str(input.companyName);
  const name = str(input.name);
  const email = str(input.email).toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";

  if (!companyName) throw badRequest("O nome da empresa é obrigatório");
  if (!name) throw badRequest("O nome é obrigatório");
  if (!isEmail(email)) throw badRequest("E-mail inválido");
  if (password.length < 8) throw badRequest("A senha deve ter ao menos 8 caracteres");

  const existing = await findUserByEmail(db, email);
  if (existing) throw conflict("E-mail já cadastrado");

  const { lastInsertRowid: companyId } = await db.sql`
    INSERT INTO companies (name) VALUES (${companyName})
  `;

  // primeiro usuário da empresa é o owner
  const { lastInsertRowid: userId } = await db.sql`
    INSERT INTO users (company_id, name, email, password_hash, role)
    VALUES (${Number(companyId)}, ${name}, ${email}, ${hashPassword(password)}, 'owner')
  `;

  const user = await findUserById(db, Number(userId));
  if (!user) throw createError({ statusCode: 500, message: "Falha ao criar usuário" });
  return publicUser(user);
}

// ── autenticação ─────────────────────────────────────────────────────────────
export async function authenticate(
  db: Database,
  email: unknown,
  password: unknown,
): Promise<User> {
  const row = await findUserByEmail(db, str(email).toLowerCase());
  const pass = typeof password === "string" ? password : "";
  // mensagem genérica p/ não revelar se o e-mail existe
  if (!row || !verifyPassword(pass, row.password_hash)) {
    throw unauthorized("E-mail ou senha inválidos");
  }
  return publicUser(row);
}

// ── sessões ──────────────────────────────────────────────────────────────────
export async function createSession(db: Database, userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000).toISOString();
  await db.sql`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expires})
  `;
  return token;
}

export async function getSessionUser(
  db: Database,
  token: string | undefined,
): Promise<User | null> {
  if (!token) return null;
  const { rows } = await db.sql`
    SELECT u.* FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > datetime('now')
  `;
  const row = (rows as unknown as UserRow[])[0];
  return row ? publicUser(row) : null;
}

export async function deleteSession(
  db: Database,
  token: string | undefined,
): Promise<void> {
  if (!token) return;
  await db.sql`DELETE FROM sessions WHERE token = ${token}`;
}

// ── helpers internos ──────────────────────────────────────────────────────────
async function findUserByEmail(
  db: Database,
  email: string,
): Promise<UserRow | undefined> {
  const { rows } = await db.sql`SELECT * FROM users WHERE email = ${email}`;
  return (rows as unknown as UserRow[])[0];
}

async function findUserById(db: Database, id: number): Promise<UserRow | undefined> {
  const { rows } = await db.sql`SELECT * FROM users WHERE id = ${id}`;
  return (rows as unknown as UserRow[])[0];
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
