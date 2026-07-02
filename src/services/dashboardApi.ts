import { api } from "./api";

export interface DashboardSummary {
  contacts: number;
  messages_sent: number;
  surveys: number;
  nps: number;
}

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>("/dashboard/summary"),
};
