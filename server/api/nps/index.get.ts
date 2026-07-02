import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { listResponses } from "../../services/nps/nps";
import { requireCompany } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  return listResponses(useDatabase(), companyId);
});
