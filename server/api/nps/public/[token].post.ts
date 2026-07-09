import { defineEventHandler, getRouterParam, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { submitPublicResponse } from "../../../services/nps/invites";

// Rota pública — recebe a resposta do NPS via token, sem autenticação.
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token") ?? "";
  const body = await readBody<{ score?: number; comment?: string }>(event);
  return submitPublicResponse(useDatabase(), token, {
    score: body?.score,
    comment: body?.comment,
  });
});
