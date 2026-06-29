import { defineEventHandler, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { createCustomer } from "../../services/crm/customers";
import { requireUser } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = await readBody<Record<string, unknown>>(event);
  return createCustomer(useDatabase(), user.company_id, {
    name: body?.name,
    email: body?.email,
    phone: body?.phone,
    plan: body?.plan,
  });
});
