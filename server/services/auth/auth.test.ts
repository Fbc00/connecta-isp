import { createDatabase } from "db0";
import nodeSqlite from "db0/connectors/node-sqlite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initSchema } from "../../database/db";
import {
  authenticate,
  createSession,
  deleteSession,
  getSessionUser,
  hashPassword,
  hasRole,
  register,
  verifyPassword,
} from "./auth";

const db = createDatabase(nodeSqlite({ name: ":memory:" }));

const base = {
  companyName: "Acme ISP",
  name: "Alice",
  email: "alice@acme.com",
  password: "supersecret",
};

beforeAll(() => initSchema(db));
afterAll(() => db.dispose());
beforeEach(async () => {
  await db.sql`DELETE FROM sessions`;
  await db.sql`DELETE FROM users`;
  await db.sql`DELETE FROM companies`;
});

describe("password hashing", () => {
  it("verifica senha correta e rejeita errada", () => {
    const stored = hashPassword("hunter2!!");
    expect(verifyPassword("hunter2!!", stored)).toBe(true);
    expect(verifyPassword("errada", stored)).toBe(false);
  });
});

describe("RBAC", () => {
  it("respeita a hierarquia de roles", () => {
    expect(hasRole("owner", "admin")).toBe(true);
    expect(hasRole("admin", "admin")).toBe(true);
    expect(hasRole("member", "admin")).toBe(false);
  });
});

describe("register", () => {
  it("cria empresa + usuário owner", async () => {
    const user = await register(db, base);
    expect(user.id).toBeGreaterThan(0);
    expect(user.company_id).toBeGreaterThan(0);
    expect(user.role).toBe("owner");
    expect(user.email).toBe("alice@acme.com");
    expect("password_hash" in user).toBe(false);
  });

  it("rejeita e-mail duplicado", async () => {
    await register(db, base);
    await expect(register(db, base)).rejects.toThrowError(/já cadastrado/i);
  });

  it("rejeita senha curta e e-mail inválido", async () => {
    await expect(register(db, { ...base, password: "123" })).rejects.toThrowError(
      /senha/i,
    );
    await expect(register(db, { ...base, email: "nope" })).rejects.toThrowError(
      /e-mail/i,
    );
  });
});

describe("authenticate", () => {
  it("autentica com credenciais válidas", async () => {
    const created = await register(db, base);
    const user = await authenticate(db, "alice@acme.com", "supersecret");
    expect(user.id).toBe(created.id);
  });

  it("rejeita senha errada", async () => {
    await register(db, base);
    await expect(authenticate(db, base.email, "errada")).rejects.toThrowError(
      /inválidos/i,
    );
  });

  it("rejeita usuário inexistente", async () => {
    await expect(authenticate(db, "ghost@x.com", "x")).rejects.toThrowError(/inválidos/i);
  });
});

describe("sessions", () => {
  it("cria, resolve e revoga sessão", async () => {
    const user = await register(db, base);
    const token = await createSession(db, user.id);

    const resolved = await getSessionUser(db, token);
    expect(resolved?.id).toBe(user.id);
    expect(resolved?.company_id).toBe(user.company_id);

    await deleteSession(db, token);
    expect(await getSessionUser(db, token)).toBeNull();
  });

  it("retorna null p/ token ausente ou inválido", async () => {
    expect(await getSessionUser(db, undefined)).toBeNull();
    expect(await getSessionUser(db, "lixo")).toBeNull();
  });
});
