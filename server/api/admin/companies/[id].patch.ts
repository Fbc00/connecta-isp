import { defineEventHandler, getRouterParam, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { setCompanyStatus } from "../../../services/admin/companies";
import { logAudit } from "../../../services/audit/audit";
import { requireRole } from "../../../utils/session";

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, "super_admin");
  const db = useDatabase();
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody<{ status?: string }>(event);
  const company = await setCompanyStatus(db, id, body?.status);
  await logAudit(db, {
    userId: admin.id,
    companyId: id,
    action: "company.status",
    detail: `${company.name} -> ${company.status}`,
  });
  return company;
});
