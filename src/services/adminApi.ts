import { api } from "./api";

export interface Company {
  id: number;
  name: string;
  status: "active" | "inactive";
  created_at: string;
  users_count: number;
  contacts_count: number;
}

export interface CreateCompanyInput {
  name: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface PlatformAnalytics {
  companies: number;
  active_companies: number;
  users: number;
  contacts: number;
  messages: number;
  responses: number;
}

export interface AuditEntry {
  id: number;
  user_id: number | null;
  company_id: number | null;
  action: string;
  detail: string;
  created_at: string;
}

export const adminApi = {
  listCompanies: () => api.get<Company[]>("/admin/companies"),
  createCompany: (input: CreateCompanyInput) =>
    api.post<{ id: number; name: string; status: string }>("/admin/companies", input),
  setStatus: (id: number, status: "active" | "inactive") =>
    api.patch<Company>(`/admin/companies/${id}`, { status }),
  analytics: () => api.get<PlatformAnalytics>("/admin/analytics"),
  audit: () => api.get<AuditEntry[]>("/admin/audit"),
};
