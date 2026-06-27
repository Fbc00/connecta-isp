import { defineEventHandler, getRouterParam, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { updateCustomer } from "../../services/crm/customers";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody<{
    name?: string;
    email?: string;
    phone?: string;
    plan?: string;
    status?: string;
  }>(event);
  return updateCustomer(useDatabase(), id, body);
});
