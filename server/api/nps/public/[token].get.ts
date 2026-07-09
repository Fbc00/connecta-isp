import { defineEventHandler, getRouterParam } from "h3";
import { useDatabase } from "nitro/database";
import { getInviteByToken } from "../../../services/nps/invites";

// Rota pública — sem autenticação. Resolvida apenas pelo token único do convite.
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token") ?? "";
  return getInviteByToken(useDatabase(), token);
});
