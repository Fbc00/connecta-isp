import type { Database } from "db0";
import { createError } from "h3";
import { createHash } from "node:crypto";

export interface User {
    id: number;
    name: string;
    email: string;
    created_at: string;
}

interface UserRow extends User {
    password_hash: string;
}

function hashPassword(password: string): string {
    return createHash("sha256").update(password).digest("hex");
}

const badRequest = (msg: string) =>
    createError({ statusCode: 400, message: msg });
const unauthorized = () =>
    createError({ statusCode: 401, message: "Credenciais inválidas" });

export async function register(
    db: Database,
    name: unknown,
    email: unknown,
    password: unknown,
): Promise<User> {
    if (typeof name !== "string" || name.trim() === "")
        throw badRequest("Nome é obrigatório");
    if (typeof email !== "string" || !email.includes("@"))
        throw badRequest("E-mail inválido");
    if (typeof password !== "string" || password.length < 6)
        throw badRequest("Senha deve ter no mínimo 6 caracteres");

    const password_hash = hashPassword(password);

    try {
        const { lastInsertRowid } = await db.sql`
      INSERT INTO users (name, email, password_hash)
      VALUES (${name.trim()}, ${email.trim().toLowerCase()}, ${password_hash})
    `;
        const { rows } = await db.sql`
      SELECT id, name, email, created_at FROM users WHERE id = ${Number(lastInsertRowid)}
    `;
        return (rows as User[])[0];
    } catch {
        throw createError({ statusCode: 409, message: "E-mail já cadastrado" });
    }
}

export async function login(
    db: Database,
    email: unknown,
    password: unknown,
): Promise<User> {
    if (typeof email !== "string" || typeof password !== "string")
        throw badRequest("E-mail e senha são obrigatórios");

    const { rows } = await db.sql`
    SELECT * FROM users WHERE email = ${email.trim().toLowerCase()}
  `;
    const user = (rows as UserRow[])[0];

    if (!user || user.password_hash !== hashPassword(password))
        throw unauthorized();

    const { password_hash: _, ...safeUser } = user;
    return safeUser;
}