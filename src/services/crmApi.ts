import { api } from "./api";

export interface Contact {
  id: number;
  company_id: number;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  status: string;
  tags: string;
  created_at: string;
}

export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  plan?: string;
  tags?: string;
  status?: string;
}

export const crmApi = {
  list: () => api.get<Contact[]>("/crm"),
  create: (input: ContactInput) => api.post<Contact>("/crm", input),
  update: (id: number, input: Partial<ContactInput>) =>
    api.patch<Contact>(`/crm/${id}`, input),
  remove: (id: number) => api.del<{ success: true }>(`/crm/${id}`),
  import: (contacts: ContactInput[]) =>
    api.post<{ created: number; skipped: number }>("/crm/import", { contacts }),
};
