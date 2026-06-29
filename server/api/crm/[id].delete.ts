import { defineEventHandler, getRouterParam } from "h3";
import { useDatabase } from "nitro/database";
import { deleteCustomer } from "../../services/crm/customers";
import { requireUser } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = Number(getRouterParam(event, "id"));
  await deleteCustomer(useDatabase(), user.company_id, id);
  return { success: true };
});
