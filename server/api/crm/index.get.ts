import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { listCustomers } from "../../services/crm/customers";
import { requireCompany } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  return listCustomers(useDatabase(), companyId);
});
