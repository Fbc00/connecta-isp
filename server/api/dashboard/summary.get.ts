import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { getDashboardSummary } from "../../services/dashboard/dashboard";
import { requireCompany } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  return getDashboardSummary(useDatabase(), companyId);
});
