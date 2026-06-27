import { defineEventHandler, getRouterParam, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { updateCustomer } from "../../services/crm/customers";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  // biome-ignore lint/suspicious/noExplicitAny: body dinâmico
  const body = (await readBody(event)) as any;
  return updateCustomer(useDatabase(), id, {
    name: body?.name,
    email: body?.email,
    phone: body?.phone,
    plan: body?.plan,
    status: body?.status,
  });
});
