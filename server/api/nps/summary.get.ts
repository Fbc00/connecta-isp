import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { getNpsSummary } from "../../services/nps/nps";
import { requireCompany } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  return getNpsSummary(useDatabase(), companyId);
});
