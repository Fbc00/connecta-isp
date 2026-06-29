import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { getNpsSummary } from "../../services/nps/nps";
import { requireUser } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  return getNpsSummary(useDatabase(), user.company_id);
});
