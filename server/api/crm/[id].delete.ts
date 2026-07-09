import { defineEventHandler, getRouterParam } from "h3";
import { useDatabase } from "nitro/database";
import { deleteCustomer } from "../../services/crm/customers";
import { requireCompany } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  const id = Number(getRouterParam(event, "id"));
  await deleteCustomer(useDatabase(), companyId, id);
  return { success: true };
});
