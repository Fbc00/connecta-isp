import { api } from "./api";

export type Channel = "email" | "sms";

export interface Template {
  id: number;
  company_id: number;
  channel: Channel;
  subject: string;
  body: string;
  created_at: string;
}

export interface TemplateInput {
  channel: Channel;
  subject: string;
  body: string;
}

export interface Message {
  id: number;
  customer_id: number;
  channel: string;
  status: string;
  provider_id: string | null;
  subject: string | null;
  body: string;
  sent_at: string | null;
  created_at: string;
}

export interface DispatchResult {
  sent: number;
  failed: number;
  total: number;
}

export const templatesApi = {
  list: () => api.get<Template[]>("/templates"),
  create: (input: TemplateInput) => api.post<Template>("/templates", input),
  update: (id: number, input: Partial<TemplateInput>) =>
    api.patch<Template>(`/templates/${id}`, input),
  remove: (id: number) => api.del<{ success: true }>(`/templates/${id}`),
};

export const messagesApi = {
  list: () => api.get<Message[]>("/messages"),
};

export const campaignsApi = {
  dispatch: (templateId: number, customerIds: number[]) =>
    api.post<DispatchResult>("/campaigns", { templateId, customerIds }),
};
