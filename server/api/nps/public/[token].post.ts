import { defineEventHandler, getRouterParam, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { submitPublicResponse } from "../../../services/nps/invites";

// Rota pública — recebe as respostas do NPS via token, sem autenticação.
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token") ?? "";
  const body = await readBody<{
    answers?: { question_id: number; score: number; comment?: string }[];
    score?: number;
    comment?: string;
  }>(event);
  return submitPublicResponse(useDatabase(), token, {
    answers: body?.answers,
    score: body?.score,
    comment: body?.comment,
  });
});
