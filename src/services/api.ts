const BASE_URL = "/api";

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Erro ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Helpers de verbo em cima de `request`, usados pelos serviços de cada domínio. */
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export type Role = "member" | "admin" | "owner" | "super_admin";

export interface User {
  id: number;
  company_id: number | null;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface RegisterInput {
  companyName: string;
  name: string;
  email: string;
  password: string;
}

export const authApi = {
  register: (input: RegisterInput) =>
    request<{ user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }).then((r) => r.user),

  login: (email: string, password: string) =>
    request<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }).then((r) => r.user),

  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),

  whoami: () => request<{ user: User }>("/auth/whoami").then((r) => r.user),
};
