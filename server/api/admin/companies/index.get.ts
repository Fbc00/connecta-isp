import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { listCompanies } from "../../../services/admin/companies";
import { requireRole } from "../../../utils/session";

export default defineEventHandler(async (event) => {
  await requireRole(event, "super_admin");
  return listCompanies(useDatabase());
});
