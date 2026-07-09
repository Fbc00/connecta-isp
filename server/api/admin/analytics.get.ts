import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { getPlatformAnalytics } from "../../services/admin/analytics";
import { requireRole } from "../../utils/session";

export default defineEventHandler(async (event) => {
  await requireRole(event, "super_admin");
  return getPlatformAnalytics(useDatabase());
});
