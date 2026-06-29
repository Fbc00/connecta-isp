import { defineEventHandler, getRouterParam, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { updateCustomer } from "../../services/crm/customers";
import { requireUser } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody<Record<string, unknown>>(event);
  return updateCustomer(useDatabase(), user.company_id, id, {
    name: body?.name,
    email: body?.email,
    phone: body?.phone,
    plan: body?.plan,
    status: body?.status,
  });
});
