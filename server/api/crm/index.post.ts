import { defineEventHandler, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { createCustomer } from "../../services/crm/customers";

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name?: string;
    email?: string;
    phone?: string;
    plan?: string;
  }>(event);
  return createCustomer(useDatabase(), body);
});
