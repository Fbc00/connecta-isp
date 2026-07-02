import { defineEventHandler, getRouterParam } from "h3";
import { useDatabase } from "nitro/database";
import { deleteTemplate } from "../../services/messaging/templates";
import { requireCompany } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  const id = Number(getRouterParam(event, "id"));
  await deleteTemplate(useDatabase(), companyId, id);
  return { success: true };
});
