import { defineEventHandler, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { importCustomers } from "../../services/crm/customers";
import { requireCompany } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  const body = await readBody<{ contacts?: unknown }>(event);
  return importCustomers(useDatabase(), companyId, body?.contacts);
});
