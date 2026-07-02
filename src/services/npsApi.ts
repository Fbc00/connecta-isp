import { api } from "./api";

export interface SurveyScore {
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  nps: number;
}

export interface Survey {
  id: number;
  company_id: number;
  title: string;
  question: string;
  status: string;
  created_at: string;
  score: SurveyScore;
}

export interface PublicInvite {
  token: string;
  status: string;
  survey: { title: string; question: string; status: string };
}

export interface DispatchResult {
  sent: number;
  failed: number;
  total: number;
}

export const npsApi = {
  listSurveys: () => api.get<Survey[]>("/nps/surveys"),
  createSurvey: (input: { title: string; question?: string }) =>
    api.post<Survey>("/nps/surveys", input),
  setStatus: (id: number, status: "active" | "closed") =>
    api.patch<Survey>(`/nps/surveys/${id}`, { status }),
  sendInvites: (surveyId: number, customerIds: number[], channel: "email" | "sms") =>
    api.post<DispatchResult>(`/nps/surveys/${surveyId}/invites`, {
      customerIds,
      channel,
    }),
};

export const npsPublicApi = {
  getInvite: (token: string) => api.get<PublicInvite>(`/nps/public/${token}`),
  respond: (token: string, score: number, comment: string) =>
    api.post<{ ok: true }>(`/nps/public/${token}`, { score, comment }),
};
