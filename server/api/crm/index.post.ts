import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { useDatabase } from "nitro/database";
import { createCustomer } from "../../services/crm/customers";
import { requireCompany } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  const body = await readBody<Record<string, unknown>>(event);
  const customer = await createCustomer(useDatabase(), companyId, {
    name: body?.name,
    email: body?.email,
    phone: body?.phone,
    plan: body?.plan,
    tags: body?.tags,
  });
  setResponseStatus(event, 201);
  return customer;
});
