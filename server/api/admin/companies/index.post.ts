import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { useDatabase } from "nitro/database";
import { createCompany } from "../../../services/admin/companies";
import { logAudit } from "../../../services/audit/audit";
import { requireRole } from "../../../utils/session";

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, "super_admin");
  const db = useDatabase();
  const body = await readBody<Record<string, unknown>>(event);
  const result = await createCompany(db, {
    name: body?.name,
    adminName: body?.adminName,
    adminEmail: body?.adminEmail,
    adminPassword: body?.adminPassword,
  });
  await logAudit(db, {
    userId: admin.id,
    companyId: result.company.id,
    action: "company.create",
    detail: `${result.company.name} (${result.adminEmail})`,
  });
  setResponseStatus(event, 201);
  return result.company;
});
