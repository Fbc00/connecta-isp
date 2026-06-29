import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { listResponses } from "../../services/nps/nps";
import { requireUser } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  return listResponses(useDatabase(), user.company_id);
});
