import { defineEventHandler, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { createCustomer } from "../../services/crm/customers";

export default defineEventHandler(async (event) => {
  // biome-ignore lint/suspicious/noExplicitAny: body dinâmico
  const body = (await readBody(event)) as any;
  return createCustomer(useDatabase(), {
    name: body?.name,
    email: body?.email,
    phone: body?.phone,
    plan: body?.plan,
  });
});
