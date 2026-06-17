// camada central de chamadas à API — nenhum fetch() fora daqui
const BASE_URL = "/api";

export interface Task {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }

  // 204 No Content não tem corpo
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const tasksApi = {
  list: () => request<Task[]>("/tasks"),

  create: (title: string) =>
    request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  update: (id: number, data: Partial<Pick<Task, "title" | "completed">>) =>
    request<Task>(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  remove: (id: number) => request<void>(`/tasks/${id}`, { method: "DELETE" }),
};
