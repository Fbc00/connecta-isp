import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { listMessages } from "../../services/messaging/campaigns";
import { requireCompany } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  return listMessages(useDatabase(), companyId);
});
