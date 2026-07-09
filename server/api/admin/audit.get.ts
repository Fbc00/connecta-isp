import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { listAudit } from "../../services/audit/audit";
import { requireRole } from "../../utils/session";

export default defineEventHandler(async (event) => {
  await requireRole(event, "super_admin");
  return listAudit(useDatabase(), null, 50);
});
