import { defineEventHandler, getRouterParam } from "h3";
import { useDatabase } from "nitro/database";
import { deleteCustomer } from "../../services/crm/customers";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  await deleteCustomer(useDatabase(), id);
  return { success: true };
});
