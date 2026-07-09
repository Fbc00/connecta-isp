import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { listTemplates } from "../../services/messaging/templates";
import { requireCompany } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  return listTemplates(useDatabase(), companyId);
});
